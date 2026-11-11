import { MAX_RATING } from "@/lib/rating";
import { addDays, parseDay, progressDelta, weekdayMonday } from "@/lib/reading-activity";
import type { ReadingLogEntry } from "@/types/activity";
import type { Book, Collection } from "@/types/book";

/**
 * Curiosidades del recap calculadas a partir de los datos de la biblioteca.
 * Todo es lógica pura (sin React) para poder probarla con `npm test`.
 */

/** Grosor aproximado de un libro de bolsillo: ~1 cm cada 150 páginas. */
export const CM_PER_PAGE = 1 / 150;

export const WEEKDAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export const SEASONS = ["invierno", "primavera", "verano", "otoño"] as const;
export type Season = (typeof SEASONS)[number];

/** Mes (1-12) → estación del hemisferio norte. Diciembre cuenta como invierno. */
export function seasonOfMonth(month: number): Season {
  if (month === 12 || month <= 2) return "invierno";
  if (month <= 5) return "primavera";
  if (month <= 8) return "verano";
  return "otoño";
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/* ---------- Páginas ---------- */

export interface PageInsights {
  median: number | null;
  /** Libros de 500 páginas o más. */
  thick: number;
  /** Libros de hasta 200 páginas. */
  thin: number;
  /** Altura de todos los libros apilados, en cm. */
  stackCm: number;
  /** Nota media de los libros por encima y por debajo de la mediana de páginas. */
  lengthVsRating: { longAvg: number; shortAvg: number; longCount: number; shortCount: number } | null;
}

export function pageInsights(books: Book[]): PageInsights {
  const withPages = books.filter((book) => (book.pageCount ?? 0) > 0);
  const pages = withPages.map((book) => book.pageCount ?? 0);
  const mid = median(pages);

  let lengthVsRating: PageInsights["lengthVsRating"] = null;
  if (mid !== null) {
    const ratedWithPages = withPages.filter((book) => book.rating !== null);
    const long = ratedWithPages.filter((book) => (book.pageCount ?? 0) > mid);
    const short = ratedWithPages.filter((book) => (book.pageCount ?? 0) <= mid);
    // Hace falta una muestra mínima en cada lado para que la comparación signifique algo.
    if (long.length >= 3 && short.length >= 3) {
      lengthVsRating = {
        longAvg: average(long.map((book) => book.rating ?? 0)) ?? 0,
        shortAvg: average(short.map((book) => book.rating ?? 0)) ?? 0,
        longCount: long.length,
        shortCount: short.length,
      };
    }
  }

  return {
    median: mid === null ? null : Math.round(mid),
    thick: pages.filter((count) => count >= 500).length,
    thin: pages.filter((count) => count <= 200).length,
    stackCm: pages.reduce((sum, count) => sum + count, 0) * CM_PER_PAGE,
    lengthVsRating,
  };
}

/* ---------- Valoraciones ---------- */

export interface RatingInsights {
  /** Nota que más veces pusiste (en empate, la más alta). */
  mode: { rating: number; count: number } | null;
  /** Libros con la nota máxima. */
  perfect: number;
  /** Libros con 8 o más. */
  notable: number;
  rated: number;
}

export function ratingInsights(books: Book[]): RatingInsights {
  const rated = books.filter((book) => book.rating !== null);
  const counts = new Map<number, number>();
  for (const book of rated) counts.set(book.rating ?? 0, (counts.get(book.rating ?? 0) ?? 0) + 1);
  const ranking = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  return {
    mode: ranking[0] ? { rating: ranking[0][0], count: ranking[0][1] } : null,
    perfect: rated.filter((book) => book.rating === MAX_RATING).length,
    notable: rated.filter((book) => (book.rating ?? 0) >= 8).length,
    rated: rated.length,
  };
}

/* ---------- Autores ---------- */

export interface AuthorInsights {
  /** Autores de los que solo leíste un libro. */
  singles: number;
  distinct: number;
  /** Autor con mejor nota media (al menos 2 libros valorados). */
  bestRated: { author: string; average: number; count: number } | null;
}

export function authorInsights(books: Book[]): AuthorInsights {
  const byAuthor = new Map<string, Book[]>();
  for (const book of books) {
    for (const author of new Set(book.authors.map((name) => name.trim()).filter(Boolean))) {
      byAuthor.set(author, [...(byAuthor.get(author) ?? []), book]);
    }
  }
  let bestRated: AuthorInsights["bestRated"] = null;
  for (const [author, list] of byAuthor) {
    const ratings = list.filter((book) => book.rating !== null).map((book) => book.rating ?? 0);
    if (ratings.length < 2) continue;
    const avg = average(ratings) ?? 0;
    if (!bestRated || avg > bestRated.average || (avg === bestRated.average && ratings.length > bestRated.count)) {
      bestRated = { author, average: avg, count: ratings.length };
    }
  }
  return {
    singles: [...byAuthor.values()].filter((list) => list.length === 1).length,
    distinct: byAuthor.size,
    bestRated,
  };
}

/* ---------- Publicación ---------- */

export interface PublicationInsights {
  newest: Book | null;
  /** Años entre el libro más antiguo y el más reciente. */
  span: number | null;
  /** Antigüedad media (año de lectura − año de publicación). */
  averageAge: number | null;
  /** Libros con 50 años o más cuando los leíste. */
  classics: number;
  /** Libros publicados el mismo año o el anterior a leerlos. */
  fresh: number;
  /** Libros con año de publicación. */
  dated: number;
}

export function publicationInsights(books: Book[], fallbackYear: number): PublicationInsights {
  const published = books.filter((book) => book.publishedYear);
  const byYear = [...published].sort((a, b) => (b.publishedYear ?? 0) - (a.publishedYear ?? 0));
  const ages = published
    .map((book) => Math.max(0, (book.finishedYear ?? fallbackYear) - (book.publishedYear ?? 0)));
  const years = published.map((book) => book.publishedYear ?? 0);
  return {
    newest: byYear[0] ?? null,
    span: years.length > 1 ? Math.max(...years) - Math.min(...years) : null,
    averageAge: average(ages),
    classics: ages.filter((age) => age >= 50).length,
    fresh: ages.filter((age) => age <= 1).length,
    dated: published.length,
  };
}

/* ---------- Estaciones ---------- */

export interface SeasonInsights {
  counts: Record<Season, number>;
  top: { season: Season; count: number }[];
  dated: number;
}

export function seasonInsights(books: Book[]): SeasonInsights {
  const counts: Record<Season, number> = { invierno: 0, primavera: 0, verano: 0, otoño: 0 };
  let dated = 0;
  for (const book of books) {
    if (!book.finishedMonth || book.finishedMonth < 1 || book.finishedMonth > 12) continue;
    counts[seasonOfMonth(book.finishedMonth)] += 1;
    dated += 1;
  }
  const max = Math.max(...Object.values(counts));
  const top = dated && max > 0 ? SEASONS.filter((season) => counts[season] === max).map((season) => ({ season, count: max })) : [];
  return { counts, top, dated };
}

/* ---------- Favoritos y notas ---------- */

export interface FavoriteInsights {
  favoriteAvgPages: number;
  restAvgPages: number;
}

/** Páginas medias de los favoritos frente al resto (necesita datos de ambos lados). */
export function favoriteInsights(books: Book[]): FavoriteInsights | null {
  const pagesOf = (list: Book[]) => list.filter((book) => (book.pageCount ?? 0) > 0).map((book) => book.pageCount ?? 0);
  const fav = average(pagesOf(books.filter((book) => book.favorite)));
  const rest = average(pagesOf(books.filter((book) => !book.favorite)));
  if (fav === null || rest === null) return null;
  return { favoriteAvgPages: Math.round(fav), restAvgPages: Math.round(rest) };
}

export function notesCount(books: Book[]) {
  return books.filter((book) => (book.notes ?? "").trim().length > 0).length;
}

/* ---------- Años (solo para el recap total) ---------- */

export interface YearTrend {
  /** Años consecutivos más largos con al menos un libro. */
  longestRun: { length: number; from: number; to: number };
  /** Año con mejor nota media (al menos 3 libros valorados). */
  bestRatedYear: { year: number; average: number } | null;
  /** Nota media del primer y del último año con valoraciones suficientes. */
  ratingTrend: { firstYear: number; first: number; lastYear: number; last: number } | null;
}

export function yearTrend(byYear: Map<number, Book[]>): YearTrend | null {
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (!years.length) return null;

  let best = { length: 1, from: years[0], to: years[0] };
  let run = { length: 1, from: years[0], to: years[0] };
  for (let index = 1; index < years.length; index += 1) {
    run = years[index] === years[index - 1] + 1
      ? { length: run.length + 1, from: run.from, to: years[index] }
      : { length: 1, from: years[index], to: years[index] };
    if (run.length > best.length) best = run;
  }

  const yearAverages = years
    .map((year) => {
      const ratings = (byYear.get(year) ?? []).filter((book) => book.rating !== null).map((book) => book.rating ?? 0);
      return { year, average: average(ratings), count: ratings.length };
    })
    .filter((item): item is { year: number; average: number; count: number } => item.average !== null && item.count >= 3);

  const bestRatedYear = yearAverages.length
    ? [...yearAverages].sort((a, b) => b.average - a.average || b.year - a.year)[0]
    : null;
  const ratingTrend = yearAverages.length >= 2
    ? {
      firstYear: yearAverages[0].year,
      first: yearAverages[0].average,
      lastYear: yearAverages[yearAverages.length - 1].year,
      last: yearAverages[yearAverages.length - 1].average,
    }
    : null;

  return {
    longestRun: best,
    bestRatedYear: bestRatedYear ? { year: bestRatedYear.year, average: bestRatedYear.average } : null,
    ratingTrend,
  };
}

/* ---------- Hábitos (historial de actividad) ---------- */

export interface StreakRange {
  length: number;
  from: string;
  to: string;
}

/** Racha más larga de días consecutivos, con sus fechas de inicio y fin. */
export function longestStreakRange(days: Iterable<string>): StreakRange | null {
  const unique = Array.from(new Set(days)).sort();
  if (!unique.length) return null;
  let best: StreakRange = { length: 1, from: unique[0], to: unique[0] };
  let run: StreakRange = best;
  for (let index = 1; index < unique.length; index += 1) {
    run = addDays(unique[index - 1], 1) === unique[index]
      ? { length: run.length + 1, from: run.from, to: unique[index] }
      : { length: 1, from: unique[index], to: unique[index] };
    if (run.length > best.length) best = run;
  }
  return best;
}

export interface FinishTime {
  bookId: string;
  /** Días naturales entre empezar y terminar, ambos incluidos (mínimo 1). */
  days: number;
  startedOn: string;
  finishedOn: string;
}

/**
 * Cuánto tardaste en terminar cada libro, a partir de los eventos «empezado» y «terminado»
 * del historial. Solo cuentan los libros con los dos eventos registrados.
 */
export function finishTimes(entries: ReadingLogEntry[]): FinishTime[] {
  const started = new Map<string, string>();
  const finished = new Map<string, string>();
  for (const entry of entries) {
    if (entry.events.includes("started")) {
      const current = started.get(entry.bookId);
      if (!current || entry.day < current) started.set(entry.bookId, entry.day);
    }
    if (entry.events.includes("finished")) {
      const current = finished.get(entry.bookId);
      if (!current || entry.day > current) finished.set(entry.bookId, entry.day);
    }
  }
  const result: FinishTime[] = [];
  for (const [bookId, startedOn] of started) {
    const finishedOn = finished.get(bookId);
    if (!finishedOn || finishedOn < startedOn) continue;
    result.push({ bookId, startedOn, finishedOn, days: daysBetween(startedOn, finishedOn) + 1 });
  }
  return result;
}

export function daysBetween(from: string, to: string) {
  const a = parseDay(from);
  const b = parseDay(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.date) - Date.UTC(a.year, a.month - 1, a.date)) / 86_400_000);
}

export interface HabitInsights {
  /** Días con actividad de algún libro o marcados a mano. */
  readDays: number;
  /** Día de la semana con más días de lectura. */
  topWeekday: { name: string; count: number } | null;
  /** Porcentaje de días de lectura que cayeron en sábado o domingo. */
  weekendShare: number | null;
  longestStreak: StreakRange | null;
  /** Mes (YYYY-MM) con más días de lectura. */
  topMonth: { month: string; days: number } | null;
  /** Día con más avance sumando todos los libros. */
  bestDay: { day: string; gain: number; books: number } | null;
  /** Mayor salto de un solo libro en un día. */
  biggestJump: { bookId: string; day: string; gain: number } | null;
}

/**
 * Hábitos a partir del historial. `entries` y `marks` deben llegar ya filtrados
 * al periodo que se quiere analizar (un año o todo).
 */
export function habitInsights(entries: ReadingLogEntry[], marks: string[]): HabitInsights {
  const days = new Set<string>([...entries.map((entry) => entry.day), ...marks]);

  const weekdayCounts = Array<number>(7).fill(0);
  const monthCounts = new Map<string, number>();
  for (const day of days) {
    weekdayCounts[weekdayMonday(day)] += 1;
    const month = day.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  const weekdayMax = Math.max(...weekdayCounts);
  const topWeekdayIndex = weekdayCounts.indexOf(weekdayMax);
  const weekend = weekdayCounts[5] + weekdayCounts[6];

  const monthRanking = [...monthCounts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]));

  const gainByDay = new Map<string, { gain: number; books: number }>();
  let biggestJump: HabitInsights["biggestJump"] = null;
  for (const entry of entries) {
    const gain = Math.max(0, progressDelta(entry));
    if (gain <= 0) continue;
    const current = gainByDay.get(entry.day) ?? { gain: 0, books: 0 };
    gainByDay.set(entry.day, { gain: current.gain + gain, books: current.books + 1 });
    if (!biggestJump || gain > biggestJump.gain) biggestJump = { bookId: entry.bookId, day: entry.day, gain };
  }
  const bestDayEntry = [...gainByDay.entries()].sort((a, b) => b[1].gain - a[1].gain || b[0].localeCompare(a[0]))[0];

  return {
    readDays: days.size,
    topWeekday: days.size ? { name: WEEKDAY_NAMES[topWeekdayIndex], count: weekdayMax } : null,
    weekendShare: days.size ? Math.round((weekend / days.size) * 100) : null,
    longestStreak: longestStreakRange(days),
    topMonth: monthRanking[0] ? { month: monthRanking[0][0], days: monthRanking[0][1] } : null,
    bestDay: bestDayEntry ? { day: bestDayEntry[0], gain: bestDayEntry[1].gain, books: bestDayEntry[1].books } : null,
    biggestJump,
  };
}

/* ---------- Biblioteca pendiente (solo para el recap total) ---------- */

export interface BacklogInsights {
  toRead: number;
  /** Libros pendientes con número de páginas. */
  pendingPages: number;
  reading: { book: Book; progress: number }[];
  /** El libro que más tiempo lleva esperando en «Quiero leer». */
  oldestWaiting: { book: Book; days: number } | null;
  /** Porcentaje de libros añadidos que ya están leídos. */
  readShare: number | null;
  read: number;
  total: number;
}

export function backlogInsights(allBooks: Book[], now: Date = new Date()): BacklogInsights {
  const toRead = allBooks.filter((book) => book.status === "to_read");
  const read = allBooks.filter((book) => book.status === "read");
  const reading = allBooks
    .filter((book) => book.status === "reading")
    .map((book) => ({ book, progress: book.progress }));

  let oldestWaiting: BacklogInsights["oldestWaiting"] = null;
  for (const book of toRead) {
    const added = new Date(book.addedAt).getTime();
    if (Number.isNaN(added)) continue;
    if (!oldestWaiting || added < new Date(oldestWaiting.book.addedAt).getTime()) {
      oldestWaiting = { book, days: Math.max(0, Math.floor((now.getTime() - added) / 86_400_000)) };
    }
  }

  return {
    toRead: toRead.length,
    pendingPages: toRead.reduce((sum, book) => sum + (book.pageCount ?? 0), 0),
    reading,
    oldestWaiting,
    readShare: allBooks.length ? Math.round((read.length / allBooks.length) * 100) : null,
    read: read.length,
    total: allBooks.length,
  };
}

/** Carpeta (colección) con más libros leídos. */
export function topCollection(readBooks: Book[], collections: Collection[]): { name: string; count: number } | null {
  const names = new Map(collections.map((collection) => [collection.$id, collection.name]));
  const counts = new Map<string, number>();
  for (const book of readBooks) {
    if (book.collectionId && names.has(book.collectionId)) {
      counts.set(book.collectionId, (counts.get(book.collectionId) ?? 0) + 1);
    }
  }
  const ranking = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranking.length) return null;
  return { name: names.get(ranking[0][0]) ?? "", count: ranking[0][1] };
}
