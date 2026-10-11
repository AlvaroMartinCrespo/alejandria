/** Estados del recorrido de un anime. Puede haber muchos en "watching" a la vez. */
export type AnimeStatus = "watching" | "to_watch" | "on_hold" | "watched" | "dropped";

/**
 * Modelo de un anime. Un anime = un solo registro aunque tenga varias
 * temporadas: temporada y capítulo actuales los lleva el usuario a mano.
 */
export interface Anime {
  $id: string;
  sourceId: string; // "jikan:<id>", "anilist:<id>" o "" si es manual
  title: string;
  titleJapanese: string;
  coverUrl: string | null;
  releaseYear: number | null;
  mediaFormat: string;
  genres: string[];
  synopsis: string;
  status: AnimeStatus;
  favorite: boolean;
  rating: number | null; // 0-5
  currentSeason: number; // >= 1
  currentEpisode: number; // >= 0, dentro de la temporada actual
  totalEpisodes: number | null; // capítulos de la temporada actual
  totalSeasons: number | null;
  finishedYear: number | null;
  lastWatchedAt: string | null; // ISO date
  order: number | null; // posición manual
  notes: string;
  addedAt: string; // ISO date
}

/** Resultado normalizado de la búsqueda (Jikan o AniList). */
export interface AnimeSearchResult {
  sourceId: string;
  title: string;
  titleJapanese: string;
  coverUrl: string | null;
  releaseYear: number | null;
  mediaFormat: string;
  totalEpisodes: number | null;
  genres: string[];
  synopsis: string;
}
