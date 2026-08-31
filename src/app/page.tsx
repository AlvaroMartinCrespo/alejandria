"use client";

import Link from "next/link";
import { Check, Undo2 } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { BookRow } from "@/components/book-row";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";

const DAILY_QUOTES = [
  { text: "El que lee mucho y anda mucho, ve mucho y sabe mucho.", author: "Miguel de Cervantes" },
  { text: "Siempre imaginé que el paraíso sería algún tipo de biblioteca.", author: "Jorge Luis Borges" },
  { text: "La lectura es a la mente lo que el ejercicio al cuerpo.", author: "Joseph Addison" },
  { text: "No hay amigo tan leal como un libro.", author: "Ernest Hemingway" },
  { text: "Lee y conducirás, no leas y serás conducido.", author: "Santa Teresa de Jesús" },
  { text: "Los libros son una magia única y portátil.", author: "Stephen King" },
  { text: "Una habitación sin libros es como un cuerpo sin alma.", author: "Cicerón" },
] as const;

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86_400_000);
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
}

export default function Home() {
  const { books, loading, updateBook, setStatus, reorderToRead } = useLibrary();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [surpriseId, setSurpriseId] = useState<string | null>(null);
  const readingList = books.filter((book) => book.status === "reading");
  const toRead = books
    .filter((book) => book.status === "to_read")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const favorites = books.filter((book) => book.favorite);
  const read = books.filter((book) => book.status === "read");
  const surprise = toRead.find((book) => book.$id === surpriseId);
  const quote = getDailyQuote();

  if (loading) {
    return <LibrarySkeleton />;
  }

  return (
    <>
      <section className="page-heading quote-heading">
        <blockquote>
          <p>“{quote.text}”</p>
          <cite>{quote.author}</cite>
        </blockquote>
      </section>

      {readingList.length > 0 ? (
        <section className="now-reading">
          <div className="section-label"><span>Leyendo ahora</span><i /></div>
          <div className="now-reading-list">
            {readingList.map((reading) => {
              const progress = reading.progress ?? 0;
              return (
                <div className="reading-layout" key={reading.$id}>
                  <div className="reading-cover-wrap">
                    <Link href={`/libro/${reading.$id}`} className="reading-cover-link">
                      <BookCover title={reading.title} url={reading.coverUrl} priority />
                    </Link>
                    <div className="reading-cover-actions" aria-label={`Cambiar estado de ${reading.title}`}>
                      <button
                        className="reading-state-button to-read"
                        onClick={() => void setStatus(reading.$id, "to_read")}
                        aria-label={`Mover ${reading.title} a Quiero leer`}
                        title="Mover a Quiero leer"
                      >
                        <Undo2 size={17} aria-hidden="true" />
                      </button>
                      <button
                        className="reading-state-button read"
                        onClick={() => void setStatus(reading.$id, "read")}
                        aria-label={`Marcar ${reading.title} como terminado`}
                        title="Marcar como terminado"
                      >
                        <Check size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="reading-copy">
                    <p>{reading.authors.join(", ")}</p>
                    <Link href={`/libro/${reading.$id}`}><h2>{reading.title}</h2></Link>
                    {reading.synopsis && <p className="reading-synopsis">{reading.synopsis}</p>}
                    <div className="progress-block">
                      <div><span>Progreso</span><strong>{progress}%</strong></div>
                      <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
                      <label>
                        Porcentaje leído
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={progress}
                          onChange={(event) => void updateBook(reading.$id, { progress: Number(event.target.value) })}
                        />
                        %
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
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
