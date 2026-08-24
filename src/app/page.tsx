"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { BookRow } from "@/components/book-row";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";

export default function Home() {
  const { books, loading, updateBook, setStatus, reorderToRead } = useLibrary();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [surpriseId, setSurpriseId] = useState<string | null>(null);
  const reading = books.find((book) => book.status === "reading");
  const toRead = books
    .filter((book) => book.status === "to_read")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const favorites = books.filter((book) => book.status === "favorite");
  const read = books.filter((book) => book.status === "read");
  const surprise = toRead.find((book) => book.$id === surpriseId);
  const progress = reading?.pageCount
    ? Math.min(100, Math.round(((reading.currentPage ?? 0) / reading.pageCount) * 100))
    : 0;

  if (loading) {
    return <LibrarySkeleton />;
  }

  return (
    <>
      <section className="page-heading home-heading">
        <div>
          <p className="eyebrow">Tu espacio de lectura</p>
          <h1>Buenas lecturas<br />viven aquí.</h1>
        </div>
        <p className="heading-note">Una biblioteca clara para elegir mejor qué viene después.</p>
      </section>

      {reading ? (
        <section className="now-reading">
          <div className="section-label"><span>Leyendo ahora</span><i /></div>
          <div className="reading-layout">
            <Link href={`/libro/${reading.$id}`} className="reading-cover-link">
              <BookCover title={reading.title} url={reading.coverUrl} priority />
            </Link>
            <div className="reading-copy">
              <p>{reading.authors.join(", ")}</p>
              <Link href={`/libro/${reading.$id}`}><h2>{reading.title}</h2></Link>
              {reading.synopsis && <p className="reading-synopsis">{reading.synopsis}</p>}
              <div className="progress-block">
                <div><span>Progreso</span><strong>{progress}%</strong></div>
                <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
                <label>
                  Página
                  <input
                    type="number"
                    min="0"
                    max={reading.pageCount ?? undefined}
                    value={reading.currentPage ?? 0}
                    onChange={(event) => void updateBook(reading.$id, { currentPage: Number(event.target.value) })}
                  />
                  {reading.pageCount ? ` de ${reading.pageCount}` : ""}
                </label>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="quiet-empty">
          <span>Ahora mismo</span>
          <h2>El atril está libre.</h2>
          <p>Elige “Leyendo” en cualquier libro para tenerlo siempre a mano.</p>
        </section>
      )}

      <div className="home-sections">
        {toRead.length > 0 && (
          <section className="surprise-zone">
            <div>
              <p className="eyebrow">¿Sin saber cuál elegir?</p>
              <h2>{surprise ? surprise.title : "Deja que decida el azar."}</h2>
              <p>{surprise ? surprise.authors.join(", ") : "Escogeremos uno de tus libros pendientes."}</p>
            </div>
            <div className="surprise-actions">
              {surprise && <button className="button primary" onClick={() => void setStatus(surprise.$id, "reading")}>Empezar a leer</button>}
              <button className="button secondary" onClick={() => {
                const candidates = toRead.filter((book) => book.$id !== surpriseId);
                const pool = candidates.length ? candidates : toRead;
                setSurpriseId(pool[Math.floor(Math.random() * pool.length)].$id);
              }}>✦ Sorpréndeme</button>
            </div>
          </section>
        )}
        <details className="library-section" open>
          <summary>
            <span><strong>Quiero leer</strong><small>{toRead.length} pendientes</small></span>
            <i aria-hidden="true">⌄</i>
          </summary>
          <div className="section-body">
            {toRead.length ? toRead.map((book, index) => (
              <BookRow
                key={book.$id}
                book={book}
                draggable
                onDragStart={() => setDraggedId(book.$id)}
                onDrop={() => {
                  if (draggedId) void reorderToRead(draggedId, book.$id);
                  setDraggedId(null);
                }}
                onMoveUp={index > 0 ? () => void reorderToRead(book.$id, toRead[index - 1].$id) : undefined}
                onMoveDown={index < toRead.length - 1 ? () => void reorderToRead(book.$id, toRead[index + 1].$id) : undefined}
              />
            )) : <EmptyList text="Añade un libro y aparecerá aquí listo para ordenar." />}
          </div>
        </details>

        <details className="library-section">
          <summary>
            <span><strong>Favoritos</strong><small>{favorites.length} imprescindibles</small></span>
            <i aria-hidden="true">⌄</i>
          </summary>
          <div className="section-body">
            {favorites.length ? favorites.map((book) => <BookRow key={book.$id} book={book} />) : <EmptyList text="Marca como favorito ese libro al que siempre volverías." />}
          </div>
        </details>

        <Link href="/leidos" className="read-archive-link">
          <div><span className="eyebrow">Archivo</span><strong>Leídos</strong><p>Tu historia lectora, ordenada por año.</p></div>
          <span className="archive-count">{read.length}<small>terminados</small></span>
          <i aria-hidden="true">→</i>
        </Link>
      </div>
    </>
  );
}

function EmptyList({ text }: { text: string }) {
  return <div className="list-empty"><span>＋</span><p>{text}</p></div>;
}
