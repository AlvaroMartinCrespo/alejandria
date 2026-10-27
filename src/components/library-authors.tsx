"use client";

import { YearFold } from "@/components/year-fold";
import { countAuthors, groupByYear, plural } from "@/lib/recap";
import type { Book } from "@/types/book";

const AUTHORS_FOLD_KEY = "alejandria-open-author-years-v1";

function AuthorList({ authors }: { authors: [string, number][] }) {
  return (
    <ul className="author-list">
      {authors.map(([name, total]) => (
        <li key={name}>
          <span>{name}</span>
          <em>{plural(total, "libro", "libros")}</em>
        </li>
      ))}
    </ul>
  );
}

function yearCount(books: Book[], authors: [string, number][]) {
  return `${plural(authors.length, "autor", "autores")} · ${plural(books.length, "libro", "libros")}`;
}

/**
 * Pestaña Autores: un desplegable por año de lectura con los autores leídos
 * ese año y, debajo, todos los autores de la biblioteca. Recibe solo los libros leídos.
 */
export function LibraryAuthors({ books }: { books: Book[] }) {
  const all = countAuthors(books);

  if (!all.length) {
    return (
      <section className="favorites-panel">
        <div className="big-empty compact"><p>Cuando termines tus primeras lecturas, aquí aparecerán los autores que has leído.</p></div>
      </section>
    );
  }

  const { byYear, withoutYear } = groupByYear(books);
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const withoutYearAuthors = countAuthors(withoutYear);

  return (
    <>
      <section className="favorites-panel">
        <div className="section-title"><div><p className="eyebrow">Año a año</p><h2>Autores por año</h2></div></div>
        <div className="year-groups">
          {years.map((year) => {
            const list = byYear.get(year) ?? [];
            const authors = countAuthors(list);
            return (
              <YearFold key={year} storageKey={AUTHORS_FOLD_KEY} id={String(year)} title={String(year)} count={yearCount(list, authors)}>
                {authors.length
                  ? <AuthorList authors={authors} />
                  : <div className="big-empty compact"><p>Los libros de {year} no tienen autor registrado.</p></div>}
              </YearFold>
            );
          })}
          {withoutYear.length > 0 && (
            <YearFold storageKey={AUTHORS_FOLD_KEY} id="sin-anio" title="—" count={`Sin año · ${yearCount(withoutYear, withoutYearAuthors)}`}>
              {withoutYearAuthors.length
                ? <AuthorList authors={withoutYearAuthors} />
                : <div className="big-empty compact"><p>Estos libros no tienen autor registrado.</p></div>}
            </YearFold>
          )}
        </div>
      </section>

      <section className="favorites-panel">
        <div className="section-title">
          <div><p className="eyebrow">Toda tu vida lectora</p><h2>Autores en total</h2></div>
          <span className="section-count">{plural(all.length, "autor", "autores")}</span>
        </div>
        <AuthorList authors={all} />
      </section>
    </>
  );
}
