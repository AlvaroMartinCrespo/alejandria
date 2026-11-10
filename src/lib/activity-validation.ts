import { READING_EVENTS, type ReadingEvent, type ReadingLogEntry } from "@/types/activity";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: unknown): string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) throw new Error("Fecha no válida en el historial de lectura");
  const [year, month, date] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, date));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== date) {
    throw new Error("Fecha no válida en el historial de lectura");
  }
  return value;
}

function validProgress(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 100) {
    throw new Error("Progreso no válido en el historial de lectura");
  }
  return Number(value);
}

/**
 * Lee el historial de una copia (`{ activity: [...] }`) o una lista suelta.
 * Las copias v1-v3 no traen `activity`: devuelven `[]`.
 */
export function parseActivityBackup(value: unknown): ReadingLogEntry[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null
      ? (value as Record<string, unknown>).activity
      : undefined;
  if (source === undefined || source === null) return [];
  if (!Array.isArray(source)) throw new Error("El historial de lectura de la copia no es válido.");

  const unique = new Map<string, ReadingLogEntry>();
  for (const item of source) {
    if (typeof item !== "object" || item === null) throw new Error("Entrada no válida en el historial de lectura");
    const input = item as Record<string, unknown>;
    const bookId = input.bookId ?? input.book_id;
    if (typeof bookId !== "string" || !bookId.trim() || bookId.length > 255) {
      throw new Error("Libro no válido en el historial de lectura");
    }
    const day = validDay(input.day);
    if (!Array.isArray(input.events)) throw new Error("Eventos no válidos en el historial de lectura");
    const events = Array.from(new Set(input.events.map((event) => {
      if (!READING_EVENTS.includes(event as ReadingEvent)) throw new Error("Evento no válido en el historial de lectura");
      return event as ReadingEvent;
    })));
    const id = input.$id ?? input.id;
    unique.set(`${bookId}|${day}`, {
      $id: typeof id === "string" && id ? id.slice(0, 255) : crypto.randomUUID(),
      bookId,
      day,
      events,
      progressFrom: validProgress(input.progressFrom ?? input.progress_from),
      progressTo: validProgress(input.progressTo ?? input.progress_to),
    });
  }
  return Array.from(unique.values());
}

/** Días marcados a mano de una copia (`{ marks: ["YYYY-MM-DD", …] }`). Las copias antiguas devuelven `[]`. */
export function parseMarksBackup(value: unknown): string[] {
  const source = typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>).marks
    : undefined;
  if (source === undefined || source === null) return [];
  if (!Array.isArray(source)) throw new Error("Los días marcados de la copia no son válidos.");
  return Array.from(new Set(source.map(validDay))).sort();
}
