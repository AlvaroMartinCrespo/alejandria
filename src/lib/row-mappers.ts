import type { Anime } from "@/types/anime";
import type { Book, Collection } from "@/types/book";

/**
 * Mapeo fila de Postgres (snake_case) → objeto de la aplicación.
 *
 * Vive aparte de `supabase.ts` (que lleva `import "server-only"`) para poder usarse
 * también en el navegador: los eventos de Supabase Realtime traen las filas con las
 * mismas columnas que la API REST, así que el mapeo es idéntico.
 */

export type BookRow = {
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

export type CollectionRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
};

export type AnimeRow = {
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

export function fromBookRow(row: BookRow): Book {
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

export function fromCollectionRow(row: CollectionRow): Collection {
  return {
    $id: row.id,
    name: row.name,
    order: row.sort_order,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
  };
}

export function fromAnimeRow(row: AnimeRow): Anime {
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
