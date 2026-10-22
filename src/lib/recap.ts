import type { Book } from "@/types/book";

/**
 * Ritmo de lectura usado para estimar el tiempo leído a partir de las páginas.
 * ~40 páginas por hora (≈ 1,5 min por página) es un ritmo medio razonable;
 * cámbialo aquí si lees más rápido o más despacio.
 */
export const PAGES_PER_HOUR = 40;

export interface RecapStats {
  count: number;
  /** Páginas sumadas (solo libros con `pageCount`). */
  pages: number;
  /** Libros leídos que no tienen número de páginas registrado. */
  withoutPages: number;
  averageRating: number | null;
  ratedCount: number;
  favorites: number;
  hours: number;
  days: number;
  averagePages: number | null;
  longest: Book | null;
  shortest: Book | null;
  /** Libros con la nota más alta (puede haber empates). */
  best: Book[];
  bestRating: number | null;
  /** Libros con la nota más baja, solo si difiere de la más alta. */
  worst: Book[];
  worstRating: number | null;
  topAuthor: [string, number] | null;
  distinctAuthors: number;
  oldest: Book | null;
  topDecade: [number, number] | null;
}

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
export const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export interface MonthlyReading {
  /** Libros terminados en cada mes (índice 0 = enero). */
  counts: number[];
  /** Libros del periodo que no tienen mes y, por tanto, no entran en `counts`. */
  withoutMonth: number;
}

/** Libros terminados por mes. Recibe solo los libros del año que se quiere analizar. */
export function countByMonth(books: Book[]): MonthlyReading {
  const counts = Array<number>(12).fill(0);
  let withoutMonth = 0;
  for (const book of books) {
    if (book.finishedMonth && book.finishedMonth >= 1 && book.finishedMonth <= 12) counts[book.finishedMonth - 1] += 1;
    else withoutMonth += 1;
  }
  return { counts, withoutMonth };
}

export function readingHours(pages: number) {
  return pages / PAGES_PER_HOUR;
}

export function computeRecap(books: Book[]): RecapStats {
  const count = books.length;
  const withPages = books.filter((book) => (book.pageCount ?? 0) > 0);
  const pages = withPages.reduce((sum, book) => sum + (book.pageCount ?? 0), 0);
  const rated = books.filter((book) => book.rating !== null);
  const averageRating = rated.length
    ? rated.reduce((sum, book) => sum + (book.rating ?? 0), 0) / rated.length
    : null;
  const hours = readingHours(pages);

  const byPagesDesc = [...withPages].sort((a, b) => (b.pageCount ?? 0) - (a.pageCount ?? 0));
  const bestRating = rated.length ? Math.max(...rated.map((book) => book.rating ?? 0)) : null;
  const worstCandidate = rated.length ? Math.min(...rated.map((book) => book.rating ?? 0)) : null;
  const worstRating = worstCandidate !== null && worstCandidate !== bestRating ? worstCandidate : null;

  const authorCounts = books.flatMap((book) => book.authors).reduce<Record<string, number>>((counts, author) => {
    counts[author] = (counts[author] ?? 0) + 1;
    return counts;
  }, {});
  const authorRanking = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);

  const published = books.filter((book) => book.publishedYear);
  const oldest = published.length
    ? [...published].sort((a, b) => (a.publishedYear ?? 0) - (b.publishedYear ?? 0))[0]
    : null;
  const decadeCounts = published.reduce<Record<number, number>>((counts, book) => {
    const decade = Math.floor((book.publishedYear ?? 0) / 10) * 10;
    counts[decade] = (counts[decade] ?? 0) + 1;
    return counts;
  }, {});
  const decadeRanking = Object.entries(decadeCounts)
    .map(([decade, total]) => [Number(decade), total] as [number, number])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  return {
    count,
    pages,
    withoutPages: count - withPages.length,
    averageRating,
    ratedCount: rated.length,
    favorites: books.filter((book) => book.favorite).length,
    hours,
    days: hours / 24,
    averagePages: withPages.length ? Math.round(pages / withPages.length) : null,
    longest: byPagesDesc[0] ?? null,
    shortest: byPagesDesc.length > 1 ? byPagesDesc[byPagesDesc.length - 1] : null,
    best: bestRating === null ? [] : rated.filter((book) => book.rating === bestRating),
    bestRating,
    worst: worstRating === null ? [] : rated.filter((book) => book.rating === worstRating),
    worstRating,
    topAuthor: authorRanking[0] ?? null,
    distinctAuthors: authorRanking.length,
    oldest,
    topDecade: decadeRanking[0] ?? null,
  };
}

/** Agrupa libros por año de lectura. Los que no tienen año quedan aparte. */
export function groupByYear(books: Book[]) {
  const byYear = new Map<number, Book[]>();
  const withoutYear: Book[] = [];
  for (const book of books) {
    if (!book.finishedYear) {
      withoutYear.push(book);
      continue;
    }
    byYear.set(book.finishedYear, [...(byYear.get(book.finishedYear) ?? []), book]);
  }
  return { byYear, withoutYear };
}

/** Días transcurridos del año (completo si ya pasó; hasta hoy si es el actual). */
export function daysInPeriod(year: number, now = new Date()) {
  if (year === now.getFullYear()) {
    const start = new Date(year, 0, 1);
    return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? 366 : 365;
}

export function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString("es")} ${count === 1 ? one : many}`;
}

/** "42 h", "3,5 h"… */
export function formatHours(hours: number) {
  if (hours < 10) return `${hours.toLocaleString("es", { maximumFractionDigits: 1 })} h`;
  return `${Math.round(hours).toLocaleString("es")} h`;
}

/** Días enteros de lectura continua: "3,5 días", "1 día". */
export function formatDays(days: number) {
  if (days < 10) {
    const rounded = Math.round(days * 10) / 10;
    return `${rounded.toLocaleString("es")} ${rounded === 1 ? "día" : "días"}`;
  }
  return `${Math.round(days).toLocaleString("es")} días`;
}

/** Convierte un número de días en "1 año y 3 meses", "5 meses", "12 días"… */
export function formatLongDuration(days: number) {
  const rounded = Math.round(days);
  if (rounded < 60) return plural(rounded, "día", "días");
  const months = Math.round(rounded / 30.4);
  if (months < 12) return plural(months, "mes", "meses");
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const yearText = plural(years, "año", "años");
  return restMonths ? `${yearText} y ${plural(restMonths, "mes", "meses")}` : yearText;
}
