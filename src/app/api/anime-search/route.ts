import { NextResponse } from "next/server";
import type { AnimeSearchResult } from "@/types/anime";

const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";
const TIMEOUT_MS = 8000;

interface JikanAnime {
  mal_id: number;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  images?: { jpg?: { large_image_url?: string | null; image_url?: string | null } };
  year?: number | null;
  aired?: { prop?: { from?: { year?: number | null } } };
  type?: string | null;
  episodes?: number | null;
  genres?: Array<{ name?: string }>;
  synopsis?: string | null;
}

interface AniListMedia {
  id: number;
  title?: { romaji?: string | null; english?: string | null; native?: string | null };
  coverImage?: { large?: string | null };
  seasonYear?: number | null;
  format?: string | null;
  episodes?: number | null;
  genres?: string[];
  description?: string | null;
}

class UpstreamError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function animeSearchError(status: number) {
  if (status === 429) {
    return "Se superó el límite de búsquedas de anime. Espera unos segundos y vuelve a intentarlo.";
  }
  if (status === 400) return "La búsqueda de anime no es válida.";
  if (status === 504) return "El servicio de anime tardó demasiado en responder. Vuelve a intentarlo.";
  return "El servicio de búsqueda de anime no está disponible ahora mismo. Inténtalo de nuevo en unos segundos.";
}

function httpsUrl(value: string | null | undefined) {
  if (!value) return null;
  const url = value.replace(/^http:\/\//, "https://");
  return url.startsWith("https://") ? url.slice(0, 2000) : null;
}

function year(value: number | null | undefined) {
  return Number.isInteger(value) && value! >= 1900 && value! <= 2100 ? value! : null;
}

function episodes(value: number | null | undefined) {
  return Number.isInteger(value) && value! >= 0 && value! <= 100000 ? value! : null;
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupe(results: AnimeSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.sourceId)) return false;
    seen.add(result.sourceId);
    return true;
  });
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new UpstreamError("Tiempo de espera agotado", 504);
  }
}

async function searchJikan(query: string): Promise<AnimeSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: "12", sfw: "true" });
  const response = await fetchWithTimeout(`https://api.jikan.moe/v4/anime?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "Alejandria/1.0" },
  });
  if (!response.ok) throw new UpstreamError("Jikan no respondió correctamente", response.status);

  const data = (await response.json().catch(() => null)) as { data?: JikanAnime[] } | null;
  if (!data || !Array.isArray(data.data)) throw new UpstreamError("Respuesta de Jikan no válida", 502);

  return dedupe(
    data.data
      .filter((item) => Number.isInteger(item.mal_id) && (item.title_english || item.title))
      .map((item) => ({
        sourceId: `jikan:${item.mal_id}`,
        title: (item.title_english || item.title || "").slice(0, 500),
        titleJapanese: (item.title_japanese ?? "").slice(0, 500),
        coverUrl: httpsUrl(item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url),
        releaseYear: year(item.year ?? item.aired?.prop?.from?.year),
        mediaFormat: (item.type ?? "").slice(0, 30),
        totalEpisodes: episodes(item.episodes),
        genres: (item.genres ?? []).map((genre) => genre.name ?? "").filter(Boolean).slice(0, 30),
        synopsis: (item.synopsis ?? "").slice(0, 20000),
      })),
  );
}

const ANILIST_QUERY = `query ($q: String) {
  Page(perPage: 12) {
    media(search: $q, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large }
      seasonYear
      format
      episodes
      genres
      description(asHtml: false)
    }
  }
}`;

const ANILIST_FORMATS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

async function searchAniList(query: string): Promise<AnimeSearchResult[]> {
  const response = await fetchWithTimeout("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_QUERY, variables: { q: query } }),
  });
  if (!response.ok) throw new UpstreamError("AniList no respondió correctamente", response.status);

  const data = (await response.json().catch(() => null)) as
    | { data?: { Page?: { media?: AniListMedia[] } } }
    | null;
  const media = data?.data?.Page?.media;
  if (!Array.isArray(media)) throw new UpstreamError("Respuesta de AniList no válida", 502);

  return dedupe(
    media
      .filter((item) => Number.isInteger(item.id) && (item.title?.english || item.title?.romaji || item.title?.native))
      .map((item) => ({
        sourceId: `anilist:${item.id}`,
        title: (item.title?.english || item.title?.romaji || item.title?.native || "").slice(0, 500),
        titleJapanese: (item.title?.native ?? "").slice(0, 500),
        coverUrl: httpsUrl(item.coverImage?.large),
        releaseYear: year(item.seasonYear),
        mediaFormat: (ANILIST_FORMATS[item.format ?? ""] ?? item.format ?? "").slice(0, 30),
        totalEpisodes: episodes(item.episodes),
        genres: (item.genres ?? []).filter(Boolean).slice(0, 30),
        synopsis: stripHtml(item.description ?? "").slice(0, 20000),
      })),
  );
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ anime: [] });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: "La búsqueda es demasiado larga" }, { status: 400 });
  }

  const headers = { "Cache-Control": CACHE_CONTROL };

  try {
    const anime = await searchJikan(query);
    return NextResponse.json({ anime, source: "jikan" }, { headers });
  } catch (jikanError) {
    // Respaldo: AniList si Jikan da 429/5xx/timeout o una respuesta inválida.
    try {
      const anime = await searchAniList(query);
      return NextResponse.json({ anime, source: "anilist" }, { headers });
    } catch (anilistError) {
      const status = anilistError instanceof UpstreamError && anilistError.status === 429
        ? 429
        : jikanError instanceof UpstreamError && jikanError.status === 429
          ? 429
          : jikanError instanceof UpstreamError && jikanError.status === 504
            ? 504
            : 502;
      return NextResponse.json({ error: animeSearchError(status) }, { status });
    }
  }
}
