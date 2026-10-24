"use client";

import Link from "next/link";
import { BarChart3, BookCheck, House, Lock, Menu, Plus, Search, Tv, Unlock, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { AddAnimeModal } from "@/components/add-anime-modal";
import { AddBookModal } from "@/components/add-book-modal";
import { BookCover } from "@/components/book-cover";
import { AnimeCover } from "@/components/anime-cover";
import { AnimeProvider, useAnime } from "@/components/anime-provider";
import { LibraryProvider, useLibrary } from "@/components/library-provider";
import { ANIME_STATUS_LABELS } from "@/lib/anime-utils";
import { STATUS_LABELS } from "@/lib/book-utils";

function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { books, editing, editorChecked, editorConfigured, storageMode, notice, clearNotice, lock, unlock } = useLibrary();
  const { anime } = useAnime();
  const onAnime = pathname.startsWith("/anime");
  const addLabel = onAnime ? "Añadir anime" : "Añadir libro";
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [lockError, setLockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("es"));
  const results = deferredQuery
    ? books.filter((book) =>
        `${book.title} ${book.authors.join(" ")}`.toLocaleLowerCase("es").includes(deferredQuery),
      )
    : [];
  const animeResults = deferredQuery
    ? anime.filter((item) =>
        `${item.title} ${item.titleJapanese}`.toLocaleLowerCase("es").includes(deferredQuery),
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

  // Con la edición bloqueada, tocar cualquier control deshabilitado (Añadir, inputs,
  // puntuación...) abre el desbloqueo en vez de no hacer nada. Los controles
  // deshabilitados no emiten clics (sobre todo en móvil), así que el CSS los hace
  // "transparentes" al toque y aquí se comprueba si el toque cayó sobre uno.
  useEffect(() => {
    if (!editorChecked || editing || lockOpen) return;
    const controls = "button:disabled, input:disabled, select:disabled, textarea:disabled";
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".modal-backdrop, .search-overlay, .toast")) return;
      if (target.closest("a[href], summary, button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")) return;
      const { clientX: x, clientY: y } = event;
      const hitDisabled = target.closest("[aria-disabled='true']") !== null ||
        Array.from(document.querySelectorAll<HTMLElement>(controls)).some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });
      if (hitDisabled) setLockOpen(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [editorChecked, editing, lockOpen]);

  const links = [
    { href: "/", icon: House, label: "Inicio" },
    { href: "/leidos", icon: BookCheck, label: "Leídos" },
    { href: "/anime", icon: Tv, label: "Anime" },
    { href: "/estadisticas", icon: BarChart3, label: "Estadísticas" },
  ];
  const isActive = (href: string) => (href === "/anime" ? onAnime : pathname === href);

  return (
    <div className="app-frame" data-locked={editorChecked && !editing ? "true" : undefined}>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Alejandría, inicio">
          <span className="brand-mark">A</span>
          <span>Alejandría</span>
        </Link>
        <nav className={`main-nav${menuOpen ? " open" : ""}`} aria-label="Navegación principal">
          {links.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className={isActive(href) ? "active" : ""} onClick={() => setMenuOpen(false)}>
              <Icon size={15} aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Buscar en mi biblioteca"><Search size={18} /></button>
          <button className="icon-button" onClick={() => editing ? void lock() : setLockOpen(true)} aria-label={editing ? "Bloquear edición" : "Desbloquear edición"} title={editing ? "Bloquear edición" : "Desbloquear edición"}>
            {editing ? <Unlock size={18} /> : <Lock size={18} />}
          </button>
          <button className="button primary" disabled={!editing} onClick={() => setAddOpen(true)} aria-label={addLabel}>
            <Plus size={18} aria-hidden="true" /><span className="desktop-label">{addLabel}</span>
          </button>
          <button
            className="icon-button menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </header>
      <main className="page-shell">{children}</main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {links.slice(0, 3).map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>
            <Icon size={20} aria-hidden="true" /><small>{label}</small>
          </Link>
        ))}
        <button disabled={!editing} onClick={() => setAddOpen(true)} aria-label={addLabel}>
          <Plus size={22} aria-hidden="true" /><small>Añadir</small>
        </button>
        <Link href="/estadisticas" className={pathname === "/estadisticas" ? "active" : ""}>
          <BarChart3 size={20} aria-hidden="true" /><small>Estadísticas</small>
        </Link>
      </nav>
      <footer className="app-footer">
        <span><i className={storageMode === "supabase" ? "online" : ""} />{storageMode === "supabase" ? "Sincronizado con Supabase" : "Guardado en este dispositivo"}</span>
        <span>{books.length} {books.length === 1 ? "libro" : "libros"} · {anime.length} {anime.length === 1 ? "anime" : "animes"}</span>
      </footer>

      <AddBookModal open={addOpen && !onAnime} onClose={() => setAddOpen(false)} />
      <AddAnimeModal open={addOpen && onAnime} onClose={() => setAddOpen(false)} />
      {lockOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLockOpen(false)}>
          <form className="lock-panel" onMouseDown={(event) => event.stopPropagation()} onSubmit={async (event) => {
            event.preventDefault();
            setUnlocking(true);
            setLockError("");
            try {
              await unlock(password);
              setPassword("");
              setLockOpen(false);
            } catch (error) {
              setLockError(error instanceof Error ? error.message : "No se pudo desbloquear la edición.");
            } finally {
              setUnlocking(false);
            }
          }}>
            <Lock size={24} aria-hidden="true" />
            <h2>Edición bloqueada</h2>
            <p>Introduce la contraseña para modificar tu biblioteca.</p>
            <input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" />
            {lockError && <p className="lock-error" role="alert">{lockError}</p>}
            {!editorConfigured && <p className="lock-error">Falta configurar la contraseña en el servidor.</p>}
            <button className="button primary" disabled={unlocking}>{unlocking ? "Desbloqueando..." : "Desbloquear"}</button>
          </form>
        </div>
      )}
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
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar libros y anime" />
              <button className="key-button" onClick={() => setSearchOpen(false)}>Esc</button>
            </div>
            <div className="global-results">
              {!deferredQuery && <p className="empty-inline">Busca entre tus {books.length} libros y {anime.length} animes.</p>}
              {deferredQuery && !results.length && !animeResults.length && <p className="empty-inline">No hay resultados para “{query}”.</p>}
              {results.map((book) => (
                <Link key={book.$id} href={`/libro/${book.$id}`} onClick={() => setSearchOpen(false)} className="global-result">
                  <BookCover title={book.title} url={book.coverUrl} />
                  <span><strong>{book.title}</strong><small>{book.authors.join(", ")}</small></span>
                  <em className={`status-chip ${book.status}`}>{STATUS_LABELS[book.status]}</em>
                </Link>
              ))}
              {animeResults.map((item) => (
                <Link key={item.$id} href={`/anime/${item.$id}`} onClick={() => setSearchOpen(false)} className="global-result">
                  <AnimeCover title={item.title} url={item.coverUrl} />
                  <span><strong>{item.title}</strong><small>{item.titleJapanese || "Anime"}</small></span>
                  <em className={`status-chip ${item.status}`}>{ANIME_STATUS_LABELS[item.status]}</em>
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
  return <LibraryProvider><AnimeProvider><ShellContent>{children}</ShellContent></AnimeProvider></LibraryProvider>;
}