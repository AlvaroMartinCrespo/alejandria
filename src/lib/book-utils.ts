import type { Book, BookStatus, GoogleBookResult } from "@/types/book";

export const STATUS_LABELS: Record<BookStatus, string> = {
  to_read: "Quiero leer",
  reading: "Leyendo",
  read: "Leído",
  favorite: "Favorito",
};

export function normalizeBook(value: Partial<Book> & { $id: string; title: string }): Book {
  return {
    $id: value.$id,
    googleBooksId: value.googleBooksId ?? "",
    title: value.title,
    authors: value.authors ?? [],
    coverUrl: value.coverUrl ?? null,
    publishedYear: value.publishedYear ?? null,
    pageCount: value.pageCount ?? null,
    synopsis: value.synopsis ?? "",
    status: value.status ?? "to_read",
    order: value.order ?? null,
    rating: value.rating ?? null,
    finishedYear: value.finishedYear ?? null,
    addedAt: value.addedAt ?? new Date().toISOString(),
    currentPage: value.currentPage ?? 0,
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