"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileText, Upload } from "lucide-react";
import { LibraryStatusChart, RatingChart, ReadingYearsChart } from "@/components/library-charts";
import { BookRow } from "@/components/book-row";
import { useAnime } from "@/components/anime-provider";
import { useLibrary } from "@/components/library-provider";
import { animeEpisodesWatched } from "@/lib/anime-utils";
import { parseAnimeBackup } from "@/lib/anime-validation";
import { buildLibraryBackup, downloadJson } from "@/lib/backup";
import { MAX_RATING, RATING_VALUES_DESC } from "@/lib/rating";
import type { Book } from "@/types/book";

type Tab = "resumen" | "favoritos" | "valoraciones";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "favoritos", label: "Favoritos" },
  { id: "valoraciones", label: "Valoraciones" },
];

function sortByFinishedDesc(a: Book, b: Book) {
  if ((b.finishedYear ?? 0) !== (a.finishedYear ?? 0)) return (b.finishedYear ?? 0) - (a.finishedYear ?? 0);
  return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
}

export default function StatisticsPage() {
  const { books, collections, editing, restoreBackup } = useLibrary();
  const { anime, animeError, restoreAnime } = useAnime();
  const [tab, setTab] = useState<Tab>("resumen");

  const completed = books.filter((book) => book.status === "read");
  const pages = completed.reduce((sum, book) => sum + (book.pageCount ?? 0), 0);
  const rated = completed.filter((book) => book.rating !== null);
  const average = rated.length ? rated.reduce((sum, book) => sum + (book.rating ?? 0), 0) / rated.length : 0;
  const authorCounts = completed.flatMap((book) => book.authors).reduce<Record<string, number>>((counts, author) => {
    counts[author] = (counts[author] ?? 0) + 1;
    return counts;
  }, {});
  const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];
  const years = Array.from(new Set(completed.map((book) => book.finishedYear).filter(Boolean) as number[])).sort((a, b) => a - b);
  const statusCounts = {
    toRead: books.filter((book) => book.status === "to_read").length,
    read: completed.length,
  };
  const ratingCounts = RATING_VALUES_DESC.map((rating) => ({
    rating,
    count: completed.filter((book) => book.rating === rating).length,
  }));
  const statusData = [
    { name: "Quiero leer", value: statusCounts.toRead, color: "#e9bb58" },
    { name: "Leídos", value: statusCounts.read, color: "#ff735d" },
  ];
  const yearData = years.map((year) => ({
    year,
    count: completed.filter((book) => book.finishedYear === year).length,
  }));

  // Favoritos / imprescindibles: libros leídos marcados como favoritos.
  const favorites = completed.filter((book) => book.favorite).sort(sortByFinishedDesc);
  const favoriteYears = Array.from(new Set(favorites.map((book) => book.finishedYear).filter(Boolean) as number[])).sort((a, b) => b - a);
  const favoritesWithoutYear = favorites.filter((book) => !book.finishedYear);
  function favoritesForYear(year: number) {
    return favorites.filter((book) => book.finishedYear === year);
  }

  // Valoraciones: libros leídos agrupados por puntuación, de 10 a 1 estrellas.
  function booksForRating(rating: number) {
    return completed.filter((book) => book.rating === rating).sort(sortByFinishedDesc);
  }

  // Anime vistos este año (sección final de Resumen).
  const animeYear = new Date().getFullYear();
  const animeThisYear = anime.filter((item) => item.status === "watched" && item.finishedYear === animeYear);
  const animeThisYearEpisodes = animeThisYear.reduce((sum, item) => sum + animeEpisodesWatched(item), 0);

  function exportJson() {
    // Si el anime no ha podido cargarse, una copia saldría incompleta sin avisar.
    if (animeError) {
      window.alert("No se puede crear la copia: el anime no se ha cargado correctamente. Resuelve el error e inténtalo de nuevo.");
      return;
    }
    downloadJson(
      buildLibraryBackup({ books, collections, anime }),
      `alejandria-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      // Valida también los animes antes de tocar nada (v1/v2 no traen `anime`).
      const importedAnime = parseAnimeBackup(parsed);
      await restoreBackup(parsed);
      if (importedAnime.length) await restoreAnime(importedAnime);
    } catch (error) {
      const message = error instanceof SyntaxError
        ? "El archivo no contiene JSON válido."
        : error instanceof Error
          ? error.message
          : "No se pudo restaurar la copia.";
      window.alert(message);
    }
  }

  return (
    <>
      <section className="page-heading stats-heading">
        <div><p className="eyebrow">La biblioteca en números</p><h1>Estadísticas</h1></div>
        <div className="export-actions">
          <button className="button secondary" onClick={exportJson}><Download size={15} />JSON</button>
          <label className="button secondary file-button" aria-disabled={!editing}><Upload size={15} />Restaurar<input disabled={!editing} type="file" accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} /></label>
          <Link className="button secondary" href="/exportar"><FileText size={15} />PDF</Link>
        </div>
      </section>

      <div className="stats-tabs" role="tablist" aria-label="Vistas de estadísticas">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`stats-tab${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <>
          <section className="stat-grid">
            <article><span>Libros terminados</span><strong>{completed.length}</strong><small>en total</small></article>
            <article><span>Páginas leídas</span><strong>{pages.toLocaleString("es")}</strong><small>aproximadamente</small></article>
            <article><span>Puntuación media</span><strong>{average ? average.toFixed(1) : "—"}</strong><small>sobre 10</small></article>
            <article><span>Autor más leído</span><strong className="author-stat">{topAuthor?.[0] ?? "—"}</strong><small>{topAuthor ? `${topAuthor[1]} libros` : "sin datos"}</small></article>
          </section>
          <section className="stats-insights">
            <article className="status-overview">
              <div>
                <p className="eyebrow">Tu biblioteca hoy</p>
                <h2>Lecturas por estado</h2>
              </div>
              <LibraryStatusChart data={statusData} />
              <div className="status-legend">
                <span className="to-read"><i />Quiero leer<strong>{statusCounts.toRead}</strong></span>
                <span className="read"><i />Leídos<strong>{statusCounts.read}</strong></span>
              </div>
            </article>
            <article className="rating-overview">
              <div>
                <p className="eyebrow">Valoraciones</p>
                <h2>Cómo puntúas</h2>
              </div>
              <RatingChart data={ratingCounts} />
            </article>
          </section>
          <section className="year-chart">
            <div className="section-title"><div><p className="eyebrow">Ritmo de lectura</p><h2>Libros por año</h2></div></div>
            {years.length
              ? <ReadingYearsChart data={yearData} />
              : <div className="big-empty compact"><p>Los años aparecerán cuando termines tus primeras lecturas.</p></div>}
          </section>
          {anime.length > 0 && !animeError && (
            <section className="year-chart anime-year-summary">
              <div className="section-title"><div><p className="eyebrow">Anime</p><h2>Anime vistos este año</h2></div></div>
              <div className="stat-grid">
                <article><span>Animes vistos</span><strong>{animeThisYear.length}</strong><small>{animeYear}</small></article>
                <article><span>Capítulos</span><strong>{animeThisYearEpisodes.toLocaleString("es")}</strong><small>aproximadamente</small></article>
              </div>
              <Link className="button secondary" href="/anime/estadisticas">Ver todas las estadísticas de anime →</Link>
            </section>
          )}
        </>
      )}

      {tab === "favoritos" && (
        <>
          <section className="favorites-panel">
            <div className="section-title">
              <div><p className="eyebrow">Tu selección</p><h2>Los imprescindibles</h2></div>
              <span className="section-count">{favorites.length} libro{favorites.length === 1 ? "" : "s"}</span>
            </div>
            {favorites.length
              ? <div className="plain-book-list">{favorites.map((book) => <BookRow key={book.$id} book={book} />)}</div>
              : <div className="big-empty compact"><p>Marca un libro leído con ★ y aparecerá aquí como imprescindible.</p></div>}
          </section>

          <section className="favorites-panel stats-subsection">
            <div className="section-title"><div><p className="eyebrow">Año a año</p><h2>Favoritos por año</h2></div></div>
            {favoriteYears.length ? (
              <div className="year-groups">
                {favoriteYears.map((year) => (
                  <section className="year-group" key={year}>
                    <div className="year-marker"><strong>{year}</strong><span>{favoritesForYear(year).length} favorito{favoritesForYear(year).length === 1 ? "" : "s"}</span></div>
                    <div>{favoritesForYear(year).map((book) => <BookRow key={book.$id} book={book} />)}</div>
                  </section>
                ))}
                {favoritesWithoutYear.length > 0 && (
                  <section className="year-group">
                    <div className="year-marker"><strong>—</strong><span>Sin año registrado</span></div>
                    <div>{favoritesWithoutYear.map((book) => <BookRow key={book.$id} book={book} />)}</div>
                  </section>
                )}
              </div>
            ) : <div className="big-empty compact"><p>Cuando tus favoritos tengan año de lectura, se agruparán aquí.</p></div>}
          </section>
        </>
      )}

      {tab === "valoraciones" && (
        <section className="rating-groups">
          {RATING_VALUES_DESC.map((rating) => {
            const list = booksForRating(rating);
            return (
              <section className="rating-group" key={rating}>
                <div className="rating-marker" aria-label={`${rating} de ${MAX_RATING} estrellas`}>
                  <strong aria-hidden="true">★ {rating}<em>/ {MAX_RATING}</em></strong>
                  <span>{list.length} libro{list.length === 1 ? "" : "s"}</span>
                </div>
                {list.length
                  ? <div>{list.map((book) => <BookRow key={book.$id} book={book} />)}</div>
                  : <div className="big-empty compact"><p>Todavía no hay libros valorados con {rating} estrella{rating === 1 ? "" : "s"}.</p></div>}
              </section>
            );
          })}
        </section>
      )}

      <section className="backup-note"><div><h2>Tu biblioteca, siempre tuya</h2><p>JSON conserva o restaura todos los datos. PDF abre la vista de impresión para guardar un listado legible.</p></div><span>Una copia cuando tú quieras</span></section>
    </>
  );
}
