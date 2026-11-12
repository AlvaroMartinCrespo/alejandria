import type { ReadingEvent, ReadingLogEntry, ReadingLogIncoming } from "@/types/activity";
import type { Book } from "@/types/book";

/** Pon `true` para que editar notas, valoración o favorito también cuente como actividad. */
export const COUNT_METADATA_AS_ACTIVITY = false;

export const DEFAULT_TIMEZONE = "Europe/Madrid";

/** Día actual (YYYY-MM-DD) en la zona horaria indicada. */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

type BookActivityChanges = Partial<Pick<Book, "status" | "progress" | "favorite" | "rating" | "notes">>;

/**
 * Decide si un cambio en un libro cuenta como lectura.
 * Devuelve `null` cuando no (p. ej. solo cambió `favorite`).
 */
export function describeChange(
  previous: Pick<Book, "status" | "progress">,
  changes: BookActivityChanges,
): { events: ReadingEvent[]; from: number; to: number } | null {
  const events: ReadingEvent[] = [];
  const from = previous.progress;
  const to = changes.progress ?? previous.progress;

  if (changes.progress !== undefined && changes.progress !== previous.progress) events.push("progress");
  if (changes.status !== undefined && changes.status !== previous.status) {
    events.push("status");
    if (changes.status === "reading") events.push("started");
    if (changes.status === "read") events.push("finished");
  }
  if (
    !events.length
    && COUNT_METADATA_AS_ACTIVITY
    && (changes.favorite !== undefined || changes.rating !== undefined || changes.notes !== undefined)
  ) {
    events.push("status");
  }
  return events.length ? { events, from, to } : null;
}

function unionEvents(a: ReadingEvent[], b: ReadingEvent[]): ReadingEvent[] {
  return Array.from(new Set([...a, ...b])).sort() as ReadingEvent[];
}

/** Misma regla que `log_reading_activity` en SQL: conserva el primer `from`, actualiza `to`, une eventos. */
export function mergeEntry(
  existing: ReadingLogEntry | undefined,
  incoming: ReadingLogIncoming,
  newId: () => string = () => crypto.randomUUID(),
): ReadingLogEntry {
  if (!existing) {
    return {
      $id: newId(),
      bookId: incoming.bookId,
      day: incoming.day,
      events: unionEvents([], incoming.events),
      progressFrom: incoming.progressFrom,
      progressTo: incoming.progressTo,
    };
  }
  return {
    ...existing,
    events: unionEvents(existing.events, incoming.events),
    progressFrom: existing.progressFrom ?? incoming.progressFrom,
    progressTo: incoming.progressTo ?? existing.progressTo,
  };
}

/** Aplica un cambio a la lista de entradas (modo local y actualización optimista). */
export function applyIncoming(entries: ReadingLogEntry[], incoming: ReadingLogIncoming): ReadingLogEntry[] {
  const index = entries.findIndex((entry) => entry.bookId === incoming.bookId && entry.day === incoming.day);
  if (index < 0) return [...entries, mergeEntry(undefined, incoming)];
  return entries.map((entry, position) => (position === index ? mergeEntry(entry, incoming) : entry));
}

/** Avance neto del día (puede ser 0 o negativo si se corrigió a la baja). */
export function progressDelta(entry: Pick<ReadingLogEntry, "progressFrom" | "progressTo">): number {
  if (entry.progressFrom === null || entry.progressTo === null) return 0;
  return entry.progressTo - entry.progressFrom;
}

/**
 * Páginas leídas ese día en un libro: avance neto (en %) × páginas del libro, redondeado.
 * Devuelve 0 si el libro no tiene páginas registradas o si el progreso se corrigió a la baja.
 */
export function pagesReadOf(
  entry: Pick<ReadingLogEntry, "progressFrom" | "progressTo">,
  pageCount: number | null | undefined,
): number {
  if (!pageCount || pageCount <= 0) return 0;
  const delta = progressDelta(entry);
  return delta > 0 ? Math.round((delta / 100) * pageCount) : 0;
}

export function groupByDay(entries: ReadingLogEntry[]): Map<string, ReadingLogEntry[]> {
  const map = new Map<string, ReadingLogEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.day);
    if (list) list.push(entry);
    else map.set(entry.day, [entry]);
  }
  return map;
}

/** Último día (YYYY-MM-DD) en que cada libro se marcó como terminado. Los libros sin ese registro no aparecen. */
export function lastFinishedDays(entries: ReadingLogEntry[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.events.includes("finished")) continue;
    const current = result.get(entry.bookId);
    if (!current || entry.day > current) result.set(entry.bookId, entry.day);
  }
  return result;
}

/**
 * Orden «más recientes» del archivo: primero los libros con día de fin conocido (el más reciente arriba)
 * y después los que no tienen fecha, en su orden de siempre (los últimos añadidos primero).
 */
export function compareRecentlyRead(
  a: Pick<Book, "$id" | "addedAt">,
  b: Pick<Book, "$id" | "addedAt">,
  finishedDays: Map<string, string>,
): number {
  const dayA = finishedDays.get(a.$id);
  const dayB = finishedDays.get(b.$id);
  if (dayA && dayB) return dayA === dayB ? new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime() : dayB.localeCompare(dayA);
  if (dayA) return -1;
  if (dayB) return 1;
  return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
}

/* ---------- Fechas YYYY-MM-DD (aritmética en UTC, sin zonas horarias) ---------- */

export function parseDay(day: string): { year: number; month: number; date: number } {
  const [year, month, date] = day.split("-").map(Number);
  return { year, month, date };
}

export function formatDay(year: number, month: number, date: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

export function addDays(day: string, amount: number): string {
  const { year, month, date } = parseDay(day);
  const result = new Date(Date.UTC(year, month - 1, date + amount));
  return formatDay(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = lunes … 6 = domingo. */
export function weekdayMonday(day: string): number {
  const { year, month, date } = parseDay(day);
  return (new Date(Date.UTC(year, month - 1, date)).getUTCDay() + 6) % 7;
}

/**
 * Racha actual y máxima de días consecutivos con lectura.
 * La racha actual sigue viva si el último día con actividad es hoy o ayer.
 */
export function streaks(days: string[], today: string): { current: number; longest: number } {
  const unique = Array.from(new Set(days)).sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of unique) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  let current = 0;
  if (previous && (previous === today || previous === addDays(today, -1))) current = run;
  return { current, longest };
}
