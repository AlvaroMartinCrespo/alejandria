import type { ReadingLogEntry } from "@/types/activity";
import type { Anime } from "@/types/anime";
import type { Book, Collection, LibraryBackup } from "@/types/book";

/**
 * Versión actual del formato.
 * v5 añade `app`, `markCount`, `omitted`, `anime[].finishedMonth` y las marcas de tiempo
 * (`createdAt` / `updatedAt`) de libros, carpetas, animes e historial.
 * Las copias v1-v4 siguen siendo importables.
 */
export const BACKUP_VERSION = 5;

interface BackupSource {
  books: Book[];
  collections: Collection[];
  anime: Anime[];
  activity: ReadingLogEntry[];
  marks: string[];
  /** Apartados que no se pudieron cargar (la copia queda incompleta en ellos). */
  omitted?: string[];
}

/**
 * Copia completa de todos los datos persistentes: libros, carpetas (relación
 * `collectionId` de cada libro), historial de lectura y animes con todos sus campos, orden incluido.
 * Misma estructura que lee `parseBookBackup` / `parseAnimeBackup`.
 */
export function buildLibraryBackup({ books, collections, anime, activity, marks, omitted = [] }: BackupSource): LibraryBackup {
  return {
    format: "alejandria-library-backup",
    version: BACKUP_VERSION,
    app: "alejandria",
    exportedAt: new Date().toISOString(),
    bookCount: books.length,
    collectionCount: collections.length,
    animeCount: anime.length,
    activityCount: activity.length,
    markCount: marks.length,
    // Solo aparece si algo falló: así una copia completa no arrastra el campo.
    ...(omitted.length ? { omitted } : {}),
    books,
    collections,
    anime,
    activity,
    marks,
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
