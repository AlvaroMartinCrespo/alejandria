import type { Book, BookStatus, GoogleBookResult } from "@/types/book";

const STATUSES = new Set<BookStatus>(["to_read", "reading", "read"]);

function optionalInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error("Valor numérico no válido");
  }
  return Number(value);
}

function text(value: unknown, maximum: number, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new Error("Texto no válido");
  return value.trim().slice(0, maximum);
}

function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new Error("Valor booleano no válido");
  return value;
}

function authors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((author): author is string => typeof author === "string")
    .map((author) => author.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 20);
}

export function parseGoogleBook(value: unknown): GoogleBookResult {
  if (typeof value !== "object" || value === null) throw new Error("Libro no válido");
  const input = value as Record<string, unknown>;
  const googleBooksId = text(input.googleBooksId, 120);
  const title = text(input.title, 500);
  if (!googleBooksId || !title) throw new Error("Faltan el ID o el título");
  const coverUrl = text(input.coverUrl, 2000) || null;
  if (coverUrl && !coverUrl.startsWith("https://")) throw new Error("URL de portada no válida");

  return {
    googleBooksId,
    title,
    authors: authors(input.authors),
    coverUrl,
    publishedYear: optionalInteger(input.publishedYear, 0, 3000),
    pageCount: optionalInteger(input.pageCount, 0, 100000),
    synopsis: text(input.synopsis, 20000),
  };
}

export function parseBookChanges(value: unknown): Partial<Omit<Book, "$id" | "googleBooksId" | "addedAt">> {
  if (typeof value !== "object" || value === null) throw new Error("Cambios no válidos");
  const input = value as Record<string, unknown>;
  const changes: Partial<Omit<Book, "$id" | "googleBooksId" | "addedAt">> = {};

  if ("title" in input) {
    const title = text(input.title, 500);
    if (!title) throw new Error("El título no puede estar vacío");
    changes.title = title;
  }
  if ("authors" in input) changes.authors = authors(input.authors);
  if ("coverUrl" in input) {
    const coverUrl = text(input.coverUrl, 2000) || null;
    if (coverUrl && !coverUrl.startsWith("https://")) throw new Error("URL de portada no válida");
    changes.coverUrl = coverUrl;
  }
  if ("publishedYear" in input) changes.publishedYear = optionalInteger(input.publishedYear, 0, 3000);
  if ("pageCount" in input) changes.pageCount = optionalInteger(input.pageCount, 0, 100000);
  if ("synopsis" in input) changes.synopsis = text(input.synopsis, 20000);
  if ("status" in input) {
    if (typeof input.status !== "string" || !STATUSES.has(input.status as BookStatus)) {
      throw new Error("Estado no válido");
    }
    changes.status = input.status as BookStatus;
  }
  if ("favorite" in input) changes.favorite = boolean(input.favorite);
  if ("order" in input) changes.order = optionalInteger(input.order);
  if ("rating" in input) changes.rating = optionalInteger(input.rating, 0, 5);
  if ("finishedYear" in input) changes.finishedYear = optionalInteger(input.finishedYear, 1900, 2100);
  if ("progress" in input) changes.progress = optionalInteger(input.progress, 0, 100) ?? 0;
  if ("notes" in input) changes.notes = text(input.notes, 50000);

  return changes;
}