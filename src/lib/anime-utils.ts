import type { Anime, AnimeStatus } from "@/types/anime";

export const ANIME_STATUS_LABELS: Record<AnimeStatus, string> = {
  watching: "Viendo",
  to_watch: "Pendiente",
  on_hold: "En pausa",
  watched: "Visto",
  dropped: "Abandonado",
};

type AnimeInput = Partial<Omit<Anime, "$id" | "title">> & {
  $id: string;
  title: string;
};

export function normalizeAnime(value: AnimeInput): Anime {
  return {
    $id: value.$id,
    sourceId: value.sourceId ?? "",
    title: value.title,
    titleJapanese: value.titleJapanese ?? "",
    coverUrl: value.coverUrl ?? null,
    releaseYear: value.releaseYear ?? null,
    mediaFormat: value.mediaFormat ?? "",
    genres: value.genres ?? [],
    synopsis: value.synopsis ?? "",
    status: value.status ?? "to_watch",
    favorite: value.favorite === true,
    rating: value.rating ?? null,
    currentSeason: Math.max(1, Math.trunc(value.currentSeason ?? 1)),
    currentEpisode: Math.max(0, Math.trunc(value.currentEpisode ?? 0)),
    totalEpisodes: value.totalEpisodes ?? null,
    totalSeasons: value.totalSeasons ?? null,
    finishedYear: value.finishedYear ?? null,
    lastWatchedAt: value.lastWatchedAt ?? null,
    order: value.order ?? null,
    notes: value.notes ?? "",
    addedAt: value.addedAt ?? new Date().toISOString(),
  };
}

export const JAPANESE_PHRASES = [
  { japanese: "七転び八起き", romaji: "Nanakorobi yaoki", translation: "Cae siete veces, levántate ocho." },
  { japanese: "一期一会", romaji: "Ichigo ichie", translation: "Un solo encuentro en la vida: cada momento es irrepetible." },
  { japanese: "継続は力なり", romaji: "Keizoku wa chikara nari", translation: "La constancia es poder." },
  { japanese: "千里の道も一歩から", romaji: "Senri no michi mo ippo kara", translation: "Un camino de mil leguas empieza con un paso." },
  { japanese: "猿も木から落ちる", romaji: "Saru mo ki kara ochiru", translation: "Hasta los monos se caen de los árboles." },
  { japanese: "花より団子", romaji: "Hana yori dango", translation: "Mejor dulces que flores." },
  { japanese: "石の上にも三年", romaji: "Ishi no ue ni mo sannen", translation: "Tres años sobre una piedra: la paciencia da frutos." },
  { japanese: "案ずるより産むが易し", romaji: "Anzuru yori umu ga yasushi", translation: "Es más fácil hacerlo que preocuparse." },
  { japanese: "十人十色", romaji: "Jūnin toiro", translation: "Diez personas, diez colores." },
  { japanese: "雨降って地固まる", romaji: "Ame futte ji katamaru", translation: "Después de la lluvia, la tierra se endurece." },
  { japanese: "好きこそ物の上手なれ", romaji: "Suki koso mono no jōzu nare", translation: "Lo que te gusta, lo haces mejor." },
  { japanese: "初心忘るべからず", romaji: "Shoshin wasuru bekarazu", translation: "No olvides tu espíritu de principiante." },
  { japanese: "花鳥風月", romaji: "Kachō fūgetsu", translation: "Flores, aves, viento y luna: la belleza de la naturaleza." },
  { japanese: "光陰矢の如し", romaji: "Kōin ya no gotoshi", translation: "El tiempo vuela como una flecha." },
] as const;

/** Una frase por día, igual que getDailyQuote() de la portada. */
export function getDailyJapanesePhrase() {
  const day = Math.floor(Date.now() / 86_400_000);
  return JAPANESE_PHRASES[day % JAPANESE_PHRASES.length];
}

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  primera: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5,
  sexta: 6, séptima: 7, septima: 7, octava: 8, novena: 9, décima: 10, decima: 10,
};
const ORDINAL_ALTERNATION = Object.keys(ORDINAL_WORDS).join("|");

type SeasonPattern = { regex: RegExp; read: (match: RegExpMatchArray) => number | null; isPart?: boolean };

// Todos los patrones se aplican al final del título (con separadores o paréntesis opcionales).
const TAIL = String.raw`[\s:\-–—,]*\(?\s*`;
const END = String.raw`\s*\)?\s*$`;
const SEASON_PATTERNS: SeasonPattern[] = [
  { regex: new RegExp(`${TAIL}(\\d{1,2})(?:st|nd|rd|th)\\s+season${END}`, "i"), read: (m) => Number(m[1]) },
  { regex: new RegExp(`${TAIL}(${ORDINAL_ALTERNATION})\\s+season${END}`, "i"), read: (m) => ORDINAL_WORDS[m[1].toLowerCase()] ?? null },
  { regex: new RegExp(`${TAIL}season\\s+(\\d{1,2})${END}`, "i"), read: (m) => Number(m[1]) },
  { regex: new RegExp(`${TAIL}final\\s+season${END}`, "i"), read: () => null },
  { regex: new RegExp(`${TAIL}(\\d{1,2})\\.?[ªa]?\\s+temporada${END}`, "i"), read: (m) => Number(m[1]) },
  { regex: new RegExp(`${TAIL}temporada\\s+(\\d{1,2})${END}`, "i"), read: (m) => Number(m[1]) },
  { regex: new RegExp(`${TAIL}(${ORDINAL_ALTERNATION})\\s+temporada${END}`, "i"), read: (m) => ORDINAL_WORDS[m[1].toLowerCase()] ?? null },
  { regex: new RegExp(`${TAIL}temporada\\s+final${END}`, "i"), read: () => null },
  { regex: new RegExp(`${TAIL}part\\s+(\\d{1,2})${END}`, "i"), read: (m) => Number(m[1]), isPart: true },
  { regex: new RegExp(`${TAIL}parte\\s+(\\d{1,2})${END}`, "i"), read: (m) => Number(m[1]), isPart: true },
];

/**
 * Quita sufijos de temporada del título ("Season 2", "2nd Season", "Part 2",
 * "Final Season", "Segunda temporada"…) y devuelve el título base y la
 * temporada detectada (1 si no hay número). Ayuda best-effort: el usuario
 * puede corregir ambos valores.
 */
export function splitSeasonFromTitle(title: string): { baseTitle: string; season: number } {
  let base = title.trim();
  let season: number | null = null;
  let partSeason: number | null = null;

  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (const pattern of SEASON_PATTERNS) {
      const match = base.match(pattern.regex);
      if (!match) continue;
      const stripped = base.slice(0, match.index).replace(/[\s:\-–—,(]+$/, "");
      if (!stripped) continue; // nunca dejar el título vacío
      const value = pattern.read(match);
      if (value !== null && value >= 1 && value <= 100) {
        if (pattern.isPart) partSeason ??= value;
        else season ??= value;
      }
      base = stripped;
      changed = true;
      break;
    }
    if (!changed) break;
  }

  return { baseTitle: base, season: season ?? partSeason ?? 1 };
}

/** Clave para comparar títulos (sin tildes, mayúsculas ni espacios sobrantes). */
export function animeTitleKey(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

/** Colores de estado para gráficos (coinciden con `--status-color`). */
export const ANIME_STATUS_COLORS: Record<AnimeStatus, string> = {
  watching: "#b8f34a",
  to_watch: "#e9bb58",
  on_hold: "#8fb7e8",
  watched: "#ff735d",
  dropped: "#696b67",
};

/** Capítulos vistos (aprox.): Visto → totalEpisodes ?? currentEpisode; Viendo → currentEpisode. */
export function animeEpisodesWatched(item: Anime) {
  if (item.status === "watched") return item.totalEpisodes ?? item.currentEpisode;
  if (item.status === "watching") return item.currentEpisode;
  return 0;
}
