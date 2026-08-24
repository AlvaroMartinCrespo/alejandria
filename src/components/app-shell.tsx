"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { AddBookModal } from "@/components/add-book-modal";
import { BookCover } from "@/components/book-cover";
import { LibraryProvider, useLibrary } from "@/components/library-provider";
import { STATUS_LABELS } from "@/lib/book-utils";

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { books, storageMode, notice, clearNotice } = useLibrary();
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("es"));
  const results = deferredQuery
    ? books.filter((book) =>
        `${book.title} ${book.authors.join(" ")}`.toLocaleLowerCase("es").includes(deferredQuery),
      )
    : [];

  useEffect(() => {
    if (!searchOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [searchOpen]);

  const links = [
    ["/", "⌂", "Inicio"],
    ["/leidos", "✓", "Leídos"],
    ["/estadisticas", "▥", "Estadísticas"],
  ];

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Alejandría, inicio">
          <span className="brand-mark">A</span>
          <span>Alejandría</span>
        </Link>
        <nav className={`main-nav${menuOpen ? " open" : ""}`} aria-label="Navegación principal">
          {links.map(([href, icon, label]) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""} onClick={() => setMenuOpen(false)}>
              <span aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Buscar en mi biblioteca">⌕</button>
          <button className="button primary" onClick={() => setAddOpen(true)} aria-label="Añadir libro">
            <span aria-hidden="true">＋</span><span className="desktop-label">Añadir libro</span>
          </button>
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </header>
      <main className="page-shell">{children}</main>
      <footer className="app-footer">
        <span><i className={storageMode === "appwrite" ? "online" : ""} />{storageMode === "appwrite" ? "Sincronizado con Appwrite" : "Guardado en este dispositivo"}</span>
        <span>{books.length} {books.length === 1 ? "libro" : "libros"}</span>
      </footer>

      <AddBookModal open={addOpen} onClose={() => setAddOpen(false)} />
      {notice && (
        <button className={`toast ${notice.type}`} onClick={clearNotice} role="status">
          <span>{notice.type === "success" ? "✓" : "!"}</span>{notice.message}
        </button>
      )}
      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Buscar en mi biblioteca" onMouseDown={() => setSearchOpen(false)}>
          <div className="global-search-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="search-field large">
              <span aria-hidden="true">⌕</span>
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título o autor" />
              <button className="key-button" onClick={() => setSearchOpen(false)}>Esc</button>
            </div>
            <div className="global-results">
              {!deferredQuery && <p className="empty-inline">Busca entre tus {books.length} libros.</p>}
              {deferredQuery && !results.length && <p className="empty-inline">No hay resultados para “{query}”.</p>}
              {results.map((book) => (
                <Link key={book.$id} href={`/libro/${book.$id}`} onClick={() => setSearchOpen(false)} className="global-result">
                  <BookCover title={book.title} url={book.coverUrl} />
                  <span><strong>{book.title}</strong><small>{book.authors.join(", ")}</small></span>
                  <em>{STATUS_LABELS[book.status]}</em>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <LibraryProvider><ShellContent>{children}</ShellContent></LibraryProvider>;
}