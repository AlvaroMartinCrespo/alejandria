"use client";

import { useState } from "react";
import { AnimeGenresChart, AnimeRatingChart, AnimeStatusChart, AnimeYearsChart } from "@/components/anime-charts";
import { AnimeRow } from "@/components/anime-row";
import { AnimeTabs } from "@/components/anime-tabs";
import { useAnime } from "@/components/anime-provider";
import { JapaneseHeading } from "@/components/japanese-heading";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { ANIME_STATUS_COLORS, ANIME_STATUS_LABELS, animeEpisodesWatched } from "@/lib/anime-utils";
import type { Anime, AnimeStatus } from "@/types/anime";

type Tab = "resumen" | "este-ano" | "favoritos" | "valoraciones";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "este-ano", label: "Este año" },
  { id: "favoritos", label: "Favoritos" },
  { id: "valoraciones", label: "Valoraciones" },
];

const STATUS_ORDER: AnimeStatus[] = ["watching", "to_watch", "on_hold", "watched", "dropped"];

function sortByFinishedDesc(left: Anime, right: Anime) {
  if ((right.finishedYear ?? 0) !== (left.finishedYear ?? 0)) return (right.finishedYear ?? 0) - (left.finishedYear ?? 0);
  return new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime();
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default function AnimeStatisticsPage() {
  const { loading: libraryLoading } = useLibrary();
  const { anime, animeError, animeLoading } = useAnime();
  const currentYear = new Date().getFullYear();
  const [tab, setTab] = useState<Tab>("resumen");
  const [selectedYear, setSelectedYear] = useState(currentYear);

  if (libraryLoading || animeLoading) return <LibrarySkeleton />;

  if (animeError) {
    return (
      <>
        <JapaneseHeading />
        <AnimeTabs />
        <section className="big-empty">
          <h2>No se pudo cargar el anime</h2>
          <p>{animeError}</p>
        </section>
      </>
    );
  }

  const watched = anime.filter((item) => item.status === "watched");
  const watchedThisYear = watched.filter((item) => item.finishedYear === currentYear);
  const episodes = anime.reduce((sum, item) => sum + animeEpisodesWatched(item), 0);
  const rated = watched.filter((item) => item.rating !== null);
  const average = rated.length ? rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length : 0;

  const genreCounts = watched.flatMap((item) => item.genres).reduce<Record<string, number>>((counts, genre) => {
    counts[genre] = (counts[genre] ?? 0) + 1;
    return counts;
  }, {});
  const genreRanking = Object.entries(genreCounts).sort((left, right) => right[1] - left[1]);
  const topGenre = genreRanking[0];
  const genreData = genreRanking.slice(0, 8).map(([genre, count]) => ({ genre, count }));

  const statusCounts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, anime.filter((item) => item.status === status).length]),
  ) as Record<AnimeStatus, number>;
  const statusData = STATUS_ORDER.map((status) => ({
    name: ANIME_STATUS_LABELS[status],
    value: statusCounts[status],
    color: ANIME_STATUS_COLORS[status],
  }));
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: watched.filter((item) => item.rating === rating).length,
  }));
  const years = Array.from(new Set(watched.map((item) => item.finishedYear).filter(Boolean) as number[])).sort((left, right) => left - right);
  const yearData = years.map((year) => ({
    year,
    count: watched.filter((item) => item.finishedYear === year).length,
  }));

  // Este año: años disponibles (siempre incluye el actual), de más reciente a más antiguo.
  const yearOptions = Array.from(new Set([currentYear, ...years])).sort((left, right) => right - left);
  const yearList = watched.filter((item) => item.finishedYear === selectedYear).sort(sortByFinishedDesc);
  const yearEpisodes = yearList.reduce((sum, item) => sum + animeEpisodesWatched(item), 0);

  const favorites = anime.filter((item) => item.favorite).sort(sortByFinishedDesc);

  function animeForRating(rating: number) {
    return watched.filter((item) => item.rating === rating).sort(sortByFinishedDesc);
  }

  return (
    <>
      <JapaneseHeading />
      <AnimeTabs />

      <div className="stats-tabs" role="tablist" aria-label="Vistas de estadísticas de anime">
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
            <article><span>Animes vistos</span><strong>{watched.length}</strong><small>en total</small></article>
            <article><span>Vistos este año</span><strong>{watchedThisYear.length}</strong><small>{currentYear}</small></article>
            <article><span>Capítulos vistos</span><strong>{episodes.toLocaleString("es")}</strong><small>aproximadamente</small></article>
            <article><span>Puntuación media</span><strong>{average ? average.toFixed(1) : "—"}</strong><small>sobre 5</small></article>
            <article><span>Género más visto</span><strong className="author-stat">{topGenre?.[0] ?? "—"}</strong><small>{topGenre ? plural(topGenre[1], "anime", "animes") : "sin datos"}</small></article>
          </section>
          <section className="stats-insights">
            <article className="status-overview">
              <div>
                <p className="eyebrow">Tu lista hoy</p>
                <h2>Animes por estado</h2>
              </div>
              <AnimeStatusChart data={statusData} />
              <div className="status-legend anime-status-legend">
                {STATUS_ORDER.map((status) => (
                  <span className={status} key={status}><i />{ANIME_STATUS_LABELS[status]}<strong>{statusCounts[status]}</strong></span>
                ))}
              </div>
            </article>
            <article className="rating-overview">
              <div>
                <p className="eyebrow">Valoraciones</p>
                <h2>Cómo puntúas</h2>
              </div>
              <AnimeRatingChart data={ratingCounts} />
            </article>
          </section>
          <section className="year-chart">
            <div className="section-title"><div><p className="eyebrow">Ritmo</p><h2>Animes vistos por año</h2></div></div>
            {years.length
              ? <AnimeYearsChart data={yearData} />
              : <div className="big-empty compact"><p>Los años aparecerán cuando termines tus primeros animes.</p></div>}
          </section>
          <section className="year-chart">
            <div className="section-title"><div><p className="eyebrow">Gustos</p><h2>Top 8 géneros</h2></div></div>
            {genreData.length
              ? <AnimeGenresChart data={genreData} />
              : <div className="big-empty compact"><p>Los géneros aparecerán cuando termines animes que los tengan.</p></div>}
          </section>
        </>
      )}

      {tab === "este-ano" && (
        <section className="favorites-panel">
          <div className="section-title">
            <div><p className="eyebrow">Año a año</p><h2>Vistos en {selectedYear}</h2></div>
            <label className="anime-sort">
              <span>Año</span>
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label="Año">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
          <p className="section-count">
            {plural(yearList.length, "anime", "animes")} · {plural(yearEpisodes, "capítulo", "capítulos")}
          </p>
          {yearList.length
            ? <div className="plain-book-list">{yearList.map((item) => <AnimeRow key={item.$id} anime={item} />)}</div>
            : <div className="big-empty compact"><p>No hay animes vistos en {selectedYear}.</p></div>}
        </section>
      )}

      {tab === "favoritos" && (
        <section className="favorites-panel">
          <div className="section-title">
            <div><p className="eyebrow">Tu selección</p><h2>Los imprescindibles</h2></div>
            <span className="section-count">{plural(favorites.length, "anime", "animes")}</span>
          </div>
          {favorites.length
            ? <div className="plain-book-list">{favorites.map((item) => <AnimeRow key={item.$id} anime={item} />)}</div>
            : <div className="big-empty compact"><p>Marca un anime con ★ y aparecerá aquí como imprescindible.</p></div>}
        </section>
      )}

      {tab === "valoraciones" && (
        <section className="rating-groups">
          {[5, 4, 3, 2, 1].map((rating) => {
            const list = animeForRating(rating);
            return (
              <section className="rating-group" key={rating}>
                <div className="rating-marker" aria-label={`${rating} de 5 estrellas`}>
                  <strong aria-hidden="true">{"★".repeat(rating)}<span className="dim">{"★".repeat(5 - rating)}</span></strong>
                  <span>{plural(list.length, "anime", "animes")}</span>
                </div>
                {list.length
                  ? <div>{list.map((item) => <AnimeRow key={item.$id} anime={item} />)}</div>
                  : <div className="big-empty compact"><p>Todavía no hay animes valorados con {rating} estrella{rating === 1 ? "" : "s"}.</p></div>}
              </section>
            );
          })}
        </section>
      )}
    </>
  );
}
