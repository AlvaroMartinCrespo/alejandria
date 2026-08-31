import "server-only";

import type { Book, GoogleBookResult } from "@/types/book";

const BOOK_COLUMNS = [
  "id",
  "google_books_id",
  "title",
  "authors",
  "cover_url",
  "published_year",
  "page_count",
  "synopsis",
  "status",
  "favorite",
  "sort_order",
  "rating",
  "finished_year",
  "added_at",
  "progress",
  "notes",
].join(",");

type BookRow = {
  id: string;
  google_books_id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  published_year: number | null;
  page_count: number | null;
  synopsis: string;
  status: Book["status"];
  favorite: boolean;
  sort_order: number | null;
  rating: number | null;
  finished_year: number | null;
  added_at: string;
  progress: number;
  notes: string;
};

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Revisa .env.local.",
    );
  }

  return { url, serviceRoleKey };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceRoleKey } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(details?.message ?? `Supabase respondió con ${response.status}`);
  }

  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

function fromRow(row: BookRow): Book {
  return {
    $id: row.id,
    googleBooksId: row.google_books_id,
    title: row.title,
    authors: row.authors,
    coverUrl: row.cover_url,
    publishedYear: row.published_year,
    pageCount: row.page_count,
    synopsis: row.synopsis,
    status: row.status,
    favorite: row.favorite,
    order: row.sort_order,
    rating: row.rating,
    finishedYear: row.finished_year,
    addedAt: row.added_at,
    progress: row.progress,
    notes: row.notes,
  };
}

export function toRow(book: Book): BookRow {
  return {
    id: book.$id,
    google_books_id: book.googleBooksId,
    title: book.title,
    authors: book.authors,
    cover_url: book.coverUrl,
    published_year: book.publishedYear,
    page_count: book.pageCount,
    synopsis: book.synopsis,
    status: book.status,
    favorite: book.favorite,
    sort_order: book.order,
    rating: book.rating,
    finished_year: book.finishedYear,
    added_at: book.addedAt,
    progress: book.progress,
    notes: book.notes ?? "",
  };
}

export async function listBooks() {
  const pageSize = 1000;
  const books: Book[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const rows = await request<BookRow[]>(
      `books?select=${BOOK_COLUMNS}&order=added_at.asc&offset=${offset}&limit=${pageSize}`,
    );
    books.push(...rows.map(fromRow));
    if (rows.length < pageSize) return books;
  }
}

export async function createBook(result: GoogleBookResult) {
  const book: Book = {
    $id: crypto.randomUUID(),
    ...result,
    status: "to_read",
    favorite: false,
    order: Date.now(),
    rating: null,
    finishedYear: null,
    addedAt: new Date().toISOString(),
    progress: 0,
    notes: "",
  };
  const rows = await request<BookRow[]>(`books?select=${BOOK_COLUMNS}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(toRow(book)),
  });
  return fromRow(rows[0]);
}

export async function updateBook(
  id: string,
  changes: Partial<Omit<Book, "$id" | "googleBooksId" | "addedAt">>,
) {
  const fieldNames: Record<string, keyof BookRow> = {
    title: "title",
    authors: "authors",
    coverUrl: "cover_url",
    publishedYear: "published_year",
    pageCount: "page_count",
    synopsis: "synopsis",
    status: "status",
    favorite: "favorite",
    order: "sort_order",
    rating: "rating",
    finishedYear: "finished_year",
    progress: "progress",
    notes: "notes",
  };
  const row = Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [fieldNames[key], value]),
  );
  const rows = await request<BookRow[]>(
    `books?id=eq.${encodeURIComponent(id)}&select=${BOOK_COLUMNS}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    },
  );
  if (!rows[0]) throw new Error("El libro no existe");
  return fromRow(rows[0]);
}

export async function deleteBook(id: string) {
  await request<void>(`books?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function importBooks(incoming: Book[]) {
  const existing = await listBooks();
  const byId = new Map(existing.map((book) => [book.$id, book]));
  const byGoogleId = new Map(
    existing
      .filter((book) => book.googleBooksId)
      .map((book) => [book.googleBooksId, book]),
  );
  const prepared = incoming.map((book) => {
    const match = byId.get(book.$id) || byGoogleId.get(book.googleBooksId);
    return toRow(match ? { ...book, $id: match.$id } : book);
  });

  for (let offset = 0; offset < prepared.length; offset += 500) {
    await request<BookRow[]>("books?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(prepared.slice(offset, offset + 500)),
    });
  }

  return prepared.length;
}

export async function checkSupabase() {
  await request<Array<Pick<BookRow, "id">>>("books?select=id&limit=1");
}