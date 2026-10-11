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
  { japanese: "以心伝心", romaji: "Ishin denshin", translation: "De corazón a corazón: entenderse sin palabras." },
  { japanese: "温故知新", romaji: "Onko chishin", translation: "Estudiar el pasado para comprender lo nuevo." },
  { japanese: "日進月歩", romaji: "Nisshin geppo", translation: "Avanzar un poco cada día." },
  { japanese: "諸行無常", romaji: "Shogyō mujō", translation: "Todo es impermanente." },
  { japanese: "自業自得", romaji: "Jigō jitoku", translation: "Cosechas lo que siembras." },
  { japanese: "一日一善", romaji: "Ichinichi ichizen", translation: "Una buena acción al día." },
  { japanese: "初志貫徹", romaji: "Shoshi kantetsu", translation: "Mantén tu propósito inicial hasta el final." },
  { japanese: "急がば回れ", romaji: "Isogaba maware", translation: "Si tienes prisa, da un rodeo." },
  { japanese: "失敗は成功のもと", romaji: "Shippai wa seikō no moto", translation: "El fracaso es la base del éxito." },
  { japanese: "塵も積もれば山となる", romaji: "Chiri mo tsumoreba yama to naru", translation: "Hasta el polvo, acumulado, se vuelve montaña." },
  { japanese: "備えあれば憂いなし", romaji: "Sonae areba urei nashi", translation: "Quien se prepara no tiene de qué preocuparse." },
  { japanese: "井の中の蛙大海を知らず", romaji: "I no naka no kawazu taikai o shirazu", translation: "La rana del pozo no conoce el océano." },
  { japanese: "明日は明日の風が吹く", romaji: "Ashita wa ashita no kaze ga fuku", translation: "Mañana soplará el viento de mañana." },
  { japanese: "縁の下の力持ち", romaji: "En no shita no chikaramochi", translation: "Quien sostiene sin ser visto." },
  { japanese: "二兎を追う者は一兎をも得ず", romaji: "Nito o ou mono wa itto o mo ezu", translation: "Quien persigue dos liebres no atrapa ninguna." },
  { japanese: "能ある鷹は爪を隠す", romaji: "Nō aru taka wa tsume o kakusu", translation: "El halcón hábil esconde las garras." },
  { japanese: "勝って兜の緒を締めよ", romaji: "Katte kabuto no o o shimeyo", translation: "Tras la victoria, ajústate el casco." },
  { japanese: "物の哀れ", romaji: "Mono no aware", translation: "La belleza melancólica de lo pasajero." },
  { japanese: "侘び寂び", romaji: "Wabi-sabi", translation: "La belleza de lo imperfecto y lo efímero." },
  { japanese: "木漏れ日", romaji: "Komorebi", translation: "La luz del sol filtrada entre las hojas." },
  { japanese: "生き甲斐", romaji: "Ikigai", translation: "Aquello que da sentido a la vida." },
  { japanese: "我慢", romaji: "Gaman", translation: "Aguantar con paciencia y dignidad." },
] as const;

/** Kanjis sueltos, uno por cada dos días (alternan con las frases). */
export const JAPANESE_KANJI = [
  { japanese: "愛", romaji: "Ai", translation: "Amor." },
  { japanese: "恋", romaji: "Koi", translation: "Amor romántico, enamoramiento." },
  { japanese: "命", romaji: "Inochi", translation: "Vida." },
  { japanese: "生", romaji: "Sei · Ikiru", translation: "Nacer, vivir." },
  { japanese: "死", romaji: "Shi", translation: "Muerte." },
  { japanese: "夢", romaji: "Yume", translation: "Sueño." },
  { japanese: "心", romaji: "Kokoro", translation: "Corazón, mente." },
  { japanese: "魂", romaji: "Tamashii", translation: "Alma." },
  { japanese: "絆", romaji: "Kizuna", translation: "Vínculo entre personas." },
  { japanese: "縁", romaji: "En", translation: "Destino que une, lazo." },
  { japanese: "友", romaji: "Tomo", translation: "Amigo." },
  { japanese: "力", romaji: "Chikara", translation: "Fuerza." },
  { japanese: "勇", romaji: "Yū", translation: "Valor." },
  { japanese: "義", romaji: "Gi", translation: "Justicia, deber." },
  { japanese: "誠", romaji: "Makoto", translation: "Sinceridad." },
  { japanese: "忍", romaji: "Shinobu", translation: "Resistir, aguantar." },
  { japanese: "和", romaji: "Wa", translation: "Armonía, paz." },
  { japanese: "静", romaji: "Shizuka", translation: "Calma, quietud." },
  { japanese: "無", romaji: "Mu", translation: "Nada, vacío." },
  { japanese: "禅", romaji: "Zen", translation: "Meditación, quietud interior." },
  { japanese: "道", romaji: "Michi", translation: "Camino." },
  { japanese: "時", romaji: "Toki", translation: "Tiempo." },
  { japanese: "運", romaji: "Un", translation: "Suerte, fortuna." },
  { japanese: "美", romaji: "Bi", translation: "Belleza." },
  { japanese: "笑", romaji: "Emi · Warai", translation: "Sonrisa, risa." },
  { japanese: "涙", romaji: "Namida", translation: "Lágrima." },
  { japanese: "光", romaji: "Hikari", translation: "Luz." },
  { japanese: "影", romaji: "Kage", translation: "Sombra." },
  { japanese: "闇", romaji: "Yami", translation: "Oscuridad." },
  { japanese: "空", romaji: "Sora", translation: "Cielo." },
  { japanese: "海", romaji: "Umi", translation: "Mar." },
  { japanese: "山", romaji: "Yama", translation: "Montaña." },
  { japanese: "月", romaji: "Tsuki", translation: "Luna." },
  { japanese: "星", romaji: "Hoshi", translation: "Estrella." },
  { japanese: "風", romaji: "Kaze", translation: "Viento." },
  { japanese: "雨", romaji: "Ame", translation: "Lluvia." },
  { japanese: "雪", romaji: "Yuki", translation: "Nieve." },
  { japanese: "火", romaji: "Hi", translation: "Fuego." },
  { japanese: "水", romaji: "Mizu", translation: "Agua." },
  { japanese: "花", romaji: "Hana", translation: "Flor." },
  { japanese: "桜", romaji: "Sakura", translation: "Cerezo en flor." },
  { japanese: "春", romaji: "Haru", translation: "Primavera." },
  { japanese: "夏", romaji: "Natsu", translation: "Verano." },
  { japanese: "秋", romaji: "Aki", translation: "Otoño." },
  { japanese: "冬", romaji: "Fuyu", translation: "Invierno." },
  { japanese: "朝", romaji: "Asa", translation: "Mañana." },
  { japanese: "夜", romaji: "Yoru", translation: "Noche." },
] as const;

/** Un elemento por día: frase en los días pares, kanji suelto en los impares. */
export function getDailyJapanesePhrase(): { japanese: string; romaji: string; translation: string } {
  const day = Math.floor(Date.now() / 86_400_000);
  const list = day % 2 === 0 ? JAPANESE_PHRASES : JAPANESE_KANJI;
  return list[Math.floor(day / 2) % list.length];
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
