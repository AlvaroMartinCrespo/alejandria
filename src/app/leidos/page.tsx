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
          {years.map((year) => (
            <section className="year-group" key={year}>
              <div className="year-marker"><strong>{year}</strong><span>{booksForYear(year).length} libros</span></div>
              <div>{booksForYear(year).map((book) => <BookRow key={book.$id} book={book} />)}</div>
            </section>
          ))}
        </div>
      ) : <div className="big-empty"><strong>Aún no hay libros en este archivo.</strong><p>Marca una lectura como “Leído” y aparecerá agrupada por año.</p></div>}
    </>
  );
}