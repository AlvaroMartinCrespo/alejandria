"use client";

import Link from "next/link";
import { useAnime } from "@/components/anime-provider";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { ANIME_STATUS_LABELS, animeEpisodesWatched } from "@/lib/anime-utils";
import { STATUS_LABELS } from "@/lib/book-utils";
import { MAX_RATING } from "@/lib/rating";
import { MONTH_SHORT, computeRecap, formatHours, groupByYear, plural } from "@/lib/recap";
import { habitInsights } from "@/lib/recap-insights";
import type { Anime, AnimeStatus } from "@/types/anime";
import type { Book, BookStatus } from "@/types/book";

const GROUPS: BookStatus[] = ["reading", "read"];
const ANIME_GROUPS: AnimeStatus[] = ["watching", "to_watch", "on_hold", "watched", "dropped"];
const NOTE_LIMIT = 180;

const number = (value: number, digits = 0) => value.toLocaleString("es", { maximumFractionDigits: digits });
const ratingText = (rating: number | null) => (rating === null ? "—" : `${rating} / ${MAX_RATING}`);

/** «Mar 2025», «2025» o «—» según lo que se sepa de la fecha. */
function dateText(year: number | null, month: number | null) {
  if (!year) return "—";
  return month && month >= 1 && month <= 12 ? `${MONTH_SHORT[month - 1]} ${year}` : String(year);
}

function shortNote(notes: string | undefined) {
  const text = (notes ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > NOTE_LIMIT ? `${text.slice(0, NOTE_LIMIT).trimEnd()}…` : text;
}

type Column = { title: string; authors: string; when: string; size: string; rating: string };

function GroupHeader({ label, count, columns }: { label: string; count: number; columns: Column }) {
  return (
    <>
      <div className="print-group-title"><h2>{label}</h2><span>{count}</span></div>
      <div className="print-row print-row-head" aria-hidden="true">
        <span>{columns.title}</span><span>{columns.authors}</span><span className="num">{columns.when}</span><span className="num">{columns.size}</span><span className="num">{columns.rating}</span>
      </div>
    </>
  );
}

const BOOK_COLUMNS: Record<string, Column> = {
  read: { title: "Título", authors: "Autor", when: "Terminado", size: "Págs.", rating: "Nota" },
  reading: { title: "Título", authors: "Autor", when: "Progreso", size: "Págs.", rating: "Nota" },
  to_read: { title: "Título", authors: "Autor", when: "Publicado", size: "Págs.", rating: "Nota" },
  favorite: { title: "Título", authors: "Autor", when: "Terminado", size: "Págs.", rating: "Nota" },
};

function BookRow({ book, mode }: { book: Book; mode: string }) {
  const note = shortNote(book.notes);
  const when = mode === "reading"
    ? `${book.progress} %`
    : mode === "to_read"
      ? book.publishedYear ?? "—"
      : dateText(book.finishedYear, book.finishedMonth);
  return (
    <div className="print-row">
      <strong>
        {book.favorite && <b className="print-fav" aria-label="Favorito">★</b>}
        {book.title}
        {mode === "reading" && <i className="print-progress" aria-hidden="true"><u style={{ width: `${book.progress}%` }} /></i>}
        {note && <em>{note}</em>}
      </strong>
      <span>{book.authors.join(", ") || "Autor desconocido"}</span>
      <span className="num">{when}</span>
      <span className="num">{book.pageCount ?? "—"}</span>
      <span className="num">{ratingText(book.rating)}</span>
    </div>
  );
}

function animeProgress(item: Anime) {
  if (item.status === "watched") return dateText(item.finishedYear ?? item.releaseYear, item.finishedMonth);
  const total = item.totalEpisodes !== null ? `/${item.totalEpisodes}` : "";
  return `T${item.currentSeason} · cap. ${item.currentEpisode}${total}`;
}

function AnimeRowView({ item }: { item: Anime }) {
  const note = shortNote(item.notes);
  const detail = [item.titleJapanese, item.mediaFormat, item.genres.slice(0, 3).join(", ")].filter(Boolean).join(" · ");
  return (
    <div className="print-row">
      <strong>
        {item.favorite && <b className="print-fav" aria-label="Favorito">★</b>}
        {item.title}
        {note && <em>{note}</em>}
      </strong>
      <span>{detail || "—"}</span>
      <span className="num">{animeProgress(item)}</span>
      <span className="num">{item.totalSeasons !== null ? `${item.totalSeasons} temp.` : "—"}</span>
      <span className="num">{ratingText(item.rating)}</span>
    </div>
  );
}

export default function PrintableLibraryPage() {
  const { books, collections, activity, markedDays, loading } = useLibrary();
  const { anime, animeLoading } = useAnime();

  if (loading || animeLoading) return <LibrarySkeleton rows={5} />;

  const bySort = (a: Book, b: Book) => a.title.localeCompare(b.title, "es");
  const readBooks = books.filter((book) => book.status === "read");
  const recap = computeRecap(readBooks);
  const habits = habitInsights(activity, markedDays);
  const { byYear, withoutYear } = groupByYear(readBooks);
  const years = [...byYear.keys()].sort((a, b) => b - a).map((year) => {
    const list = byYear.get(year) ?? [];
    const stats = computeRecap(list);
    return { year, count: list.length, pages: stats.pages, average: stats.averageRating };
  });
  if (withoutYear.length) {
    const stats = computeRecap(withoutYear);
    years.push({ year: 0, count: withoutYear.length, pages: stats.pages, average: stats.averageRating });
  }
  const maxYearCount = Math.max(1, ...years.map((row) => row.count));

  const watched = anime.filter((item) => item.status === "watched");
  const episodes = anime.reduce((sum, item) => sum + animeEpisodesWatched(item), 0);

  const sortedCollections = [...collections].sort((left, right) => left.order - right.order);
  const bookGroups = [
    ...GROUPS.map((status) => ({
      key: status,
      mode: status as string,
      label: STATUS_LABELS[status],
      books: books
        .filter((book) => book.status === status)
        .sort((a, b) => status === "read"
          ? (b.finishedYear ?? 0) - (a.finishedYear ?? 0) || (b.finishedMonth ?? 0) - (a.finishedMonth ?? 0) || bySort(a, b)
          : bySort(a, b)),
    })),
    ...[
      { key: "unclassified", label: "Quiero leer · Sin clasificar", collectionId: null as string | null },
      ...sortedCollections.map((collection) => ({
        key: collection.$id,
        label: `Quiero leer · ${collection.name}`,
        collectionId: collection.$id as string | null,
      })),
    ].map((group) => ({
      key: group.key,
      mode: "to_read",
      label: group.label,
      books: books
        .filter((book) => book.status === "to_read" && book.collectionId === group.collectionId)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    })),
    {
      key: "favorite",
      mode: "favorite",
      label: "Libros favoritos",
      books: books.filter((book) => book.favorite).sort(bySort),
    },
  ];
  const animeGroups = [
    ...ANIME_GROUPS.map((status) => ({
      key: `anime-${status}`,
      label: `Anime · ${ANIME_STATUS_LABELS[status]}`,
      items: anime
        .filter((item) => item.status === status)
        .sort((a, b) => status === "watched"
          ? (b.finishedYear ?? 0) - (a.finishedYear ?? 0) || (b.finishedMonth ?? 0) - (a.finishedMonth ?? 0) || a.title.localeCompare(b.title, "es")
          : a.title.localeCompare(b.title, "es")),
    })),
    {
      key: "anime-favorite",
      label: "Anime favorito",
      items: anime.filter((item) => item.favorite).sort((a, b) => a.title.localeCompare(b.title, "es")),
    },
  ];

  const summary: Array<{ label: string; value: string; hint?: string }> = [
    { label: "Libros", value: number(books.length), hint: `${number(books.filter((book) => book.status === "to_read").length)} por leer` },
    { label: "Leídos", value: number(recap.count), hint: `${number(books.filter((book) => book.status === "reading").length)} en curso` },
    { label: "Páginas leídas", value: number(recap.pages), hint: recap.pages ? `≈ ${formatHours(recap.hours)} de lectura` : undefined },
    { label: "Nota media", value: recap.averageRating === null ? "—" : `${number(recap.averageRating, 1)} / ${MAX_RATING}`, hint: plural(recap.ratedCount, "valorado", "valorados") },
    { label: "Favoritos", value: number(books.filter((book) => book.favorite).length) },
    { label: "Autores leídos", value: number(recap.distinctAuthors), hint: recap.topAuthor ? `Más leído: ${recap.topAuthor[0]} (${recap.topAuthor[1]})` : undefined },
    { label: "Días de lectura", value: number(habits.readDays), hint: habits.longestStreak ? `Racha máx.: ${plural(habits.longestStreak.length, "día", "días")}` : undefined },
    { label: "Anime visto", value: number(watched.length), hint: `${number(episodes)} capítulos` },
  ];

  return (
    <article className="print-library">
      <header className="print-header">
        <div><p className="eyebrow">Copia personal</p><h1>Alejandría</h1><p>Exportada el {new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date())}</p></div>
        <div className="print-actions"><Link href="/estadisticas" className="button secondary">← Volver</Link><button className="button primary" onClick={() => window.print()}>▤ Guardar PDF</button></div>
      </header>

      {(books.length > 0 || anime.length > 0) && (
        <section className="print-summary" aria-label="Resumen">
          {summary.map((item) => (
            <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.hint && <small>{item.hint}</small>}</div>
          ))}
        </section>
      )}

      {years.length > 0 && (
        <section className="print-group print-years">
          <div className="print-group-title"><h2>Lecturas por año</h2><span>{years.length}</span></div>
          <div className="print-row print-row-head print-year-row" aria-hidden="true">
            <span>Año</span><span className="num">Libros</span><span /><span className="num">Páginas</span><span className="num">Nota media</span>
          </div>
          {years.map((row) => (
            <div className="print-row print-year-row" key={row.year || "sin-ano"}>
              <strong>{row.year || "Sin año"}</strong>
              <span className="num">{number(row.count)}</span>
              <i className="print-bar" aria-hidden="true"><u style={{ width: `${(row.count / maxYearCount) * 100}%` }} /></i>
              <span className="num">{row.pages ? number(row.pages) : "—"}</span>
              <span className="num">{row.average === null ? "—" : `${number(row.average, 1)} / ${MAX_RATING}`}</span>
            </div>
          ))}
        </section>
      )}

      {bookGroups.map((group) => {
        if (!group.books.length) return null;
        return (
          <section className="print-group" key={group.key}>
            <GroupHeader label={group.label} count={group.books.length} columns={BOOK_COLUMNS[group.mode]} />
            {group.books.map((book) => <BookRow book={book} mode={group.mode} key={book.$id} />)}
          </section>
        );
      })}
      {animeGroups.map((group) => {
        if (!group.items.length) return null;
        return (
          <section className="print-group" key={group.key}>
            <GroupHeader
              label={group.label}
              count={group.items.length}
              columns={{ title: "Título", authors: "Detalle", when: group.key === "anime-watched" ? "Terminado" : "Avance", size: "Temp.", rating: "Nota" }}
            />
            {group.items.map((item) => <AnimeRowView item={item} key={item.$id} />)}
          </section>
        );
      })}
      {!books.length && !anime.length && <div className="big-empty"><p>La biblioteca todavía está vacía.</p></div>}
    </article>
  );
}
