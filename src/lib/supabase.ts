import "server-only";

import type { ReadingEvent, ReadingLogEntry } from "@/types/activity";
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
  "finished_month",
  "added_at",
  "progress",
  "notes",
  "created_at",
  "updated_at",
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
  finished_month: number | null;
  added_at: string;
  progress: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

type CollectionRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
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
    finishedMonth: row.finished_month,
    addedAt: row.added_at,
    progress: row.progress,
    notes: row.notes,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
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
    finished_month: book.finishedMonth,
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
    finishedMonth: null,
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
    finishedMonth: "finished_month",
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
  return {
    $id: row.id,
    name: row.name,
    order: row.sort_order,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
  };
}

export async function listCollections() {
  const rows = await request<CollectionRow[]>("collections?select=id,name,sort_order,created_at&order=sort_order.asc");
  return rows.map(fromCollectionRow);
}

export async function createCollection(name: string) {
  const collections = await listCollections();
  const rows = await request<CollectionRow[]>("collections?select=id,name,sort_order,created_at", {
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
    `collections?id=eq.${encodeURIComponent(id)}&select=id,name,sort_order,created_at`,
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
  "finished_month",
  "last_watched_at",
  "sort_order",
  "notes",
  "added_at",
  "created_at",
  "updated_at",
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
  finished_month: number | null;
  last_watched_at: string | null;
  sort_order: number | null;
  notes: string;
  added_at: string;
  created_at?: string;
  updated_at?: string;
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
    finishedMonth: row.finished_month,
    lastWatchedAt: row.last_watched_at,
    order: row.sort_order,
    notes: row.notes,
    addedAt: row.added_at,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
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
    finished_month: anime.finishedMonth,
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
    finishedMonth: "finished_month",
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


/* ===== CALENDARIO DE LECTURA ===== */

const READING_LOG_COLUMNS = "id,book_id,day,events,progress_from,progress_to,created_at,updated_at";

type ReadingLogRow = {
  id: string;
  book_id: string;
  day: string;
  events: ReadingEvent[];
  progress_from: number | null;
  progress_to: number | null;
  created_at?: string;
  updated_at?: string;
};

function fromReadingLogRow(row: ReadingLogRow): ReadingLogEntry {
  return {
    $id: row.id,
    bookId: row.book_id,
    day: row.day,
    events: row.events,
    progressFrom: row.progress_from,
    progressTo: row.progress_to,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}

/** Estado y progreso actuales de un libro (el valor *anterior* al cambio que se va a guardar). */
export async function getBookState(id: string) {
  const rows = await request<Array<Pick<BookRow, "status" | "progress">>>(
    `books?id=eq.${encodeURIComponent(id)}&select=status,progress&limit=1`,
  );
  return rows[0] ?? null;
}

/** Inserta o fusiona la actividad de un libro en un día (función SQL `log_reading_activity`). */
export async function logReadingActivity(input: {
  bookId: string;
  day: string;
  events: ReadingEvent[];
  from: number;
  to: number;
}) {
  for (const event of input.events) {
    await request<void>("rpc/log_reading_activity", {
      method: "POST",
      body: JSON.stringify({
        p_book_id: input.bookId,
        p_day: input.day,
        p_event: event,
        p_from: input.from,
        p_to: input.to,
      }),
    });
  }
}

export async function listReadingLog(range: { from?: string; to?: string } = {}) {
  const filters = [
    range.from ? `&day=gte.${encodeURIComponent(range.from)}` : "",
    range.to ? `&day=lte.${encodeURIComponent(range.to)}` : "",
  ].join("");
  const pageSize = 1000;
  const entries: ReadingLogEntry[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const rows = await request<ReadingLogRow[]>(
      `reading_log?select=${READING_LOG_COLUMNS}&order=day.desc,id.asc${filters}&offset=${offset}&limit=${pageSize}`,
    );
    entries.push(...rows.map(fromReadingLogRow));
    if (rows.length < pageSize) return entries;
  }
}

/** Restaura el historial: upsert por (book_id, day). Ignora libros que no existen y nunca borra. */
export async function importReadingLog(incoming: ReadingLogEntry[]) {
  if (!incoming.length) return 0;
  const bookIds = new Set((await listBooks()).map((book) => book.$id));
  const rows = incoming
    .filter((entry) => bookIds.has(entry.bookId))
    .map((entry) => ({
      book_id: entry.bookId,
      day: entry.day,
      events: entry.events,
      progress_from: entry.progressFrom,
      progress_to: entry.progressTo,
    }));

  for (let offset = 0; offset < rows.length; offset += 500) {
    await request<void>("reading_log?on_conflict=book_id,day", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(offset, offset + 500)),
    });
  }
  return rows.length;
}

/** Falla si la tabla `reading_log` aún no existe (migración sin aplicar). */
export async function checkReadingLogTable() {
  await request<Array<Pick<ReadingLogRow, "id">>>("reading_log?select=id&limit=1");
}

/* ===== DÍAS MARCADOS A MANO ===== */

export async function listReadingMarks() {
  // Paginado: PostgREST corta cada respuesta, y una copia no puede perder días por un límite fijo.
  const pageSize = 1000;
  const days: string[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const rows = await request<Array<{ day: string }>>(
      `reading_marks?select=day&order=day.asc&offset=${offset}&limit=${pageSize}`,
    );
    days.push(...rows.map((row) => row.day));
    if (rows.length < pageSize) return days;
  }
}

/** Marca días (idempotente: los ya marcados se ignoran). */
export async function addReadingMarks(days: string[]) {
  if (!days.length) return;
  await request<void>("reading_marks?on_conflict=day", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(days.map((day) => ({ day }))),
  });
}

export async function removeReadingMarks(days: string[]) {
  if (!days.length) return;
  await request<void>(`reading_marks?day=in.(${days.map(encodeURIComponent).join(",")})`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}


/* ===== REGISTRO DE COPIAS POR CORREO ===== */

export interface BackupLogInput {
  status: "success" | "error";
  trigger: "cron" | "manual";
  bookCount: number;
  animeCount: number;
  jsonBytes: number | null;
  errorMessage: string | null;
}

export interface LastBackup {
  sentAt: string;
  trigger: "cron" | "manual";
  bookCount: number;
  animeCount: number;
}

/** Último envío *correcto*. Lanza si la tabla no existe (falta `migration-backup-log.sql`). */
export async function getLastSuccessfulBackup(): Promise<LastBackup | null> {
  const rows = await request<Array<{ sent_at: string; trigger: "cron" | "manual"; book_count: number; anime_count: number }>>(
    "backup_log?select=sent_at,trigger,book_count,anime_count&status=eq.success&order=sent_at.desc&limit=1",
  );
  const row = rows[0];
  return row ? { sentAt: row.sent_at, trigger: row.trigger, bookCount: row.book_count, animeCount: row.anime_count } : null;
}

export async function insertBackupLog(entry: BackupLogInput) {
  await request<void>("backup_log", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: entry.status,
      trigger: entry.trigger,
      book_count: entry.bookCount,
      anime_count: entry.animeCount,
      json_bytes: entry.jsonBytes,
      // La tabla limita el mensaje a 2000 caracteres.
      error_message: entry.errorMessage ? entry.errorMessage.slice(0, 2000) : null,
    }),
  });
}

export async function checkBackupLogTable() {
  await request<Array<{ id: string }>>("backup_log?select=id&limit=1");
}
