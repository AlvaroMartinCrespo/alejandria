"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { useLibrary } from "@/components/library-provider";
import type { GoogleBookResult } from "@/types/book";

export function AddBookModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addBook, books } = useLibrary();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const searchBooks = useEffectEvent(async (term: string) => {
    setSearching(true);
    setMessage("");
    try {
      const response = await fetch(`/api/google-books?q=${encodeURIComponent(term)}`);
      const data = (await response.json()) as { books?: GoogleBookResult[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setResults(data.books ?? []);
      if (!data.books?.length) setMessage("No encontramos coincidencias.");
    } catch {
      setResults([]);
      setMessage("No se pudo conectar con Google Books.");
    } finally {
      setSearching(false);
    }
  });

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setMessage("");
      return;
    }
    const timer = window.setTimeout(() => void searchBooks(query.trim()), 450);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Google Books</p>
            <h2 id="add-title">Añadir un libro</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="search-field large">
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, autor o ISBN"
          />
          {searching && <span className="spinner" aria-label="Buscando" />}
        </div>
        <div className="search-results" aria-live="polite">
          {!query && (
            <div className="search-prompt">
              <strong>Encuentra tu próxima lectura</strong>
              <p>Escribe al menos dos caracteres para buscar en el catálogo.</p>
            </div>
          )}
          {message && <p className="empty-inline">{message}</p>}
          {results.map((result) => {
            const added = books.some((book) => book.googleBooksId === result.googleBooksId);
            return (
              <article className="result-row" key={result.googleBooksId}>
                <BookCover title={result.title} url={result.coverUrl} />
                <div>
                  <strong>{result.title}</strong>
                  <p>{result.authors.join(", ")}</p>
                  <small>{result.publishedYear ?? "Año desconocido"}</small>
                </div>
                <button
                  className="button secondary compact"
                  disabled={added}
                  onClick={async () => {
                    try {
                      await addBook(result);
                      setMessage(`“${result.title}” se añadió a Quiero leer.`);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "No se pudo añadir.");
                    }
                  }}
                >
                  {added ? "Añadido" : "Añadir"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}