"use client";

import { useDeferredValue, useState } from "react";
import { BookRow } from "@/components/book-row";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { YearFold } from "@/components/year-fold";

type Sort = "recent" | "rating" | "author";

const FOLD_STORAGE_KEY = "alejandria-open-read-years-v1";

export default function ReadBooksPage() {
  const { books, loading } = useLibrary();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const deferredQuery = useDeferredValue(query.toLocaleLowerCase("es"));
  const filtered = books
    .filter((book) => book.status === "read")
    .filter((book) => `${book.title} ${book.authors.join(" ")}`.toLocaleLowerCase("es").includes(deferredQuery));
  const years = Array.from(new Set(filtered.map((book) => book.finishedYear ?? new Date().getFullYear())))
    .sort((a, b) => b - a);
  // Resumen global: no depende de la búsqueda.
  const allRead = books.filter((book) => book.status === "read");
  const summary = Array.from(new Set(allRead.map((book) => book.finishedYear ?? new Date().getFullYear())))
    .sort((a, b) => b - a)
    .map((year) => {
      const inYear = allRead.filter((book) => (book.finishedYear ?? new Date().getFullYear()) === year);
      return { year, read: inYear.length, favorites: inYear.filter((book) => book.favorite).length };
    });
  const totalRead = allRead.length;
  const totalFavorites = allRead.filter((book) => book.favorite).length;
  // Con una búsqueda activa se abren los años para que se vean las coincidencias.
  const searching = deferredQuery.trim().length > 0;

  function booksForYear(year: number) {
    return filtered
      .filter((book) => (book.finishedYear ?? new Date().getFullYear()) === year)
      .sort((a, b) => {
        if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sort === "author") return (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "", "es");
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      });
  }

  return (
    <>
      <section className="page-heading archive-heading">
        <div><p className="eyebrow">Archivo personal</p><h1>Libros leídos</h1></div>
        <p className="heading-note">{filtered.length} historias terminadas y contando.</p>
      </section>
      <div className="filter-bar">
        <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título o autor" /></label>
        <label className="sort-field"><span>Ordenar</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="recent">Más recientes</option><option value="rating">Puntuación</option><option value="author">Autor</option></select></label>
      </div>
      {loading ? <LibrarySkeleton rows={4} /> : years.length ? (
        <>
          <div className="year-groups">
            {years.map((year) => {
              const list = booksForYear(year);
              return (
                <YearFold
                  key={year}
                  storageKey={FOLD_STORAGE_KEY}
                  id={String(year)}
                  title={String(year)}
                  count={`${list.length} libro${list.length === 1 ? "" : "s"}`}
                  forceOpen={searching}
                >
                  {list.map((book) => <BookRow key={book.$id} book={book} />)}
                </YearFold>
              );
            })}
          </div>
          <section className="reading-summary" aria-label="Resumen de lecturas">
            <div className="section-title"><div><p className="eyebrow">En números</p><h2>Resumen</h2></div></div>
            <div className="reading-summary-table">
              <div className="reading-summary-row head"><span>Año</span><span>Leídos</span><span>Favoritos</span></div>
              {summary.map((row) => (
                <div className="reading-summary-row" key={row.year}>
                  <strong>{row.year}</strong><span>{row.read}</span><span className="fav">{row.favorites}</span>
                </div>
              ))}
              <div className="reading-summary-row total">
                <strong>Total</strong><span>{totalRead}</span><span className="fav">{totalFavorites}</span>
              </div>
            </div>
          </section>
        </>
      ) : <div className="big-empty"><strong>Aún no hay libros en este archivo.</strong><p>Marca una lectura como “Leído” y aparecerá agrupada por año.</p></div>}
    </>
  );
}