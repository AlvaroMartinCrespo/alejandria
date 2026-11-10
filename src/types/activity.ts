/** Qué ocurrió con un libro en un día concreto. */
export type ReadingEvent = "started" | "progress" | "finished" | "status";

export const READING_EVENTS: readonly ReadingEvent[] = ["started", "progress", "finished", "status"];

/** Actividad de un libro en un día (una fila por libro y día). */
export interface ReadingLogEntry {
  $id: string;
  bookId: string;
  /** Día local en formato YYYY-MM-DD. */
  day: string;
  events: ReadingEvent[];
  /** Progreso antes del primer cambio del día. */
  progressFrom: number | null;
  /** Progreso más reciente del día. */
  progressTo: number | null;
}

/** Entrada que se fusiona con la fila del día (un solo evento). */
export interface ReadingLogIncoming {
  bookId: string;
  day: string;
  events: ReadingEvent[];
  progressFrom: number | null;
  progressTo: number | null;
}
