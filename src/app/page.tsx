"use client";

import Link from "next/link";
import { Check, ChevronDown, FolderPlus, MoreHorizontal, Undo2 } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
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
  const { books, collections, createCollection, deleteCollection, editing, loading, moveBook, moveCollection, renameCollection, setStatus, updateBook } = useLibrary();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [openCollections, setOpenCollections] = useState<Record<string, boolean>>({ unclassified: true });
  const [surpriseId, setSurpriseId] = useState<string | null>(null);
  const readingList = books.filter((book) => book.status === "reading");
  const toRead = books
    .filter((book) => book.status === "to_read")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const favorites = books.filter((book) => book.favorite);
  const read = books.filter((book) => book.status === "read");
  const surprise = toRead.find((book) => book.$id === surpriseId);
  const quote = getDailyQuote();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("alejandria-open-collections-v1");
    if (stored) setOpenCollections(JSON.parse(stored) as Record<string, boolean>);
  }, []);

  function setCollectionOpen(id: string, open: boolean) {
    setOpenCollections((current) => {
      const next = { ...current, [id]: open };
      window.localStorage.setItem("alejandria-open-collections-v1", JSON.stringify(next));
      return next;
    });
  }

  function booksInCollection(collectionId: string | null) {
    return toRead.filter((book) => book.collectionId === collectionId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const bookId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveId(null);
    if (!overId) return;
    if (overId.startsWith("collection:")) {
      const collectionId = overId.slice("collection:".length) || null;
      void moveBook(bookId, collectionId, booksInCollection(collectionId).length);
      return;
    }
    const target = toRead.find((book) => book.$id === overId);
    if (!target) return;
    const index = booksInCollection(target.collectionId).findIndex((book) => book.$id === target.$id);
    void moveBook(bookId, target.collectionId, index);
  }

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
                        disabled={!editing}
                      >
                        <Undo2 size={17} aria-hidden="true" />
                      </button>
                      <button
                        className="reading-state-button read"
                        onClick={() => void setStatus(reading.$id, "read")}
                        aria-label={`Marcar ${reading.title} como terminado`}
                        title="Marcar como terminado"
                        disabled={!editing}
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
                          disabled={!editing}
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
              {surprise && <button className="button primary" disabled={!editing} onClick={() => void setStatus(surprise.$id, "reading")}>Empezar a leer</button>}
              <button className="button secondary" onClick={() => {
                const candidates = toRead.filter((book) => book.$id !== surpriseId);
                const pool = candidates.length ? candidates : toRead;
                setSurpriseId(pool[Math.floor(Math.random() * pool.length)].$id);
              }}>✦ Sorpréndeme</button>
            </div>
          </section>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(event) => setActiveId(String(event.active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={handleDragEnd}>
          <section className="library-section to-read-section">
            <header className="to-read-header">
              <span><strong>Quiero leer</strong><small>{toRead.length} pendientes</small></span>
              <button className="button compact secondary" disabled={!editing} onClick={() => setShowNewCollection((current) => !current)}><FolderPlus size={16} />Carpeta</button>
            </header>
            {showNewCollection && editing && (
              <form className="new-collection-form" onSubmit={(event) => {
                event.preventDefault();
                void createCollection(newCollectionName).then(() => { setNewCollectionName(""); setShowNewCollection(false); });
              }}>
                <input autoFocus maxLength={60} value={newCollectionName} onChange={(event) => setNewCollectionName(event.target.value)} placeholder="Nombre de la carpeta" />
                <button className="button compact primary">Crear</button>
              </form>
            )}
            <div className="section-body">
              {toRead.length > 0 && <CollectionSection id="unclassified" label="Sin clasificar" books={booksInCollection(null)} open={openCollections.unclassified ?? true} onOpenChange={(open) => setCollectionOpen("unclassified", open)} />}
              {[...collections].sort((left, right) => left.order - right.order).map((collection) => (
                <CollectionSection key={collection.$id} id={collection.$id} label={collection.name} books={booksInCollection(collection.$id)} open={openCollections[collection.$id] ?? false} onOpenChange={(open) => setCollectionOpen(collection.$id, open)} menu={editing ?
                  <details className="collection-menu">
                    <summary aria-label={`Opciones de ${collection.name}`}><MoreHorizontal size={18} /></summary>
                    <div>
                      <button onClick={() => { const name = window.prompt("Nuevo nombre", collection.name); if (name) void renameCollection(collection.$id, name); }}>Renombrar</button>
                      <button onClick={() => void moveCollection(collection.$id, "up")}>Subir</button>
                      <button onClick={() => void moveCollection(collection.$id, "down")}>Bajar</button>
                      <button className="danger" onClick={() => { if (window.confirm(`¿Borrar ${collection.name}? Sus libros volverán a Sin clasificar.`)) void deleteCollection(collection.$id); }}>Borrar</button>
                    </div>
                  </details>
                : undefined} />
              ))}
              {!toRead.length && !collections.length && <EmptyList text="Añade un libro y aparecerá aquí listo para ordenar." />}
            </div>
          </section>
          <DragOverlay>{activeId ? <BookRow book={books.find((book) => book.$id === activeId)!} overlay /> : null}</DragOverlay>
          {activeId && <div className="collection-drop-bar" aria-label="Carpetas de destino">{collections.map((collection) => <CollectionDropChip key={collection.$id} collectionId={collection.$id} name={collection.name} />)}</div>}
        </DndContext>

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

function CollectionSection({ id, label, books, open, onOpenChange, menu }: { id: string; label: string; books: import("@/types/book").Book[]; open: boolean; onOpenChange: (open: boolean) => void; menu?: React.ReactNode }) {
  const collectionId = id === "unclassified" ? null : id;
  const { editing, moveBook } = useLibrary();
  const { setNodeRef } = useDroppable({ id: `collection:${collectionId ?? ""}` });
  return (
    <details className="collection-section" open={open} onToggle={(event) => onOpenChange((event.currentTarget as HTMLDetailsElement).open)}>
      <summary ref={setNodeRef}><span><ChevronDown size={17} aria-hidden="true" />{label} <small>({books.length})</small></span>{menu}</summary>
      <SortableContext items={books.map((book) => book.$id)} strategy={verticalListSortingStrategy}>
        <div className="collection-books">
          {books.length ? books.map((book, index) => <BookRow key={book.$id} book={book} sortable={editing} onMoveUp={editing && index > 0 ? () => void moveBook(book.$id, collectionId, index - 1) : undefined} onMoveDown={editing && index < books.length - 1 ? () => void moveBook(book.$id, collectionId, index + 1) : undefined} />) : <div className="collection-empty">{editing ? "Suelta aquí un libro" : "Carpeta vacía"}</div>}
        </div>
      </SortableContext>
    </details>
  );
}

function CollectionDropChip({ collectionId, name }: { collectionId: string; name: string }) {
  const { setNodeRef } = useDroppable({ id: `collection:${collectionId}` });
  return <span ref={setNodeRef}>{name}</span>;
}

function EmptyList({ text }: { text: string }) {
  return <div className="list-empty"><span>＋</span><p>{text}</p></div>;
}
