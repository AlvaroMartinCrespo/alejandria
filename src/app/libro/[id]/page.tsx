"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { STATUS_LABELS } from "@/lib/book-utils";
import type { BookStatus } from "@/types/book";

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { books, loading, updateBook, setStatus, removeBook } = useLibrary();
  const [saved, setSaved] = useState(false);
  const book = books.find((item) => item.$id === id);

  if (loading) return <LibrarySkeleton rows={2} />;
  if (!book) return <div className="big-empty"><strong>Este libro no está en tu biblioteca.</strong><button className="button secondary" onClick={() => router.push("/")}>Volver al inicio</button></div>;

  async function save(changes: Parameters<typeof updateBook>[1]) {
    await updateBook(book!.$id, changes);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <button className="back-button" onClick={() => router.back()}>← Volver</button>
      <section className="detail-hero">
        <div className="detail-cover"><BookCover title={book.title} url={book.coverUrl} priority /></div>
        <div className="detail-title">
          <span className={`status-chip ${book.status}`}>{STATUS_LABELS[book.status]}</span>
          <h1>{book.title}</h1>
          <p>{book.authors.join(", ")}</p>
          <div className="status-actions">
            {(Object.entries(STATUS_LABELS) as [BookStatus, string][]).filter(([status]) => status !== book.status).map(([status, label]) => (
              <button key={status} className="button secondary compact" onClick={() => void setStatus(book.$id, status)}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="detail-facts">
        <div><span>Publicado</span><strong>{book.publishedYear ?? "—"}</strong></div>
        <div><span>Extensión</span><strong>{book.pageCount ? `${book.pageCount} páginas` : "—"}</strong></div>
        <div className="rating-fact"><span>Tu puntuación</span><div>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} className={(book.rating ?? 0) >= rating ? "selected" : ""} onClick={() => void save({ rating })} aria-label={`${rating} estrellas`}>★</button>)}</div></div>
        {(book.status === "read" || book.status === "favorite") && <label><span>Terminado en</span><input type="number" min="1900" max="2100" value={book.finishedYear ?? new Date().getFullYear()} onChange={(event) => void save({ finishedYear: Number(event.target.value) })} /></label>}
      </section>

      <div className="detail-columns">
        <details className="synopsis" open><summary><h2>Sinopsis</h2><span>⌄</span></summary><p>{book.synopsis || "Este libro no tiene una sinopsis disponible."}</p></details>
        <section className="notes-section"><div><h2>Notas personales</h2>{saved && <span>Guardado</span>}</div><textarea value={book.notes ?? ""} onChange={(event) => void updateBook(book.$id, { notes: event.target.value })} placeholder="Ideas, citas o impresiones de esta lectura..." /></section>
      </div>

      <section className="danger-zone"><div><strong>Eliminar de la biblioteca</strong><p>Esta acción no se puede deshacer.</p></div><button className="danger-button" onClick={async () => { if (window.confirm(`¿Eliminar “${book.title}”?`)) { await removeBook(book.$id); router.push("/"); } }}>Eliminar libro</button></section>
    </>
  );
}