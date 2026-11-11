/**
 * Núcleo de la copia de seguridad por correo: decide si toca enviar, genera el JSON, lo envía y deja registro.
 * Sin Supabase ni Resend a la vista: todo entra por `BackupDeps`, de modo que se prueba sin red
 * (el cableado real está en `backup-service.ts`).
 */
import { buildLibraryBackup } from "@/lib/backup";
import { MAX_ATTACHMENTS_BYTES, type SendEmailInput } from "@/lib/email";
import type { BackupLogInput, LastBackup } from "@/lib/supabase";
import type { ReadingLogEntry } from "@/types/activity";
import type { Anime } from "@/types/anime";
import type { Book, Collection } from "@/types/book";

export const DEFAULT_EVERY_DAYS = 14;
export const DEFAULT_TIMEZONE = "Europe/Madrid";

export type BackupTrigger = "cron" | "manual";

export interface BackupSourceData {
  books: Book[];
  collections: Collection[];
  anime: Anime[];
  activity: ReadingLogEntry[];
  marks: string[];
  /** Apartados que no se pudieron cargar (`activity`, `marks`). */
  omitted: string[];
}

export interface BackupConfig {
  to: string;
  from: string;
  apiKey: string;
  everyDays: number;
  timeZone: string;
}

export interface BackupDeps {
  now: () => Date;
  /** Variables de configuración que faltan (vacío si todo está). */
  missingConfig: string[];
  config: BackupConfig;
  getLastSuccess: () => Promise<LastBackup | null>;
  loadSource: () => Promise<BackupSourceData>;
  sendEmail: (input: SendEmailInput) => Promise<{ id: string }>;
  log: (entry: BackupLogInput) => Promise<void>;
}

export type BackupOutcome =
  | { status: "skipped"; lastBackupAt: string; nextDueDate: string }
  | { status: "sent"; sentAt: string; bookCount: number; animeCount: number; jsonBytes: number; filename: string; omitted: string[]; logged: boolean }
  | { status: "error"; stage: "config" | "log-table" | "build" | "send"; error: string };

/* ===== Fechas (calendario de la zona horaria configurada) ===== */

/** «YYYY-MM-DD» de `date` en `timeZone`. */
export function localDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const DAY_MS = 86_400_000;
const dayNumber = (isoDay: string) => Math.round(Date.parse(`${isoDay}T00:00:00Z`) / DAY_MS);

export function addDaysToDate(isoDay: string, days: number): string {
  return new Date((dayNumber(isoDay) + days) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * ¿Toca enviar? Compara *días naturales* en la zona configurada, no horas transcurridas: si el último envío
 * fue a las 07:00:05 y el cron de hoy corre a las 07:00:02, siguen contando 14 días y no se retrasa un día más.
 */
export function isBackupDue(lastSentAt: string | null, now: Date, everyDays: number, timeZone: string): boolean {
  if (!lastSentAt) return true;
  const elapsed = dayNumber(localDate(now, timeZone)) - dayNumber(localDate(new Date(lastSentAt), timeZone));
  return elapsed >= everyDays;
}

/* ===== Estado (lo que muestra Estadísticas) ===== */

export interface BackupStatus {
  /** ¿Están RESEND_API_KEY, BACKUP_EMAIL_TO y BACKUP_EMAIL_FROM? (solo un booleano, nunca los valores) */
  configured: boolean;
  everyDays: number;
  lastBackup: LastBackup | null;
  /** Día natural (YYYY-MM-DD, zona configurada) en que el cron enviará la siguiente. `null` si nunca se ha enviado: tocará en la próxima ejecución. */
  nextDueDate: string | null;
}

export function buildBackupStatus(last: LastBackup | null, config: BackupConfig, missingConfig: string[]): BackupStatus {
  return {
    configured: missingConfig.length === 0,
    everyDays: config.everyDays,
    lastBackup: last,
    nextDueDate: last ? addDaysToDate(localDate(new Date(last.sentAt), config.timeZone), config.everyDays) : null,
  };
}

/* ===== Texto del correo ===== */

function megabytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const OMITTED_LABELS: Record<string, string> = { activity: "el historial de lectura", marks: "los días marcados" };

export function buildEmailText(data: BackupSourceData, filename: string, jsonBytes: number, day: string): string {
  const lines = [
    `Copia de seguridad de Alejandría · ${day}`,
    "",
    `Libros: ${data.books.length}`,
    `Carpetas: ${data.collections.length}`,
    `Anime: ${data.anime.length}`,
    `Historial de lectura: ${data.activity.length} entradas`,
    `Días marcados: ${data.marks.length}`,
    "",
    `Adjunto: ${filename} (${megabytes(jsonBytes)})`,
  ];
  if (data.omitted.length) {
    const names = data.omitted.map((part) => OMITTED_LABELS[part] ?? part).join(" y ");
    lines.push("", `AVISO: copia incompleta. No se pudo cargar ${names}.`);
  }
  lines.push(
    "",
    "El archivo contiene tus notas personales y el correo no va cifrado: guárdalo en un lugar privado.",
    "Se restaura desde Estadísticas → Importar copia.",
  );
  return lines.join("\n");
}

/* ===== Ejecución ===== */

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/**
 * Ejecuta una copia. `force` salta la comprobación de los N días (envío manual).
 * Si falla, no se registra ningún éxito: el siguiente cron diario vuelve a intentarlo.
 */
export async function runBackup(deps: BackupDeps, options: { trigger: BackupTrigger; force?: boolean }): Promise<BackupOutcome> {
  const { trigger, force = false } = options;
  const { config } = deps;

  // Registrar un fallo no debe ocultar el fallo original.
  const logError = async (message: string, counts?: { books: number; anime: number }, jsonBytes: number | null = null) => {
    try {
      await deps.log({ status: "error", trigger, bookCount: counts?.books ?? 0, animeCount: counts?.anime ?? 0, jsonBytes, errorMessage: message });
    } catch {
      /* la tabla puede no existir; el error ya se devuelve al llamador */
    }
  };

  if (deps.missingConfig.length) {
    const message = `Falta configuración: ${deps.missingConfig.join(", ")}.`;
    await logError(message);
    return { status: "error", stage: "config", error: message };
  }

  // Sin acceso a backup_log no se envía nada: sin registro, el cron reenviaría la copia cada día.
  let last: LastBackup | null;
  try {
    last = await deps.getLastSuccess();
  } catch (error) {
    return {
      status: "error",
      stage: "log-table",
      error: `No se pudo consultar backup_log (¿falta aplicar supabase/migration-backup-log.sql?): ${errorText(error, "error desconocido")}`,
    };
  }

  const now = deps.now();
  if (!force && !isBackupDue(last?.sentAt ?? null, now, config.everyDays, config.timeZone)) {
    const lastDay = localDate(new Date(last!.sentAt), config.timeZone);
    return { status: "skipped", lastBackupAt: last!.sentAt, nextDueDate: addDaysToDate(lastDay, config.everyDays) };
  }

  let data: BackupSourceData;
  let json: Buffer;
  try {
    data = await deps.loadSource();
    json = Buffer.from(JSON.stringify(buildLibraryBackup(data), null, 2), "utf8");
  } catch (error) {
    const message = `No se pudo generar la copia: ${errorText(error, "error desconocido")}`;
    await logError(message);
    return { status: "error", stage: "build", error: message };
  }

  const counts = { books: data.books.length, anime: data.anime.length };
  const day = localDate(now, config.timeZone);
  const filename = `alejandria-backup-${day}.json`;

  if (json.length > MAX_ATTACHMENTS_BYTES) {
    const message = `La copia pesa ${megabytes(json.length)} y supera el límite de adjuntos del correo.`;
    await logError(message, counts, json.length);
    return { status: "error", stage: "send", error: message };
  }

  try {
    await deps.sendEmail({
      to: config.to,
      from: config.from,
      apiKey: config.apiKey,
      subject: `Alejandría · copia de seguridad ${day}`,
      text: buildEmailText(data, filename, json.length, day),
      attachments: [{ filename, content: json }],
    });
  } catch (error) {
    const message = errorText(error, "No se pudo enviar el correo.");
    await logError(message, counts, json.length);
    return { status: "error", stage: "send", error: message };
  }

  let logged = true;
  try {
    await deps.log({ status: "success", trigger, bookCount: counts.books, animeCount: counts.anime, jsonBytes: json.length, errorMessage: null });
  } catch {
    // El correo ya salió; se avisa en la respuesta en lugar de fingir un fallo.
    logged = false;
  }

  return { status: "sent", sentAt: now.toISOString(), bookCount: counts.books, animeCount: counts.anime, jsonBytes: json.length, filename, omitted: data.omitted, logged };
}
