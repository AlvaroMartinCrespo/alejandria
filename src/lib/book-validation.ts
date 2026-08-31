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

function backupBook(value: unknown): Book {
  if (typeof value !== "object" || value === null) throw new Error("Libro no válido en la copia");
  const input = value as Record<string, unknown>;
  const title = text(input.title, 500);
  if (!title) throw new Error("Hay un libro sin título en la copia");

  const rawStatus = input.status === "favorite" ? "read" : input.status ?? "to_read";
  if (typeof rawStatus !== "string" || !STATUSES.has(rawStatus as BookStatus)) {
    throw new Error(`Estado no válido en ${title}`);
  }

  const coverUrl = text(input.coverUrl ?? input.cover_url, 2000) || null;
  if (coverUrl && !coverUrl.startsWith("https://")) {
    throw new Error(`URL de portada no válida en ${title}`);
  }

  const addedAtValue = text(input.addedAt ?? input.added_at, 100);
  const addedAt = addedAtValue && !Number.isNaN(Date.parse(addedAtValue))
    ? new Date(addedAtValue).toISOString()
    : new Date().toISOString();
  const pageCount = optionalInteger(input.pageCount ?? input.page_count, 0, 100000);
  const currentPage = optionalInteger(input.currentPage ?? input.current_page, 0, 100000);
  const legacyProgress = pageCount && currentPage
    ? Math.round(currentPage / pageCount * 100)
    : 0;

  return {
    $id: text(input.$id ?? input.id, 255) || crypto.randomUUID(),
    googleBooksId: text(input.googleBooksId ?? input.google_books_id, 120),
    title,
    authors: authors(input.authors),
    coverUrl,
    publishedYear: optionalInteger(input.publishedYear ?? input.published_year, 0, 3000),
    pageCount,
    synopsis: text(input.synopsis, 20000),
    status: rawStatus as BookStatus,
    favorite: input.status === "favorite" || input.favorite === true,
    order: optionalInteger(input.order ?? input.sort_order),
    rating: optionalInteger(input.rating, 0, 5),
    finishedYear: optionalInteger(input.finishedYear ?? input.finished_year, 1900, 2100),
    addedAt,
    progress: optionalInteger(input.progress, 0, 100) ?? legacyProgress,
    notes: text(input.notes, 50000),
  };
}

export function parseBookBackup(value: unknown): Book[] {
  const candidate = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null
      ? (value as Record<string, unknown>).books
      : null;
  if (!Array.isArray(candidate)) {
    throw new Error("El archivo no contiene una biblioteca válida.");
  }

  const unique = new Map<string, Book>();
  for (const item of candidate) {
    const book = backupBook(item);
    unique.set(book.googleBooksId || book.$id, book);
  }
  if (!unique.size) throw new Error("No se encontraron libros en el archivo.");
  return Array.from(unique.values());
}