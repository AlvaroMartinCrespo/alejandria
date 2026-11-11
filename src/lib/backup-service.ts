import "server-only";

import {
  buildBackupStatus,
  DEFAULT_EVERY_DAYS,
  DEFAULT_TIMEZONE,
  runBackup,
  type BackupConfig,
  type BackupDeps,
  type BackupOutcome,
  type BackupStatus,
  type BackupSourceData,
  type BackupTrigger,
} from "@/lib/backup-run";
import { sendBackupEmail } from "@/lib/email";
import {
  getLastSuccessfulBackup,
  insertBackupLog,
  listAnime,
  listBooks,
  listCollections,
  listReadingLog,
  listReadingMarks,
} from "@/lib/supabase";

function validTimeZone(value: string | undefined) {
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function readEveryDays(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365 ? parsed : DEFAULT_EVERY_DAYS;
}

/** Lee la configuración del entorno y lista lo que falta (sin mostrar nunca los valores). */
export function readBackupConfig(env: NodeJS.ProcessEnv = process.env): { config: BackupConfig; missing: string[] } {
  const config: BackupConfig = {
    to: env.BACKUP_EMAIL_TO?.trim() ?? "",
    from: env.BACKUP_EMAIL_FROM?.trim() ?? "",
    apiKey: env.RESEND_API_KEY?.trim() ?? "",
    everyDays: readEveryDays(env.BACKUP_EVERY_DAYS),
    timeZone: validTimeZone(env.ALEJANDRIA_TIMEZONE?.trim()),
  };
  const missing = [
    ["RESEND_API_KEY", config.apiKey],
    ["BACKUP_EMAIL_TO", config.to],
    ["BACKUP_EMAIL_FROM", config.from],
  ].filter(([, value]) => !value).map(([name]) => name);
  return { config, missing };
}

/** Misma carga que la copia manual de Estadísticas: libros, carpetas y anime son imprescindibles; el resto se marca como omitido. */
async function loadSource(): Promise<BackupSourceData> {
  const [books, collections, anime] = await Promise.all([listBooks(), listCollections(), listAnime()]);
  const omitted: string[] = [];
  const activity = await listReadingLog().catch(() => {
    omitted.push("activity");
    return [];
  });
  const marks = await listReadingMarks().catch(() => {
    omitted.push("marks");
    return [] as string[];
  });
  return { books, collections, anime, activity, marks, omitted };
}

export function runLibraryBackup(options: { trigger: BackupTrigger; force?: boolean }): Promise<BackupOutcome> {
  const { config, missing } = readBackupConfig();
  const deps: BackupDeps = {
    now: () => new Date(),
    missingConfig: missing,
    config,
    getLastSuccess: getLastSuccessfulBackup,
    loadSource,
    sendEmail: sendBackupEmail,
    log: insertBackupLog,
  };
  return runBackup(deps, options);
}

/** Estado para Estadísticas. Lanza si no se puede leer `backup_log` (¿falta la migración?). */
export async function getLibraryBackupStatus(): Promise<BackupStatus> {
  const { config, missing } = readBackupConfig();
  return buildBackupStatus(await getLastSuccessfulBackup(), config, missing);
}
