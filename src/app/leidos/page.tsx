"use client";

import { useDeferredValue, useState } from "react";
import { BookRow } from "@/components/book-row";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";

type Sort = "recent" | "rating" | "author";

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
        <div className="year-groups">
          {years.map((year) => {
            const list = booksForYear(year);
            const favorites = list.filter((book) => book.favorite).length;
            return (
              <details className="year-fold" key={year} open={searching}>
                <summary>
                  <strong>{year}</strong>
                  <span className="year-count">{list.length} libro{list.length === 1 ? "" : "s"}</span>
                  <span className="year-chevron" aria-hidden="true">⌄</span>
                </summary>
                <div className="year-fold-body">
                  <div>{list.map((book) => <BookRow key={book.$id} book={book} />)}</div>
                  <div className="year-fold-totals">
                    <span>Total leídos<strong>{list.length}</strong></span>
                    <span className="fav">Favoritos<strong>{favorites}</strong></span>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      ) : <div className="big-empty"><strong>Aún no hay libros en este archivo.</strong><p>Marca una lectura como “Leído” y aparecerá agrupada por año.</p></div>}
    </>
  );
}