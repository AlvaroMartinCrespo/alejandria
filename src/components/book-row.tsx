"use client";

import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { useLibrary } from "@/components/library-provider";
import { STATUS_LABELS } from "@/lib/book-utils";
import type { Book, BookStatus } from "@/types/book";

export function BookRow({
  book,
  draggable = false,
  onDragStart,
  onDrop,
  onMoveUp,
  onMoveDown,
}: {
  book: Book;
  draggable?: boolean;
  onDragStart?: () => void;
  onDrop?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { setStatus } = useLibrary();

  return (
    <article
      className="book-row"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => draggable && event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.();
      }}
    >
      {draggable && <span className="drag-handle" title="Arrastrar para reordenar">⠿</span>}
      <Link href={`/libro/${book.$id}`} className="row-cover" aria-label={`Abrir ${book.title}`}>
        <BookCover title={book.title} url={book.coverUrl} />
      </Link>
      <div className="book-row-copy">
        <Link href={`/libro/${book.$id}`} className="book-title-link">
          {book.title}
        </Link>
        <p>{book.authors.join(", ") || "Autor desconocido"}</p>
        <div className="book-meta-inline">
          {book.publishedYear && <span>{book.publishedYear}</span>}
          {book.pageCount && <span>{book.pageCount} págs.</span>}
          {book.rating !== null && <span className="rating">★ {book.rating}</span>}
        </div>
      </div>
      <details className="status-control">
        <summary aria-label={`Cambiar estado de ${book.title}`}>
          {STATUS_LABELS[book.status]} <span aria-hidden="true">⌄</span>
        </summary>
        <div className="status-menu">
          {(Object.entries(STATUS_LABELS) as [BookStatus, string][])
            .filter(([value]) => value !== book.status)
            .map(([value, label]) => (
              <button
                key={value}
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  void setStatus(book.$id, value).catch(() => undefined);
                }}
              >
                {label}
              </button>
            ))}
        </div>
      </details>
      {draggable && (
        <div className="reorder-buttons" aria-label={`Reordenar ${book.title}`}>
          <button onClick={onMoveUp} disabled={!onMoveUp} aria-label="Subir en la lista">↑</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} aria-label="Bajar en la lista">↓</button>
        </div>
      )}
    </article>
  );
}