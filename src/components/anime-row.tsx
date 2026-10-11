"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimeCover } from "@/components/anime-cover";
import { useAnime } from "@/components/anime-provider";
import { useLibrary } from "@/components/library-provider";
import { ANIME_STATUS_LABELS } from "@/lib/anime-utils";
import type { Anime, AnimeStatus } from "@/types/anime";

export function AnimeRow({
  anime,
  sortable = false,
  overlay = false,
  onMoveUp,
  onMoveDown,
}: {
  anime: Anime;
  sortable?: boolean;
  overlay?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const { editing } = useLibrary();
  const { setAnimeStatus, setProgress, toggleAnimeFavorite } = useAnime();
  const [draft, setDraft] = useState<string | null>(null);
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: anime.$id,
    disabled: !sortable || overlay || !editing,
  });

  const seasonMax = Math.max(anime.totalSeasons ?? 0, anime.currentSeason + 1, 10);
  const seasons = Array.from({ length: seasonMax }, (_, index) => index + 1);
  const total = anime.totalEpisodes;
  const percent = total ? Math.min(100, Math.round((anime.currentEpisode / total) * 100)) : null;
  const finishedSeason = anime.totalSeasons === null || anime.currentSeason >= anime.totalSeasons;
  const canSuggestWatched = editing
    && anime.status === "watching"
    && total !== null
    && total > 0
    && anime.currentEpisode >= total
    && finishedSeason;
  const meta = [anime.mediaFormat, anime.releaseYear].filter(Boolean).join(" · ");

  function commitEpisode() {
    if (draft === null) return;
    const value = draft.trim();
    setDraft(null);
    if (!/^\d+$/.test(value)) return;
    const episode = Number(value);
    if (episode !== anime.currentEpisode) setProgress(anime.$id, { episode });
  }

  return (
    <article
      className="book-row anime-row"
      data-sortable={sortable && editing || undefined}
      data-dragging={isDragging || undefined}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {sortable && editing && !overlay && (
        <button className="drag-handle" type="button" title="Arrastrar para reordenar" aria-label={`Arrastrar ${anime.title}`} {...attributes} {...listeners}>
          <GripVertical size={18} aria-hidden="true" />
        </button>
      )}
      <Link href={`/anime/${anime.$id}`} className="row-cover" aria-label={`Abrir ${anime.title}`}>
        <AnimeCover title={anime.title} url={anime.coverUrl} />
      </Link>
      <div className="book-row-copy anime-row-copy">
        <Link href={`/anime/${anime.$id}`} className="book-title-link">
          {anime.title}
        </Link>
        {anime.titleJapanese && <p lang="ja" className="anime-title-ja">{anime.titleJapanese}</p>}
        <div className="book-meta-inline">
          {meta && <span>{meta}</span>}
          <span className="anime-progress-text">
            Temporada {anime.currentSeason} · Cap. {anime.currentEpisode}{total !== null ? ` / ${total}` : ""}
          </span>
          {anime.rating !== null && <span className="rating">★ {anime.rating}</span>}
        </div>
        {percent !== null && (
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`Progreso de ${anime.title}`}>
            <i style={{ width: `${percent}%` }} />
          </div>
        )}
        {editing && (
          <div className="anime-progress-controls">
            <label className="anime-season-select">
              <span>Temporada</span>
              <select
                value={anime.currentSeason}
                onChange={(event) => setProgress(anime.$id, { season: Number(event.target.value) })}
                aria-label={`Temporada de ${anime.title}`}
              >
                {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
              </select>
            </label>
            <label className="anime-episode-field">
              <span>Capítulo</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                className="anime-episode-input"
                value={draft ?? String(anime.currentEpisode)}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                onBlur={commitEpisode}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") setDraft(null);
                }}
                aria-label={`Capítulo actual de ${anime.title}`}
              />
            </label>
          </div>
        )}
        {canSuggestWatched && (
          <button
            type="button"
            className="button secondary compact anime-mark-watched"
            onClick={() => void setAnimeStatus(anime.$id, "watched").catch(() => undefined)}
          >
            Marcar como visto
          </button>
        )}
      </div>
      <button
        className={`favorite-button${anime.favorite ? " active" : ""}`}
        onClick={() => void toggleAnimeFavorite(anime.$id).catch(() => undefined)}
        aria-label={anime.favorite ? `Quitar ${anime.title} de favoritos` : `Añadir ${anime.title} a favoritos`}
        aria-pressed={anime.favorite}
        title={anime.favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        disabled={!editing}
      >
        <span aria-hidden="true">{anime.favorite ? "★" : "☆"}</span>
      </button>
      {editing ? <details className={`status-control ${anime.status}`}>
        <summary aria-label={`Cambiar estado de ${anime.title}`}>
          <i className="status-dot" aria-hidden="true" />
          <span>{ANIME_STATUS_LABELS[anime.status]}</span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="status-menu">
          {(Object.entries(ANIME_STATUS_LABELS) as [AnimeStatus, string][])
            .filter(([value]) => value !== anime.status)
            .map(([value, label]) => (
              <button
                key={value}
                className={`status-option ${value}`}
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  void setAnimeStatus(anime.$id, value).catch(() => undefined);
                }}
              >
                <i className="status-dot" aria-hidden="true" />{label}
              </button>
            ))}
        </div>
      </details> : <span className={`status-control status-locked ${anime.status}`}><i className="status-dot" aria-hidden="true" /><span>{ANIME_STATUS_LABELS[anime.status]}</span></span>}
      {sortable && editing && !overlay && (
        <div className="reorder-buttons" aria-label={`Reordenar ${anime.title}`}>
          <button onClick={onMoveUp} disabled={!onMoveUp} aria-label="Subir en la lista">↑</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} aria-label="Bajar en la lista">↓</button>
        </div>
      )}
    </article>
  );
}
