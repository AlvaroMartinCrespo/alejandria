"use client";

import Link from "next/link";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { STATUS_LABELS } from "@/lib/book-utils";
import type { BookStatus } from "@/types/book";

const GROUPS: BookStatus[] = ["reading", "to_read", "favorite", "read"];

export default function PrintableLibraryPage() {
  const { books, loading } = useLibrary();

  if (loading) return <LibrarySkeleton rows={5} />;

  return (
    <article className="print-library">
      <header className="print-header">
        <div><p className="eyebrow">Copia personal</p><h1>Alejandría</h1><p>Exportada el {new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date())}</p></div>
        <div className="print-actions"><Link href="/estadisticas" className="button secondary">← Volver</Link><button className="button primary" onClick={() => window.print()}>▤ Guardar PDF</button></div>
      </header>
      {GROUPS.map((status) => {
        const group = books
          .filter((book) => book.status === status)
          .sort((a, b) => status === "read"
            ? (b.finishedYear ?? 0) - (a.finishedYear ?? 0)
            : a.title.localeCompare(b.title, "es"));
        if (!group.length) return null;
        return (
          <section className="print-group" key={status}>
            <div className="print-group-title"><h2>{STATUS_LABELS[status]}</h2><span>{group.length}</span></div>
            <div className="print-table">
              {group.map((book) => (
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