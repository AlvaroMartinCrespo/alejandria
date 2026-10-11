import "server-only";

import type { Anime } from "@/types/anime";
import type { Book, Collection, GoogleBookResult } from "@/types/book";

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
  "collection_id",
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
  collection_id: string | null;
  rating: number | null;
  finished_year: number | null;
  added_at: string;
  progress: number;
  notes: string;
};

type CollectionRow = {
  id: string;
  name: string;
  sort_order: number;
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
    collectionId: row.collection_id,
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
    collection_id: book.collectionId,
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
    collectionId: null,
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
    collectionId: "collection_id",
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

function fromCollectionRow(row: CollectionRow): Collection {
  return { $id: row.id, name: row.name, order: row.sort_order };
}

export async function listCollections() {
  const rows = await request<CollectionRow[]>("collections?select=id,name,sort_order&order=sort_order.asc");
  return rows.map(fromCollectionRow);
}

export async function createCollection(name: string) {
  const collections = await listCollections();
  const rows = await request<CollectionRow[]>("collections?select=id,name,sort_order", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ id: crypto.randomUUID(), name, sort_order: collections.length }),
  });
  return fromCollectionRow(rows[0]);
}

export async function updateCollection(id: string, changes: Pick<Partial<Collection>, "name" | "order">) {
  const row: Record<string, string | number> = {};
  if (changes.name !== undefined) row.name = changes.name;
  if (changes.order !== undefined) row.sort_order = changes.order;
  const rows = await request<CollectionRow[]>(
    `collections?id=eq.${encodeURIComponent(id)}&select=id,name,sort_order`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) },
  );
  if (!rows[0]) throw new Error("La carpeta no existe");
  return fromCollectionRow(rows[0]);
}

export async function deleteCollection(id: string) {
  await request<void>(`collections?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function reorderBooks(moves: Array<{ id: string; collectionId: string | null; order: number }>) {
  await request<void>("rpc/reorder_books", {
    method: "POST",
    body: JSON.stringify({
      moves: moves.map((move) => ({
        id: move.id,
        collection_id: move.collectionId ?? "",
        sort_order: move.order,
      })),
    }),
  });
}

export async function deleteBook(id: string) {
  await request<void>(`books?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function importBooks(incoming: Book[], incomingCollections: Collection[]) {
  const existingCollections = await listCollections();
  const existingCollectionIds = new Set(existingCollections.map((collection) => collection.$id));
  const collectionsToCreate = incomingCollections.filter((collection) => !existingCollectionIds.has(collection.$id));
  for (let offset = 0; offset < collectionsToCreate.length; offset += 500) {
    await request<CollectionRow[]>("collections?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(collectionsToCreate.slice(offset, offset + 500).map((collection) => ({
        id: collection.$id,
        name: collection.name,
        sort_order: collection.order,
      }))),
    });
  }
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

/* ===== ANIME ===== */

const ANIME_COLUMNS = [
  "id",
  "source_id",
  "title",
  "title_japanese",
  "cover_url",
  "release_year",
  "media_format",
  "genres",
  "synopsis",
  "status",
  "favorite",
  "rating",
  "current_season",
  "current_episode",
  "total_episodes",
  "total_seasons",
  "finished_year",
  "last_watched_at",
  "sort_order",
  "notes",
  "added_at",
].join(",");

type AnimeRow = {
  id: string;
  source_id: string;
  title: string;
  title_japanese: string;
  cover_url: string | null;
  release_year: number | null;
  media_format: string;
  genres: string[];
  synopsis: string;
  status: Anime["status"];
  favorite: boolean;
  rating: number | null;
  current_season: number;
  current_episode: number;
  total_episodes: number | null;
  total_seasons: number | null;
  finished_year: number | null;
  last_watched_at: string | null;
  sort_order: number | null;
  notes: string;
  added_at: string;
};

/** Se lanza al crear un anime cuyo `source_id` ya existe (las rutas lo traducen a 409). */
export class AnimeDuplicateError extends Error {
  constructor() {
    super("Este anime ya está en tu lista");
    this.name = "AnimeDuplicateError";
  }
}

function fromAnimeRow(row: AnimeRow): Anime {
  return {
    $id: row.id,
    sourceId: row.source_id,
    title: row.title,
    titleJapanese: row.title_japanese,
    coverUrl: row.cover_url,
    releaseYear: row.release_year,
    mediaFormat: row.media_format,
    genres: row.genres,
    synopsis: row.synopsis,
    status: row.status,
    favorite: row.favorite,
    rating: row.rating,
    currentSeason: row.current_season,
    currentEpisode: row.current_episode,
    totalEpisodes: row.total_episodes,
    totalSeasons: row.total_seasons,
    finishedYear: row.finished_year,
    lastWatchedAt: row.last_watched_at,
    order: row.sort_order,
    notes: row.notes,
    addedAt: row.added_at,
  };
}

function toAnimeRow(anime: Anime): AnimeRow {
  return {
    id: anime.$id,
    source_id: anime.sourceId,
    title: anime.title,
    title_japanese: anime.titleJapanese,
    cover_url: anime.coverUrl,
    release_year: anime.releaseYear,
    media_format: anime.mediaFormat,
    genres: anime.genres,
    synopsis: anime.synopsis,
    status: anime.status,
    favorite: anime.favorite,
    rating: anime.rating,
    current_season: anime.currentSeason,
    current_episode: anime.currentEpisode,
    total_episodes: anime.totalEpisodes,
    total_seasons: anime.totalSeasons,
    finished_year: anime.finishedYear,
    last_watched_at: anime.lastWatchedAt,
    sort_order: anime.order,
    notes: anime.notes,
    added_at: anime.addedAt,
  };
}

export async function listAnime() {
  const pageSize = 1000;
  const anime: Anime[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const rows = await request<AnimeRow[]>(
      `anime?select=${ANIME_COLUMNS}&order=added_at.asc&offset=${offset}&limit=${pageSize}`,
    );
    anime.push(...rows.map(fromAnimeRow));
    if (rows.length < pageSize) return anime;
  }
}

export async function createAnime(input: Omit<Anime, "$id" | "order" | "addedAt">) {
  if (input.sourceId) {
    const existing = await request<Array<Pick<AnimeRow, "id">>>(
      `anime?select=id&source_id=eq.${encodeURIComponent(input.sourceId)}&limit=1`,
    );
    if (existing.length) throw new AnimeDuplicateError();
  }

  const anime: Anime = {
    ...input,
    $id: crypto.randomUUID(),
    order: Date.now(),
    addedAt: new Date().toISOString(),
  };
  try {
    const rows = await request<AnimeRow[]>(`anime?select=${ANIME_COLUMNS}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toAnimeRow(anime)),
    });
    return fromAnimeRow(rows[0]);
  } catch (error) {
    // Carrera entre dos altas simultáneas: el índice único de source_id también protege.
    if (input.sourceId && error instanceof Error && /duplicate key|anime_source_id_unique/i.test(error.message)) {
      throw new AnimeDuplicateError();
    }
    throw error;
  }
}

export async function updateAnime(
  id: string,
  changes: Partial<Omit<Anime, "$id" | "sourceId" | "addedAt">>,
) {
  const fieldNames: Record<string, keyof AnimeRow> = {
    title: "title",
    titleJapanese: "title_japanese",
    coverUrl: "cover_url",
    releaseYear: "release_year",
    mediaFormat: "media_format",
    genres: "genres",
    synopsis: "synopsis",
    status: "status",
    favorite: "favorite",
    rating: "rating",
    currentSeason: "current_season",
    currentEpisode: "current_episode",
    totalEpisodes: "total_episodes",
    totalSeasons: "total_seasons",
    finishedYear: "finished_year",
    lastWatchedAt: "last_watched_at",
    order: "sort_order",
    notes: "notes",
  };
  const row = Object.fromEntries(
    Object.entries(changes)
      .filter(([key]) => key in fieldNames)
      .map(([key, value]) => [fieldNames[key], value]),
  );
  const rows = await request<AnimeRow[]>(
    `anime?id=eq.${encodeURIComponent(id)}&select=${ANIME_COLUMNS}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    },
  );
  if (!rows[0]) throw new Error("El anime no existe");
  return fromAnimeRow(rows[0]);
}

export async function deleteAnime(id: string) {
  await request<void>(`anime?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function reorderAnime(moves: Array<{ id: string; order: number }>) {
  await request<void>("rpc/reorder_anime", {
    method: "POST",
    body: JSON.stringify({
      moves: moves.map((move) => ({ id: move.id, sort_order: move.order })),
    }),
  });
}

/** Restaura copias: upsert por `id`, reutilizando el anime existente con el mismo `source_id`. Nunca borra. */
export async function importAnime(incoming: Anime[]) {
  const existing = await listAnime();
  const byId = new Map(existing.map((anime) => [anime.$id, anime]));
  const bySourceId = new Map(
    existing.filter((anime) => anime.sourceId).map((anime) => [anime.sourceId, anime]),
  );
  const prepared = new Map<string, AnimeRow>();
  for (const anime of incoming) {
    const match = byId.get(anime.$id) || (anime.sourceId ? bySourceId.get(anime.sourceId) : undefined);
    const row = toAnimeRow(match ? { ...anime, $id: match.$id } : anime);
    prepared.set(row.id, row);
  }
  const rows = Array.from(prepared.values());

  for (let offset = 0; offset < rows.length; offset += 500) {
    await request<AnimeRow[]>("anime?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(offset, offset + 500)),
    });
  }

  return rows.length;
}

/** Falla si la tabla `anime` aún no existe (migración sin aplicar). */
export async function checkAnimeTable() {
  await request<Array<Pick<AnimeRow, "id">>>("anime?select=id&limit=1");
}
