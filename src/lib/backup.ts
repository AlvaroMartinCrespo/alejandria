import type { Anime } from "@/types/anime";
import type { Book, Collection, LibraryBackup } from "@/types/book";

/** Versión actual del formato. Las copias v1/v2 (solo libros) siguen siendo importables. */
export const BACKUP_VERSION = 3;

interface BackupSource {
  books: Book[];
  collections: Collection[];
  anime: Anime[];
}

/**
 * Copia completa de todos los datos persistentes: libros, carpetas (relación
 * `collectionId` de cada libro) y animes con todos sus campos, orden incluido.
 * Misma estructura que lee `parseBookBackup` / `parseAnimeBackup`.
 */
export function buildLibraryBackup({ books, collections, anime }: BackupSource): LibraryBackup {
  return {
    format: "alejandria-library-backup",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    bookCount: books.length,
    collectionCount: collections.length,
    animeCount: anime.length,
    books,
    collections,
    anime,
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
