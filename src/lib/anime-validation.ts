import type { Anime, AnimeStatus } from "@/types/anime";

const STATUSES = new Set<AnimeStatus>(["watching", "to_watch", "on_hold", "watched", "dropped"]);

function optionalInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error("Valor numérico no válido");
  }
  return Number(value);
}

function requiredInteger(value: unknown, minimum: number, maximum: number, fallback: number) {
  if (value === null || value === undefined) return fallback;
  return optionalInteger(value, minimum, maximum) ?? fallback;
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

function genres(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((genre): genre is string => typeof genre === "string")
    .map((genre) => genre.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 30);
}

function status(value: unknown, fallback: AnimeStatus = "to_watch") {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || !STATUSES.has(value as AnimeStatus)) {
    throw new Error("Estado no válido");
  }
  return value as AnimeStatus;
}

function coverUrl(value: unknown) {
  const url = text(value, 2000) || null;
  if (url && !url.startsWith("https://")) throw new Error("URL de portada no válida");
  return url;
}

function isoDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("Fecha no válida");
  }
  return new Date(value).toISOString();
}

export type AnimeInput = Omit<Anime, "$id" | "order" | "addedAt">;

/** Alta desde la búsqueda o manual: solo `title` es obligatorio; `sourceId` vacío si es manual. */
export function parseAnimeInput(value: unknown): AnimeInput {
  if (typeof value !== "object" || value === null) throw new Error("Anime no válido");
  const input = value as Record<string, unknown>;
  const title = text(input.title, 500);
  if (!title) throw new Error("El título no puede estar vacío");

  return {
    sourceId: text(input.sourceId, 120),
    title,
    titleJapanese: text(input.titleJapanese, 500),
    coverUrl: coverUrl(input.coverUrl),
    releaseYear: optionalInteger(input.releaseYear, 1900, 2100),
    mediaFormat: text(input.mediaFormat, 30),
    genres: genres(input.genres),
    synopsis: text(input.synopsis, 20000),
    status: status(input.status),
    favorite: input.favorite === undefined ? false : boolean(input.favorite),
    rating: optionalInteger(input.rating, 0, 5),
    currentSeason: requiredInteger(input.currentSeason, 1, 100, 1),
    currentEpisode: requiredInteger(input.currentEpisode, 0, 100000, 0),
    totalEpisodes: optionalInteger(input.totalEpisodes, 0, 100000),
    totalSeasons: optionalInteger(input.totalSeasons, 1, 100),
    finishedYear: optionalInteger(input.finishedYear, 1900, 2100),
    lastWatchedAt: isoDate(input.lastWatchedAt),
    notes: text(input.notes, 50000),
  };
}

export type AnimeChanges = Partial<Omit<Anime, "$id" | "sourceId" | "addedAt">>;

/** PATCH parcial. */
export function parseAnimeChanges(value: unknown): AnimeChanges {
  if (typeof value !== "object" || value === null) throw new Error("Cambios no válidos");
  const input = value as Record<string, unknown>;
  const changes: AnimeChanges = {};

  if ("title" in input) {
    const title = text(input.title, 500);
    if (!title) throw new Error("El título no puede estar vacío");
    changes.title = title;
  }
  if ("titleJapanese" in input) changes.titleJapanese = text(input.titleJapanese, 500);
  if ("coverUrl" in input) changes.coverUrl = coverUrl(input.coverUrl);
  if ("releaseYear" in input) changes.releaseYear = optionalInteger(input.releaseYear, 1900, 2100);
  if ("mediaFormat" in input) changes.mediaFormat = text(input.mediaFormat, 30);
  if ("genres" in input) changes.genres = genres(input.genres);
  if ("synopsis" in input) changes.synopsis = text(input.synopsis, 20000);
  if ("status" in input) changes.status = status(input.status);
  if ("favorite" in input) changes.favorite = boolean(input.favorite);
  if ("rating" in input) changes.rating = optionalInteger(input.rating, 0, 5);
  if ("currentSeason" in input) changes.currentSeason = requiredInteger(input.currentSeason, 1, 100, 1);
  if ("currentEpisode" in input) changes.currentEpisode = requiredInteger(input.currentEpisode, 0, 100000, 0);
  if ("totalEpisodes" in input) changes.totalEpisodes = optionalInteger(input.totalEpisodes, 0, 100000);
  if ("totalSeasons" in input) changes.totalSeasons = optionalInteger(input.totalSeasons, 1, 100);
  if ("finishedYear" in input) changes.finishedYear = optionalInteger(input.finishedYear, 1900, 2100);
  if ("lastWatchedAt" in input) changes.lastWatchedAt = isoDate(input.lastWatchedAt);
  if ("order" in input) changes.order = optionalInteger(input.order);
  if ("notes" in input) changes.notes = text(input.notes, 50000);

  return changes;
}

function backupAnime(value: unknown): Anime {
  if (typeof value !== "object" || value === null) throw new Error("Anime no válido en la copia");
  const input = value as Record<string, unknown>;
  const title = text(input.title, 500);
  if (!title) throw new Error("Hay un anime sin título en la copia");

  const rawStatus = input.status ?? "to_watch";
  if (typeof rawStatus !== "string" || !STATUSES.has(rawStatus as AnimeStatus)) {
    throw new Error(`Estado no válido en ${title}`);
  }

  const cover = text(input.coverUrl ?? input.cover_url, 2000) || null;
  if (cover && !cover.startsWith("https://")) {
    throw new Error(`URL de portada no válida en ${title}`);
  }

  const addedAtValue = text(input.addedAt ?? input.added_at, 100);
  const addedAt = addedAtValue && !Number.isNaN(Date.parse(addedAtValue))
    ? new Date(addedAtValue).toISOString()
    : new Date().toISOString();
  const lastWatchedValue = text(input.lastWatchedAt ?? input.last_watched_at, 100);

  return {
    $id: text(input.$id ?? input.id, 255) || crypto.randomUUID(),
    sourceId: text(input.sourceId ?? input.source_id, 120),
    title,
    titleJapanese: text(input.titleJapanese ?? input.title_japanese, 500),
    coverUrl: cover,
    releaseYear: optionalInteger(input.releaseYear ?? input.release_year, 1900, 2100),
    mediaFormat: text(input.mediaFormat ?? input.media_format, 30),
    genres: genres(input.genres),
    synopsis: text(input.synopsis, 20000),
    status: rawStatus as AnimeStatus,
    favorite: input.favorite === true,
    rating: optionalInteger(input.rating, 0, 5),
    currentSeason: requiredInteger(input.currentSeason ?? input.current_season, 1, 100, 1),
    currentEpisode: requiredInteger(input.currentEpisode ?? input.current_episode, 0, 100000, 0),
    totalEpisodes: optionalInteger(input.totalEpisodes ?? input.total_episodes, 0, 100000),
    totalSeasons: optionalInteger(input.totalSeasons ?? input.total_seasons, 1, 100),
    finishedYear: optionalInteger(input.finishedYear ?? input.finished_year, 1900, 2100),
    lastWatchedAt: lastWatchedValue && !Number.isNaN(Date.parse(lastWatchedValue))
      ? new Date(lastWatchedValue).toISOString()
      : null,
    order: optionalInteger(input.order ?? input.sort_order),
    notes: text(input.notes, 50000),
    addedAt,
  };
}

/**
 * Copia de seguridad: acepta un objeto con `anime` (v3) o cualquier copia sin
 * ese campo (v1/v2, o un array de libros), en cuyo caso devuelve una lista vacía.
 */
export function parseAnimeBackup(value: unknown): Anime[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const candidate = (value as Record<string, unknown>).anime;
  if (candidate === undefined || candidate === null) return [];
  if (!Array.isArray(candidate)) throw new Error("Los animes de la copia no son válidos.");

  const unique = new Map<string, Anime>();
  for (const item of candidate) {
    const anime = backupAnime(item);
    unique.set(anime.sourceId || anime.$id, anime);
  }
  return Array.from(unique.values());
}
