"use client";

import Link from "next/link";
import { FolderInput, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookCover } from "@/components/book-cover";
import { useLibrary } from "@/components/library-provider";
import { STATUS_LABELS } from "@/lib/book-utils";
import type { Book, BookStatus } from "@/types/book";

export function BookRow({
  book,
  sortable = false,
  overlay = false,
  onMoveUp,
  onMoveDown,
}: {
  book: Book;
  sortable?: boolean;
  overlay?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { collections, editing, moveBook, setStatus, toggleFavorite } = useLibrary();
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: book.$id,
    disabled: !sortable || overlay || !editing,
    data: { collectionId: book.collectionId },
  });

  return (
    <article
      className="book-row"
      data-sortable={sortable && editing || undefined}
      data-dragging={isDragging || undefined}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {sortable && editing && !overlay && (
        <button className="drag-handle" type="button" title="Arrastrar para reordenar" aria-label={`Arrastrar ${book.title}`} {...attributes} {...listeners}>
          <GripVertical size={18} aria-hidden="true" />
        </button>
      )}
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
      <button
        className={`favorite-button${book.favorite ? " active" : ""}`}
        onClick={() => void toggleFavorite(book.$id)}
        aria-label={book.favorite ? `Quitar ${book.title} de favoritos` : `Añadir ${book.title} a favoritos`}
        aria-pressed={book.favorite}
        title={book.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        disabled={!editing}
      >
        <span aria-hidden="true">{book.favorite ? "★" : "☆"}</span>
      </button>
      {editing ? <details className={`status-control ${book.status}`}>
        <summary aria-label={`Cambiar estado de ${book.title}`}>
          <i className="status-dot" aria-hidden="true" />
          <span>{STATUS_LABELS[book.status]}</span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="status-menu">
          {(Object.entries(STATUS_LABELS) as [BookStatus, string][])
            .filter(([value]) => value !== book.status)
            .map(([value, label]) => (
              <button
                key={value}
                className={`status-option ${value}`}
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  void setStatus(book.$id, value).catch(() => undefined);
                }}
              >
                <i className="status-dot" aria-hidden="true" />{label}
              </button>
            ))}
        </div>
      </details> : <span className={`status-control status-locked ${book.status}`}><i className="status-dot" aria-hidden="true" /><span>{STATUS_LABELS[book.status]}</span></span>}
      {sortable && editing && !overlay && (
        <details className="move-control">
          <summary aria-label={`Mover ${book.title} a una carpeta`} title="Mover a..."><FolderInput size={16} aria-hidden="true" /></summary>
          <div className="move-menu">
            <button onClick={() => void moveBook(book.$id, null, Number.MAX_SAFE_INTEGER)}>Sin clasificar</button>
            {[...collections].sort((left, right) => left.order - right.order).map((collection) => (
              <button key={collection.$id} onClick={() => void moveBook(book.$id, collection.$id, Number.MAX_SAFE_INTEGER)}>{collection.name}</button>
            ))}
          </div>
        </details>
      )}
      {sortable && editing && !overlay && (
        <div className="reorder-buttons" aria-label={`Reordenar ${book.title}`}>
          <button onClick={onMoveUp} disabled={!onMoveUp} aria-label="Subir en la lista">↑</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} aria-label="Bajar en la lista">↓</button>
        </div>
      )}
    </article>
  );
}