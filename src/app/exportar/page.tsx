"use client";

import Link from "next/link";
import { useAnime } from "@/components/anime-provider";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { ANIME_STATUS_LABELS } from "@/lib/anime-utils";
import { STATUS_LABELS } from "@/lib/book-utils";
import type { AnimeStatus } from "@/types/anime";
import type { BookStatus } from "@/types/book";

const GROUPS: BookStatus[] = ["reading", "to_read", "read"];
const ANIME_GROUPS: AnimeStatus[] = ["watching", "to_watch", "on_hold", "watched", "dropped"];

export default function PrintableLibraryPage() {
  const { books, collections, loading } = useLibrary();
  const { anime, animeLoading } = useAnime();
  const groups = [
    ...GROUPS.filter((status) => status !== "to_read").map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      books: books
        .filter((book) => book.status === status)
        .sort((a, b) => status === "read"
          ? (b.finishedYear ?? 0) - (a.finishedYear ?? 0)
          : a.title.localeCompare(b.title, "es")),
    })),
    ...[
      { key: "unclassified", label: "Quiero leer · Sin clasificar", collectionId: null },
      ...collections.sort((left, right) => left.order - right.order).map((collection) => ({
        key: collection.$id,
        label: `Quiero leer · ${collection.name}`,
        collectionId: collection.$id,
      })),
    ].map((group) => ({
      ...group,
      books: books
        .filter((book) => book.status === "to_read" && book.collectionId === group.collectionId)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    })),
    {
      key: "favorite",
      label: "Favoritos",
      books: books.filter((book) => book.favorite).sort((a, b) => a.title.localeCompare(b.title, "es")),
    },
  ];
  const animeGroups = ANIME_GROUPS.map((status) => ({
    key: `anime-${status}`,
    label: `Anime · ${ANIME_STATUS_LABELS[status]}`,
    items: anime
      .filter((item) => item.status === status)
      .sort((a, b) => status === "watched"
        ? (b.finishedYear ?? 0) - (a.finishedYear ?? 0) || a.title.localeCompare(b.title, "es")
        : a.title.localeCompare(b.title, "es")),
  }));

  if (loading || animeLoading) return <LibrarySkeleton rows={5} />;

  return (
    <article className="print-library">
      <header className="print-header">
        <div><p className="eyebrow">Copia personal</p><h1>Alejandría</h1><p>Exportada el {new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date())}</p></div>
        <div className="print-actions"><Link href="/estadisticas" className="button secondary">← Volver</Link><button className="button primary" onClick={() => window.print()}>▤ Guardar PDF</button></div>
      </header>
      {groups.map((group) => {
        if (!group.books.length) return null;
        return (
          <section className="print-group" key={group.key}>
            <div className="print-group-title"><h2>{group.label}</h2><span>{group.books.length}</span></div>
            <div className="print-table">
              {group.books.map((book) => (
                <div className="print-row" key={book.$id}>
                  <strong>{book.title}</strong>
                  <span>{book.authors.join(", ") || "Autor desconocido"}</span>
                  <span>{book.finishedYear ?? book.publishedYear ?? "—"}</span>
                  <span>{book.rating === null ? "Sin puntuar" : `${book.rating} / 10`}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {animeGroups.map((group) => {
        if (!group.items.length) return null;
        return (
          <section className="print-group" key={group.key}>
            <div className="print-group-title"><h2>{group.label}</h2><span>{group.items.length}</span></div>
            <div className="print-table">
              {group.items.map((item) => (
                <div className="print-row" key={item.$id}>
                  <strong>{item.title}</strong>
                  <span>{item.titleJapanese || item.mediaFormat || "—"}</span>
                  <span>
                    {item.status === "watched"
                      ? item.finishedYear ?? item.releaseYear ?? "—"
                      : `Temp. ${item.currentSeason} · Cap. ${item.currentEpisode}${item.totalEpisodes !== null ? ` / ${item.totalEpisodes}` : ""}`}
                  </span>
                  <span>{item.rating === null ? "Sin puntuar" : `${item.rating} / 10`}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!books.length && !anime.length && <div className="big-empty"><p>La biblioteca todavía está vacía.</p></div>}
    </article>
  );
}