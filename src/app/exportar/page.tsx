"use client";

import Link from "next/link";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { STATUS_LABELS } from "@/lib/book-utils";
import type { BookStatus } from "@/types/book";

const GROUPS: BookStatus[] = ["reading", "to_read", "read"];

export default function PrintableLibraryPage() {
  const { books, loading } = useLibrary();
  const groups = [
    ...GROUPS.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      books: books
        .filter((book) => book.status === status)
        .sort((a, b) => status === "read"
          ? (b.finishedYear ?? 0) - (a.finishedYear ?? 0)
          : a.title.localeCompare(b.title, "es")),
    })),
    {
      key: "favorite",
      label: "Favoritos",
      books: books.filter((book) => book.favorite).sort((a, b) => a.title.localeCompare(b.title, "es")),
    },
  ];

  if (loading) return <LibrarySkeleton rows={5} />;

  return (
    <article className="print-library">
      <header className="print-header">
        <div><p className="eyebrow">Copia personal</p><h1>Alejandría</h1><p>Exportada el {new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date())}</p></div>
        <div className="print-actions"><Link href="/estadisticas" className="button secondary">← Volver</Link><button className="button primary" onClick={() => window.print()}>▤ Guardar PDF</button></div>
      </header>
      {groups.map((group) => {
        if (!group.books.length) return null;
        return (
          <section className="print-group" key={group.key}>
            <div className="print-group-title"><h2>{group.label}</h2><span>{group.books.length}</span></div>
            <div className="print-table">
              {group.books.map((book) => (
                <div className="print-row" key={book.$id}>
                  <strong>{book.title}</strong>
                  <span>{book.authors.join(", ") || "Autor desconocido"}</span>
                  <span>{book.finishedYear ?? book.publishedYear ?? "—"}</span>
                  <span>{book.rating === null ? "Sin puntuar" : `${book.rating} / 5`}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!books.length && <div className="big-empty"><p>La biblioteca todavía está vacía.</p></div>}
    </article>
  );
}