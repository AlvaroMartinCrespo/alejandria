import type { Book, BookStatus, GoogleBookResult } from "@/types/book";

export const STATUS_LABELS: Record<BookStatus, string> = {
  to_read: "Quiero leer",
  reading: "Leyendo",
  read: "Leído",
};

type BookInput = Omit<Partial<Book>, "status"> & {
  $id: string;
  title: string;
  status?: BookStatus | "favorite";
  currentPage?: number | null;
};

export function normalizeBook(value: BookInput): Book {
  const legacyFavorite = value.status === "favorite";
  const status: BookStatus = value.status === "favorite" ? "read" : value.status ?? "to_read";
  const legacyProgress = value.pageCount && value.currentPage
    ? Math.round(value.currentPage / value.pageCount * 100)
    : 0;

  return {
    $id: value.$id,
    googleBooksId: value.googleBooksId ?? "",
    title: value.title,
    authors: value.authors ?? [],
    coverUrl: value.coverUrl ?? null,
    publishedYear: value.publishedYear ?? null,
    pageCount: value.pageCount ?? null,
    synopsis: value.synopsis ?? "",
    status,
    favorite: legacyFavorite || value.favorite === true,
    order: value.order ?? null,
    rating: value.rating ?? null,
    finishedYear: value.finishedYear ?? null,
    addedAt: value.addedAt ?? new Date().toISOString(),
    progress: Math.max(0, Math.min(100, value.progress ?? legacyProgress)),
    notes: value.notes ?? "",
  };
}

export function googleResultToBook(result: GoogleBookResult, id: string): Book {
  return normalizeBook({
    ...result,
    $id: id,
    status: "to_read",
    order: Date.now(),
    rating: null,
    finishedYear: null,
    addedAt: new Date().toISOString(),
  });
}

export function coverFallback(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}