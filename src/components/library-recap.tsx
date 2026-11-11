"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { ReadingYearsChart } from "@/components/library-charts";
import { useLibrary } from "@/components/library-provider";
import { YearFold, useFoldState } from "@/components/year-fold";
import { MAX_RATING } from "@/lib/rating";
import { parseDay } from "@/lib/reading-activity";
import {
  PAGES_PER_HOUR,
  authorHref,
  booksByAuthor,
  computeRecap,
  daysInPeriod,
  formatDays,
  formatHours,
  formatLongDuration,
  MONTH_NAMES,
  countByMonth,
  groupByYear,
  plural,
  type RecapStats,
} from "@/lib/recap";
import {
  authorInsights,
  backlogInsights,
  favoriteInsights,
  finishTimes,
  habitInsights,
  notesCount,
  pageInsights,
  publicationInsights,
  ratingInsights,
  seasonInsights,
  topCollection,
  yearTrend,
} from "@/lib/recap-insights";
import type { ReadingLogEntry } from "@/types/activity";
import type { Book, Collection } from "@/types/book";

const RECAP_FOLD_KEY = "alejandria-open-recap-years-v1";

type Fact = { label: string; content: ReactNode };

/** Datos de fuera de los libros leídos que enriquecen el recap (historial, pendientes, carpetas…). */
type RecapContext = {
  allBooks: Book[];
  collections: Collection[];
  activity: ReadingLogEntry[];
  marks: string[];
};

function BookLink({ book }: { book: Book }) {
  return <Link href={`/libro/${book.$id}`}>{book.title}</Link>;
}

/** Autor del recap: enlaza a su vista con todos los libros leídos. */
function AuthorLink({ author }: { author: string }) {
  return <Link href={authorHref(author)}>{author}</Link>;
}

/** Hasta tres libros del autor como enlaces; el resto se resume en «y N más» (que lleva a la vista del autor). */
function AuthorBooks({ author, books }: { author: string; books: Book[] }) {
  const MAX_SHOWN = 3;
  const shown = books.slice(0, MAX_SHOWN);
  const rest = books.length - shown.length;
  return (
    <>
      {shown.map((book, index) => (
        <span key={book.$id}>
          {index > 0 && ", "}
          <BookLink book={book} />
        </span>
      ))}
      {rest > 0 && <> y <Link href={authorHref(author)}>{plural(rest, "más", "más")}</Link></>}
    </>
  );
}

function pagesOf(book: Book) {
  return `${(book.pageCount ?? 0).toLocaleString("es")} págs.`;
}

function ratedBooks(books: Book[], rating: number | null) {
  if (!books.length || rating === null) return null;
  return (
    <>
      <BookLink book={books[0]} />
      {books.length > 1 && <em> y {plural(books.length - 1, "más", "más")}</em>}
      <em> · {rating}/{MAX_RATING}</em>
    </>
  );
}

/** Hechos curiosos comunes a un año y al total. */
function commonFacts(stats: RecapStats, books: Book[]): Fact[] {
  const facts: Fact[] = [];

  if (stats.longest) {
    facts.push({ label: "Más largo", content: <><BookLink book={stats.longest} /><em> · {pagesOf(stats.longest)}</em></> });
  }
  if (stats.shortest && stats.shortest.$id !== stats.longest?.$id) {
    facts.push({ label: "Más corto", content: <><BookLink book={stats.shortest} /><em> · {pagesOf(stats.shortest)}</em></> });
  }
  if (stats.best.length) {
    facts.push({ label: "Mejor valorado", content: ratedBooks(stats.best, stats.bestRating) });
  }
  if (stats.worst.length) {
    facts.push({ label: "El que menos gustó", content: ratedBooks(stats.worst, stats.worstRating) });
  }
  if (stats.topAuthor) {
    const [author, total] = stats.topAuthor;
    facts.push({
      label: "Autores",
      content: total > 1
        ? (
          <>
            <AuthorLink author={author} />
            <em> · {plural(total, "libro", "libros")}: </em>
            <AuthorBooks author={author} books={booksByAuthor(books, author)} />
            <em> · {plural(stats.distinctAuthors, "autor distinto", "autores distintos")}</em>
          </>
        )
        : <>{plural(stats.distinctAuthors, "autor distinto", "autores distintos")}<em> · ninguno repetido</em></>,
    });
  }
  if (stats.oldest?.publishedYear) {
    facts.push({
      label: "Más antiguo",
      content: <><BookLink book={stats.oldest} /><em> · publicado en {stats.oldest.publishedYear}</em></>,
    });
  }
  if (stats.topDecade && stats.topDecade[1] > 1) {
    facts.push({
      label: "Década favorita",
      content: <>{stats.topDecade[0]}s<em> · {plural(stats.topDecade[1], "libro publicado", "libros publicados")} en esa década</em></>,
    });
  }
  if (stats.favorites > 0 && stats.count > 0) {
    const percent = Math.round((stats.favorites / stats.count) * 100);
    facts.push({
      label: "Favoritos",
      content: <>{stats.favorites} de {stats.count}<em> · el {percent} % acabó entre tus imprescindibles</em></>,
    });
  }
  return facts;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «8 de noviembre» o, con año, «8 de noviembre de 2026». */
function longDate(day: string, withYear: boolean) {
  const { year, month, date } = parseDay(day);
  return `${date} de ${MONTH_NAMES[month - 1].toLowerCase()}${withYear ? ` de ${year}` : ""}`;
}

/** «Los lunes», «Los sábados»: solo sábado y domingo cambian al plural. */
function weekdayPlural(name: string) {
  return `Los ${name === "sábado" || name === "domingo" ? `${name}s` : name}`;
}

function formatStack(cm: number) {
  if (cm >= 100) return `${(cm / 100).toLocaleString("es", { maximumFractionDigits: 1 })} m`;
  return `${Math.round(cm).toLocaleString("es")} cm`;
}

const oneDecimal = (value: number) => value.toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Curiosidades sobre los propios libros: tamaño, notas, autores, antigüedad y estaciones. */
function curiosityFacts(books: Book[], stats: RecapStats, referenceYear: number): Fact[] {
  const facts: Fact[] = [];
  const pagesInfo = pageInsights(books);

  if (pagesInfo.median !== null && books.length >= 3) {
    const extras = [
      pagesInfo.thick > 0 ? `${plural(pagesInfo.thick, "libro", "libros")} de 500 págs. o más` : null,
      pagesInfo.thin > 0 ? `${plural(pagesInfo.thin, "libro", "libros")} de 200 o menos` : null,
    ].filter(Boolean);
    facts.push({
      label: "Libro típico",
      content: <>{pagesInfo.median.toLocaleString("es")} págs.<em> · la mediana{extras.length ? ` · ${extras.join(" · ")}` : ""}</em></>,
    });
  }
  if (pagesInfo.stackCm >= 5) {
    facts.push({
      label: "Apilados",
      content: <>Unos {formatStack(pagesInfo.stackCm)} de altura<em> · tus libros uno encima de otro (a ~1 cm por cada 150 págs.)</em></>,
    });
  }

  const ratings = ratingInsights(books);
  if (ratings.mode && ratings.rated >= 3) {
    const bits = [
      `${plural(ratings.notable, "libro", "libros")} con 8 o más`,
      ratings.perfect > 0 ? `${plural(ratings.perfect, "libro", "libros")} con un ${MAX_RATING}` : null,
    ].filter(Boolean);
    facts.push({
      label: "Nota más repetida",
      content: <>{ratings.mode.rating}/{MAX_RATING}<em> · {plural(ratings.mode.count, "vez", "veces")} · {bits.join(" · ")}</em></>,
    });
  }
  const vs = pagesInfo.lengthVsRating;
  if (vs && pagesInfo.median !== null) {
    const diff = vs.longAvg - vs.shortAvg;
    const verdict = Math.abs(diff) < 0.3 ? "Puntúas igual los largos y los cortos" : diff > 0 ? "Los libros largos te gustan más" : "Los libros cortos te gustan más";
    facts.push({
      label: "Largos y cortos",
      content: <>{verdict}<em> · {oneDecimal(vs.longAvg)} de media por encima de {pagesInfo.median.toLocaleString("es")} págs. frente a {oneDecimal(vs.shortAvg)} por debajo</em></>,
    });
  }

  const authors = authorInsights(books);
  if (authors.distinct >= 3 && authors.singles > 0) {
    facts.push({
      label: "Autores nuevos",
      content: <>{authors.singles} de {authors.distinct}<em> · autores de los que solo leíste un libro</em></>,
    });
  }
  if (authors.bestRated) {
    facts.push({
      label: "Autor mejor valorado",
      content: <><AuthorLink author={authors.bestRated.author} /><em> · {oneDecimal(authors.bestRated.average)}/{MAX_RATING} de media en {plural(authors.bestRated.count, "libro valorado", "libros valorados")}</em></>,
    });
  }

  const publication = publicationInsights(books, referenceYear);
  if (publication.newest?.publishedYear && publication.dated > 1 && publication.span) {
    facts.push({
      label: "Más reciente",
      content: <><BookLink book={publication.newest} /><em> · publicado en {publication.newest.publishedYear} · {plural(publication.span, "año", "años")} separan a tu libro más antiguo del más nuevo</em></>,
    });
  }
  if (publication.averageAge !== null && publication.dated >= 3) {
    const bits = [
      publication.classics > 0 ? `${plural(publication.classics, "libro", "libros")} con 50 años o más` : null,
      publication.fresh > 0 ? `${plural(publication.fresh, "libro", "libros")} recién publicados` : null,
    ].filter(Boolean);
    facts.push({
      label: "Edad al leerlos",
      content: <>{Math.round(publication.averageAge).toLocaleString("es")} años de media desde su publicación{bits.length > 0 && <em> · {bits.join(" · ")}</em>}</>,
    });
  }

  const seasons = seasonInsights(books);
  if (seasons.dated >= 4 && seasons.top.length > 0 && seasons.top.length < 4) {
    facts.push({
      label: seasons.top.length > 1 ? "Estaciones lectoras" : "Estación lectora",
      content: <>{joinNames(seasons.top.map((item) => capitalize(item.season)))}<em> · {plural(seasons.top[0].count, "libro terminado", "libros terminados")}{seasons.top.length > 1 ? " cada una" : ""} de {seasons.dated} con fecha</em></>,
    });
  }

  const fav = stats.favorites > 0 ? favoriteInsights(books) : null;
  if (fav) {
    facts.push({
      label: "Favoritos y páginas",
      content: <>Tus favoritos tienen {fav.favoriteAvgPages.toLocaleString("es")} págs. de media<em> · frente a {fav.restAvgPages.toLocaleString("es")} del resto</em></>,
    });
  }

  const notes = notesCount(books);
  if (notes > 0) {
    facts.push({ label: "Notas", content: <>{plural(notes, "libro", "libros")} con notas personales<em> · {Math.round((notes / books.length) * 100)} % de los leídos</em></> });
  }

  return facts;
}

/** Hábitos de lectura a partir del historial del calendario. Vacío si no hay actividad en el periodo. */
function habitFacts(books: Book[], entries: ReadingLogEntry[], marks: string[], year: number | null): Fact[] {
  const booksById = new Map(books.map((book) => [book.$id, book]));
  const habits = habitInsights(entries, marks);
  if (!habits.readDays) return [];
  const facts: Fact[] = [];
  const withYear = year === null;

  const period = year ? daysInPeriod(year) : null;
  facts.push({
    label: "Días leyendo",
    content: <>{plural(habits.readDays, "día", "días")}<em>{period ? ` · un ${Math.min(100, Math.round((habits.readDays / period) * 100))} % ${year === new Date().getFullYear() ? "del año hasta hoy" : "del año"}` : " con lectura registrada"}</em></>,
  });

  if (habits.topWeekday && habits.readDays >= 7) {
    facts.push({
      label: "Día favorito",
      content: <>{weekdayPlural(habits.topWeekday.name)}<em> · {plural(habits.topWeekday.count, "día", "días")} de lectura · {habits.weekendShare} % en fin de semana</em></>,
    });
  }
  if (habits.longestStreak && habits.longestStreak.length >= 2) {
    facts.push({
      label: "Mejor racha",
      content: <>{plural(habits.longestStreak.length, "día seguido", "días seguidos")}<em> · del {longDate(habits.longestStreak.from, withYear)} al {longDate(habits.longestStreak.to, withYear)}</em></>,
    });
  }
  if (habits.topMonth && habits.readDays >= 7) {
    const { year: monthYear, month } = parseDay(`${habits.topMonth.month}-01`);
    facts.push({
      label: "Mes con más lectura",
      content: <>{MONTH_NAMES[month - 1]}{withYear ? ` de ${monthYear}` : ""}<em> · {plural(habits.topMonth.days, "día", "días")} leyendo</em></>,
    });
  }
  if (habits.bestDay) {
    facts.push({
      label: "Mejor día",
      content: <>+{habits.bestDay.gain} % de avance<em> · el {longDate(habits.bestDay.day, withYear)}{habits.bestDay.books > 1 ? ` · repartido en ${habits.bestDay.books} libros` : ""}</em></>,
    });
  }
  const jumpBook = habits.biggestJump ? booksById.get(habits.biggestJump.bookId) : null;
  if (habits.biggestJump && jumpBook && habits.biggestJump.gain >= 20) {
    facts.push({
      label: "Mayor salto",
      content: <><BookLink book={jumpBook} /><em> · +{habits.biggestJump.gain} % en un solo día · el {longDate(habits.biggestJump.day, withYear)}</em></>,
    });
  }

  const times = finishTimes(entries)
    .filter((time) => booksById.has(time.bookId))
    // En un año solo cuentan los libros que se terminaron dentro de ese año.
    .filter((time) => year === null || parseDay(time.finishedOn).year === year)
    .sort((a, b) => a.days - b.days || a.startedOn.localeCompare(b.startedOn));
  if (times.length) {
    const fastest = times[0];
    const fastestBook = booksById.get(fastest.bookId);
    if (fastestBook) {
      facts.push({
        label: "Lectura más rápida",
        content: <><BookLink book={fastestBook} /><em> · {plural(fastest.days, "día", "días")} · del {longDate(fastest.startedOn, withYear)} al {longDate(fastest.finishedOn, withYear)}</em></>,
      });
    }
    const slowest = times[times.length - 1];
    const slowestBook = booksById.get(slowest.bookId);
    if (slowestBook && slowest.bookId !== fastest.bookId && slowest.days > fastest.days) {
      facts.push({
        label: "Lectura más lenta",
        content: <><BookLink book={slowestBook} /><em> · {plural(slowest.days, "día", "días")} · del {longDate(slowest.startedOn, withYear)} al {longDate(slowest.finishedOn, withYear)}</em></>,
      });
    }
    if (times.length >= 3) {
      const average = times.reduce((sum, time) => sum + time.days, 0) / times.length;
      facts.push({
        label: "Tiempo por libro",
        content: <>{formatLongDuration(average)} de media<em> · desde que lo empiezas hasta que lo terminas ({plural(times.length, "libro con fechas", "libros con fechas")})</em></>,
      });
    }
  }
  return facts;
}

/** Lo que aún queda por leer: pendientes, en curso, el que más espera y el estado de la biblioteca. */
function libraryFacts(context: RecapContext, readBooks: Book[], booksPerYear: number | null): Fact[] {
  const backlog = backlogInsights(context.allBooks);
  const facts: Fact[] = [];

  if (backlog.reading.length) {
    const shown = backlog.reading.slice(0, 3);
    facts.push({
      label: "Leyendo ahora",
      content: (
        <>
          {shown.map(({ book, progress }, index) => (
            <span key={book.$id}>{index > 0 && ", "}<BookLink book={book} /><em> · {progress} %</em></span>
          ))}
          {backlog.reading.length > shown.length && <em> · y {plural(backlog.reading.length - shown.length, "más", "más")}</em>}
        </>
      ),
    });
  }
  if (backlog.toRead > 0) {
    facts.push({
      label: "Por leer",
      content: (
        <>
          {plural(backlog.toRead, "libro pendiente", "libros pendientes")}
          {backlog.pendingPages > 0 && <em> · {backlog.pendingPages.toLocaleString("es")} páginas, unas {formatHours(backlog.pendingPages / PAGES_PER_HOUR)} de lectura</em>}
        </>
      ),
    });
    if (booksPerYear && booksPerYear > 0) {
      facts.push({
        label: "A tu ritmo",
        content: <>Vaciarías la lista en {formatLongDuration((backlog.toRead / booksPerYear) * 365)}<em> · a {booksPerYear.toLocaleString("es", { maximumFractionDigits: 1 })} libros al año y sin añadir ninguno más</em></>,
      });
    }
  }
  if (backlog.oldestWaiting && backlog.oldestWaiting.days >= 30) {
    facts.push({
      label: "El que más espera",
      content: <><BookLink book={backlog.oldestWaiting.book} /><em> · lleva {formatLongDuration(backlog.oldestWaiting.days)} en tu lista de pendientes</em></>,
    });
  }
  if (backlog.readShare !== null && backlog.total >= 5) {
    facts.push({
      label: "Biblioteca",
      content: <>{backlog.readShare} % ya leído<em> · {backlog.read.toLocaleString("es")} de {plural(backlog.total, "libro añadido", "libros añadidos")}</em></>,
    });
  }
  const collection = topCollection(readBooks, context.collections);
  if (collection && context.collections.length > 1) {
    facts.push({ label: "Carpeta favorita", content: <>{collection.name}<em> · {plural(collection.count, "libro leído", "libros leídos")}</em></> });
  }
  return facts;
}

function joinNames(names: string[]) {
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}` : names[0];
}

/** Meses con más y menos lecturas de un año. Para el año en curso solo cuentan los meses ya empezados. */
function monthFacts(year: number, books: Book[]): Fact[] {
  const { counts, withoutMonth } = countByMonth(books);
  const now = new Date();
  const lastMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const dated = counts.reduce((sum, count) => sum + count, 0);
  if (!dated) return [];

  const range = counts.slice(0, lastMonth).map((count, index) => ({ count, index }));
  const max = Math.max(...range.map((item) => item.count));
  const min = Math.min(...range.map((item) => item.count));
  const namesWith = (value: number) => range.filter((item) => item.count === value).map((item) => MONTH_NAMES[item.index]);
  const each = (names: string[], value: number) => `${plural(value, "libro", "libros")}${names.length > 1 ? " cada uno" : ""}`;

  const facts: Fact[] = [];
  const top = namesWith(max);
  facts.push({ label: top.length > 1 ? "Meses que más leíste" : "Mes que más leíste", content: <>{joinNames(top)}<em> · {each(top, max)}</em></> });
  if (min !== max) {
    const low = namesWith(min);
    facts.push({
      label: low.length > 1 ? "Meses que menos leíste" : "Mes que menos leíste",
      content: <>{joinNames(low)}<em> · {min === 0 ? "ningún libro" : each(low, min)}</em></>,
    });
  }
  if (withoutMonth > 0) {
    facts.push({ label: "Sin mes", content: <>{plural(withoutMonth, "libro", "libros")}<em> · cuentan en el año, pero no en ningún mes</em></> });
  }
  return facts;
}

function yearFacts(year: number, stats: RecapStats, previous: { year: number; stats: RecapStats } | null, books: Book[]): Fact[] {
  const period = daysInPeriod(year);
  const isCurrent = year === new Date().getFullYear();
  const facts: Fact[] = [];

  facts.push({
    label: "Ritmo",
    content: (
      <>
        Un libro cada {Math.max(1, Math.round(period / stats.count))} días
        {stats.pages > 0 && <em> · {(stats.pages / period).toLocaleString("es", { maximumFractionDigits: 1 })} páginas al día de media</em>}
        {isCurrent && <em> · hasta hoy</em>}
      </>
    ),
  });

  if (stats.hours >= 1) {
    const percent = Math.min(100, Math.round((stats.hours / period) * 100));
    facts.push({
      label: "Tiempo",
      content: <>Como leer 1 hora al día durante {plural(Math.round(stats.hours), "día", "días")}<em> · un {percent} % {isCurrent ? "del año hasta hoy" : "del año"}</em></>,
    });
  }

  if (previous) {
    const books = stats.count - previous.stats.count;
    const pages = stats.pages - previous.stats.pages;
    const bookText = books === 0 ? "Los mismos libros" : `${books > 0 ? "+" : "−"}${plural(Math.abs(books), "libro", "libros")}`;
    const pageText = pages === 0 ? "" : ` · ${pages > 0 ? "+" : "−"}${Math.abs(pages).toLocaleString("es")} páginas`;
    facts.push({
      label: `Frente a ${previous.year}`,
      content: <>{bookText}<em>{pageText}{isCurrent ? " (el año aún no ha terminado)" : ""}</em></>,
    });
  }

  return [...facts, ...monthFacts(year, books), ...commonFacts(stats, books)];
}

function FactList({ facts, title }: { facts: Fact[]; title?: string }) {
  if (!facts.length) return null;
  return (
    <>
      {title && <h3 className="recap-subtitle">{title}</h3>}
      <ul className="recap-facts">
        {facts.map((fact) => (
          <li key={fact.label}>
            <span>{fact.label}</span>
            <p>{fact.content}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

function StatCards({ stats, extra }: { stats: RecapStats; extra: { label: string; value: string; note: string } }) {
  return (
    <div className="recap-grid">
      <article><span>Libros leídos</span><strong>{stats.count.toLocaleString("es")}</strong><small>terminados</small></article>
      <article>
        <span>Páginas</span>
        <strong>{stats.pages.toLocaleString("es")}</strong>
        <small>{stats.averagePages ? `~${stats.averagePages.toLocaleString("es")} por libro` : "sin datos"}</small>
      </article>
      <article>
        <span>Nota media</span>
        <strong>{stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—"}</strong>
        <small>{stats.ratedCount ? `${plural(stats.ratedCount, "valorado", "valorados")} · sobre ${MAX_RATING}` : "sin valoraciones"}</small>
      </article>
      <article><span>Favoritos</span><strong>{stats.favorites.toLocaleString("es")}</strong><small>imprescindibles</small></article>
      <article>
        <span>Tiempo leyendo</span>
        <strong>{stats.pages > 0 ? formatHours(stats.hours) : "—"}</strong>
        <small>{stats.pages > 0 ? `≈ ${formatDays(stats.days)} seguidos sin parar` : "sin páginas registradas"}</small>
      </article>
      <article><span>{extra.label}</span><strong>{extra.value}</strong><small>{extra.note}</small></article>
    </div>
  );
}

function missingDataNote(stats: RecapStats) {
  if (!stats.withoutPages) return null;
  return (
    <p className="recap-note">
      {plural(stats.withoutPages, "libro no tiene", "libros no tienen")} el número de páginas registrado, así que no cuenta{stats.withoutPages === 1 ? "" : "n"} en páginas ni en tiempo.
    </p>
  );
}

function YearRecap({ year, books, stats, previous, context }: { year: number | null; books: Book[]; stats: RecapStats; previous: { year: number; stats: RecapStats } | null; context: RecapContext }) {
  const period = year ? daysInPeriod(year) : null;
  const extra = period
    ? { label: "Ritmo", value: `${Math.max(1, Math.round(period / stats.count))} días`, note: "por libro, de media" }
    : { label: "Autores", value: stats.distinctAuthors.toLocaleString("es"), note: "distintos" };
  const facts = year ? yearFacts(year, stats, previous, books) : commonFacts(stats, books);
  const inYear = (day: string) => year !== null && day.startsWith(`${year}-`);
  // Sin año no hay periodo al que atribuir la actividad del calendario.
  const habits = year
    ? habitFacts(books, context.activity.filter((entry) => inYear(entry.day)), context.marks.filter(inYear), year)
    : [];
  return (
    <div className="recap-panel">
      <StatCards stats={stats} extra={extra} />
      <FactList facts={facts} />
      <FactList title="Curiosidades" facts={curiosityFacts(books, stats, year ?? new Date().getFullYear())} />
      <FactList title="Hábitos de lectura" facts={habits} />
      {missingDataNote(stats)}
    </div>
  );
}

/** Libros al año de media entre los años con lecturas (la misma cuenta que «Trayectoria»). */
function booksPerYear(books: Book[]) {
  const { byYear } = groupByYear(books);
  if (!byYear.size) return null;
  const dated = [...byYear.values()].reduce((sum, list) => sum + list.length, 0);
  return dated / byYear.size;
}

function totalFacts(books: Book[], stats: RecapStats): Fact[] {
  const { byYear, withoutYear } = groupByYear(books);
  const facts: Fact[] = [];

  if (stats.hours >= 1) {
    facts.push({
      label: "Tiempo",
      content: (
        <>
          Como leer 1 hora al día durante {formatLongDuration(stats.hours)}
          <em> · o {formatDays(stats.days)} seguidos sin parar (a {PAGES_PER_HOUR} págs./hora)</em>
        </>
      ),
    });
  }

  if (byYear.size) {
    const years = [...byYear.keys()].sort((a, b) => a - b);
    const datedCount = years.reduce((sum, year) => sum + (byYear.get(year)?.length ?? 0), 0);
    const perYear = datedCount / years.length;
    facts.push({
      label: "Trayectoria",
      content: (
        <>
          Desde {years[0]}<em> · {plural(years.length, "año", "años")} con lecturas · {perYear.toLocaleString("es", { maximumFractionDigits: 1 })} libros al año de media</em>
        </>
      ),
    });

    const yearStats = years.map((year) => ({ year, books: byYear.get(year)?.length ?? 0, pages: computeRecap(byYear.get(year) ?? []).pages }));
    const bestByBooks = [...yearStats].sort((a, b) => b.books - a.books || b.pages - a.pages || b.year - a.year)[0];
    facts.push({
      label: "Mejor año",
      content: <>{bestByBooks.year}<em> · {plural(bestByBooks.books, "libro", "libros")} · {bestByBooks.pages.toLocaleString("es")} páginas</em></>,
    });
    const bestByPages = [...yearStats].sort((a, b) => b.pages - a.pages || b.year - a.year)[0];
    if (bestByPages.pages > 0 && bestByPages.year !== bestByBooks.year) {
      facts.push({
        label: "Año con más páginas",
        content: <>{bestByPages.year}<em> · {bestByPages.pages.toLocaleString("es")} páginas en {plural(bestByPages.books, "libro", "libros")}</em></>,
      });
    }

    const trend = yearTrend(byYear);
    if (trend && trend.longestRun.length >= 2) {
      facts.push({
        label: "Racha de años",
        content: <>{plural(trend.longestRun.length, "año seguido", "años seguidos")} leyendo<em> · de {trend.longestRun.from} a {trend.longestRun.to}</em></>,
      });
    }
    if (trend?.bestRatedYear) {
      facts.push({
        label: "Año mejor valorado",
        content: <>{trend.bestRatedYear.year}<em> · nota media de {oneDecimal(trend.bestRatedYear.average)}/{MAX_RATING}</em></>,
      });
    }
    if (trend?.ratingTrend) {
      const { first, last, firstYear, lastYear } = trend.ratingTrend;
      const diff = last - first;
      facts.push({
        label: "Tu nota con los años",
        content: <>{Math.abs(diff) < 0.2 ? "Tu nota media apenas cambia" : diff > 0 ? "Cada vez puntúas más alto" : "Cada vez eres más exigente"}<em> · {oneDecimal(first)} en {firstYear} → {oneDecimal(last)} en {lastYear}</em></>,
      });
    }

    if (years.length >= 2) {
      const { counts } = countByMonth(books);
      const max = Math.max(...counts);
      if (max >= 3 && counts.filter((count) => count === max).length === 1) {
        facts.push({
          label: "Mes del año",
          content: <>{MONTH_NAMES[counts.indexOf(max)]}<em> · {plural(max, "libro terminado", "libros terminados")} en ese mes sumando todos los años</em></>,
        });
      }
    }
  }

  const common = commonFacts(stats, books);
  const withoutYearNote = withoutYear.length
    ? [{ label: "Sin año", content: <>{plural(withoutYear.length, "libro", "libros")}<em> · cuentan en el total, pero no en ningún año</em></> }]
    : [];

  return [...facts, ...common, ...withoutYearNote];
}

/** Recap total: desplegable (cerrado por defecto) con la cabecera destacada en verde. */
function TotalRecap({
  total,
  books,
  yearData,
  context,
}: {
  total: RecapStats;
  books: Book[];
  yearData: { year: number; count: number }[];
  context: RecapContext;
}) {
  const { open, setOpen } = useFoldState(RECAP_FOLD_KEY, "total");
  return (
    <details
      className="recap-total"
      open={open}
      onToggle={(event) => {
        const next = (event.currentTarget as HTMLDetailsElement).open;
        if (next !== open) setOpen(next);
      }}
    >
      <summary className="recap-total-head">
        <div>
          <p className="eyebrow">Toda tu vida lectora</p>
          <h2 id="recap-total-title">Recap total</h2>
        </div>
        <ChevronDown className="year-chevron" size={20} aria-hidden="true" />
      </summary>
      <div className="recap-total-body">
        <StatCards
          stats={total}
          extra={{ label: "Autores", value: total.distinctAuthors.toLocaleString("es"), note: "distintos" }}
        />
        {yearData.length > 1 && (
          <div className="recap-chart">
            <p className="eyebrow">Ritmo de lectura</p>
            <ReadingYearsChart data={yearData} />
          </div>
        )}
        <FactList facts={totalFacts(books, total)} />
        <FactList title="Curiosidades" facts={curiosityFacts(books, total, new Date().getFullYear())} />
        <FactList title="Hábitos de lectura" facts={habitFacts(books, context.activity, context.marks, null)} />
        <FactList title="Lo que viene" facts={libraryFacts(context, books, booksPerYear(books))} />
        {missingDataNote(total)}
      </div>
    </details>
  );
}

/**
 * Pestaña Recap: un desplegable por año de lectura y, debajo,
 * el recap de toda la vida lectora. Recibe solo los libros leídos.
 */
export function LibraryRecap({ books }: { books: Book[] }) {
  const { books: allBooks, collections, activity, markedDays } = useLibrary();
  // Solo cuenta la actividad de libros que siguen existiendo.
  const existingIds = new Set(allBooks.map((book) => book.$id));
  const context: RecapContext = {
    allBooks,
    collections,
    activity: activity.filter((entry) => existingIds.has(entry.bookId)),
    marks: markedDays,
  };

  if (!books.length) {
    return (
      <section className="favorites-panel">
        <div className="big-empty compact"><p>Cuando termines tus primeras lecturas, aquí aparecerá el recap de cada año.</p></div>
      </section>
    );
  }

  const { byYear, withoutYear } = groupByYear(books);
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const total = computeRecap(books);
  const yearData = [...years].reverse().map((year) => ({ year, count: byYear.get(year)?.length ?? 0 }));

  return (
    <>
      <section className="favorites-panel">
        <div className="section-title"><div><p className="eyebrow">Año a año</p><h2>Recap por año</h2></div></div>
        <div className="year-groups">
          {years.map((year) => {
            const list = byYear.get(year) ?? [];
            const stats = computeRecap(list);
            const previousYear = years.find((candidate) => candidate < year);
            const previous = previousYear ? { year: previousYear, stats: computeRecap(byYear.get(previousYear) ?? []) } : null;
            return (
              <YearFold
                key={year}
                storageKey={RECAP_FOLD_KEY}
                id={String(year)}
                title={String(year)}
                count={`${plural(stats.count, "libro", "libros")} · ${stats.pages.toLocaleString("es")} págs.`}
              >
                <YearRecap year={year} books={list} stats={stats} previous={previous} context={context} />
              </YearFold>
            );
          })}
          {withoutYear.length > 0 && (
            <YearFold
              storageKey={RECAP_FOLD_KEY}
              id="sin-anio"
              title="—"
              count={`Sin año · ${plural(withoutYear.length, "libro", "libros")}`}
            >
              <YearRecap year={null} books={withoutYear} stats={computeRecap(withoutYear)} previous={null} context={context} />
            </YearFold>
          )}
        </div>
      </section>

      <TotalRecap
        total={total}
        books={books}
        yearData={yearData}
        context={context}
      />
    </>
  );
}
