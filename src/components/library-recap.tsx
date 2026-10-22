"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ReadingYearsChart } from "@/components/library-charts";
import { YearFold } from "@/components/year-fold";
import { MAX_RATING } from "@/lib/rating";
import {
  PAGES_PER_HOUR,
  computeRecap,
  daysInPeriod,
  formatDays,
  formatHours,
  formatLongDuration,
  groupByYear,
  plural,
  type RecapStats,
} from "@/lib/recap";
import type { Book } from "@/types/book";

const RECAP_FOLD_KEY = "alejandria-open-recap-years-v1";

type Fact = { label: string; content: ReactNode };

function BookLink({ book }: { book: Book }) {
  return <Link href={`/libro/${book.$id}`}>{book.title}</Link>;
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
function commonFacts(stats: RecapStats): Fact[] {
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
        ? <>{author}<em> · {plural(total, "libro", "libros")} · {plural(stats.distinctAuthors, "autor distinto", "autores distintos")}</em></>
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

function yearFacts(year: number, stats: RecapStats, previous: { year: number; stats: RecapStats } | null): Fact[] {
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

  return [...facts, ...commonFacts(stats)];
}

function FactList({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <ul className="recap-facts">
      {facts.map((fact) => (
        <li key={fact.label}>
          <span>{fact.label}</span>
          <p>{fact.content}</p>
        </li>
      ))}
    </ul>
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

function YearRecap({ year, stats, previous }: { year: number | null; stats: RecapStats; previous: { year: number; stats: RecapStats } | null }) {
  const period = year ? daysInPeriod(year) : null;
  const extra = period
    ? { label: "Ritmo", value: `${Math.max(1, Math.round(period / stats.count))} días`, note: "por libro, de media" }
    : { label: "Autores", value: stats.distinctAuthors.toLocaleString("es"), note: "distintos" };
  const facts = year ? yearFacts(year, stats, previous) : commonFacts(stats);
  return (
    <div className="recap-panel">
      <StatCards stats={stats} extra={extra} />
      <FactList facts={facts} />
      {missingDataNote(stats)}
    </div>
  );
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
  }

  const common = commonFacts(stats);
  const withoutYearNote = withoutYear.length
    ? [{ label: "Sin año", content: <>{plural(withoutYear.length, "libro", "libros")}<em> · cuentan en el total, pero no en ningún año</em></> }]
    : [];

  return [...facts, ...common, ...withoutYearNote];
}

/**
 * Pestaña Recap: un desplegable por año de lectura y, debajo,
 * el recap de toda la vida lectora. Recibe solo los libros leídos.
 */
export function LibraryRecap({ books }: { books: Book[] }) {
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
                <YearRecap year={year} stats={stats} previous={previous} />
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
              <YearRecap year={null} stats={computeRecap(withoutYear)} previous={null} />
            </YearFold>
          )}
        </div>
      </section>

      <section className="recap-total" aria-labelledby="recap-total-title">
        <div className="recap-total-head">
          <p className="eyebrow">Toda tu vida lectora</p>
          <h2 id="recap-total-title">Recap total</h2>
        </div>
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
        {missingDataNote(total)}
      </section>
    </>
  );
}
