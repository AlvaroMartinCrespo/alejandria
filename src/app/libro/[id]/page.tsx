"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { SaveIndicator, useAutosave, useSaveStatus, type SaveStatus } from "@/components/save-status";
import { STATUS_LABELS } from "@/lib/book-utils";
import { RATING_VALUES } from "@/lib/rating";
import { MONTH_NAMES } from "@/lib/recap";
import type { BookStatus } from "@/types/book";

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { books, editing, loading, updateBook, setStatus, toggleFavorite, removeBook } = useLibrary();
  const status = useSaveStatus();
  const book = books.find((item) => item.$id === id);

  if (loading) return <LibrarySkeleton rows={2} />;
  if (!book) return <div className="big-empty"><strong>Este libro no está en tu biblioteca.</strong><button className="button secondary" onClick={() => router.push("/")}>Volver al inicio</button></div>;

  /** Guarda un campo mostrando Actualizando… → Actualizado junto a él. */
  function save(key: string, changes: Parameters<typeof updateBook>[1]) {
    return status.track(key, () => updateBook(book!.$id, changes));
  }

  function saveStatus(next: BookStatus) {
    return status.track("status", () => setStatus(book!.$id, next));
  }

  return (
    <>
      <button className="back-button" onClick={() => router.back()}>← Volver</button>
      <section className="detail-hero">
        <div className="detail-cover"><BookCover title={book.title} url={book.coverUrl} priority /></div>
        <div className="detail-title">
          <div className="detail-chips">
            <span className={`status-chip ${book.status}`}>{STATUS_LABELS[book.status]}</span>
            {book.favorite && <span className="status-chip favorite">Favorito</span>}
          </div>
          <h1>{book.title}</h1>
          <label className="author-editor">
            <span>Autor <SaveIndicator state={status.stateOf("authors")} /></span>
            <input
              key={book.authors.join(",")}
              defaultValue={book.authors.join(", ")}
              disabled={!editing}
              placeholder="Nombre del autor"
              onBlur={(event) => {
                const authors = event.target.value.split(",").map((author) => author.trim()).filter(Boolean);
                if (authors.join(", ") !== book.authors.join(", ")) void save("authors", { authors });
              }}
            />
          </label>
          <div className="status-actions">
            {(Object.entries(STATUS_LABELS) as [BookStatus, string][]).filter(([value]) => value !== book.status).map(([next, label]) => (
              <button key={next} className="button secondary compact" disabled={!editing} onClick={() => void saveStatus(next)}>{label}</button>
            ))}
            <button className={`button secondary compact favorite-toggle${book.favorite ? " active" : ""}`} disabled={!editing} onClick={() => void status.track("favorite", () => toggleFavorite(book.$id))}>
              <span aria-hidden="true">{book.favorite ? "★" : "☆"}</span>{book.favorite ? "Quitar favorito" : "Favorito"}
            </button>
            <SaveIndicator state={status.stateOf("favorite")} />
            <SaveIndicator state={status.stateOf("status")} />
          </div>
        </div>
      </section>

      <section className="detail-facts">
        <NumberField key={`year-${book.$id}`} label="Publicado" placeholder="Año" min={0} max={3000} value={book.publishedYear} disabled={!editing} status={status} fieldKey="publishedYear" onCommit={(value) => updateBook(book.$id, { publishedYear: value })} />
        <NumberField key={`pages-${book.$id}`} label="Extensión" placeholder="Páginas" min={0} max={100000} value={book.pageCount} disabled={!editing} status={status} fieldKey="pageCount" onCommit={(value) => updateBook(book.$id, { pageCount: value })} />
        <div className="rating-fact"><span>Tu puntuación <SaveIndicator state={status.stateOf("rating")} /></span><div>{RATING_VALUES.map((rating) => <button key={rating} disabled={!editing} className={(book.rating ?? 0) >= rating ? "selected" : ""} onClick={() => void save("rating", { rating })} aria-label={`${rating} estrellas`}>★</button>)}</div></div>
        {book.status === "read" && (
          <div className="finished-fact">
            <span>Terminado en <SaveIndicator state={status.stateOf("finishedYear")} /><SaveIndicator state={status.stateOf("finishedMonth")} /></span>
            <div className="finished-inputs">
              <NumberField key={`finished-${book.$id}`} bare label="Año de finalización" min={1900} max={2100} value={book.finishedYear ?? new Date().getFullYear()} disabled={!editing} status={status} fieldKey="finishedYear" required onCommit={(value) => updateBook(book.$id, { finishedYear: value })} />
              <select aria-label="Mes de finalización" disabled={!editing} value={book.finishedMonth ?? ""} onChange={(event) => void save("finishedMonth", { finishedMonth: event.target.value ? Number(event.target.value) : null })}><option value="">Mes</option>{MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select>
            </div>
          </div>
        )}
      </section>

      <div className="detail-columns">
        <details className="synopsis" open><summary><h2>Sinopsis</h2><span>⌄</span></summary><p>{book.synopsis || "Este libro no tiene una sinopsis disponible."}</p></details>
        <section className="notes-section">
          <div><h2>Notas personales</h2><SaveIndicator state={status.stateOf("notes")} /></div>
          <NotesField key={`notes-${book.$id}`} value={book.notes ?? ""} disabled={!editing} status={status} onCommit={(notes) => updateBook(book.$id, { notes })} />
        </section>
      </div>

      <section className="danger-zone"><div><strong>Eliminar de la biblioteca</strong><p>Esta acción no se puede deshacer.</p></div><button disabled={!editing} className="danger-button" onClick={async () => { if (window.confirm(`¿Eliminar “${book.title}”?`)) { await removeBook(book.$id); router.push("/"); } }}>Eliminar libro</button></section>
    </>
  );
}

function NumberField({
  label, placeholder, min, max, value, disabled, status, fieldKey, onCommit, bare = false, required = false,
}: {
  label: string;
  placeholder?: string;
  min: number;
  max: number;
  value: number | null | undefined;
  disabled: boolean;
  status: SaveStatus;
  fieldKey: string;
  onCommit: (value: number | null) => Promise<void>;
  bare?: boolean;
  required?: boolean;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const autosave = useAutosave<number | null>(fieldKey, status, onCommit);

  const input = (
    <input
      type="number"
      min={min}
      max={max}
      placeholder={placeholder}
      aria-label={bare ? label : undefined}
      value={draft}
      disabled={disabled}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        if (raw === "") {
          // Un campo obligatorio vacío no se envía mientras se escribe.
          if (!required) autosave.schedule(null);
          return;
        }
        const number = Number(raw);
        if (Number.isInteger(number) && number >= min && number <= max) autosave.schedule(number);
      }}
      onBlur={autosave.flush}
    />
  );
  if (bare) return input;
  return (
    <label>
      <span>{label} <SaveIndicator state={status.stateOf(fieldKey)} /></span>
      {input}
    </label>
  );
}

function NotesField({
  value, disabled, status, onCommit,
}: {
  value: string;
  disabled: boolean;
  status: SaveStatus;
  onCommit: (notes: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const autosave = useAutosave<string>("notes", status, onCommit, 900);
  return (
    <textarea
      disabled={disabled}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        autosave.schedule(event.target.value);
      }}
      onBlur={autosave.flush}
      placeholder="Ideas, citas o impresiones de esta lectura..."
    />
  );
}
