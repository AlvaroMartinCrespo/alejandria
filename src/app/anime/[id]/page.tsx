"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimeCover } from "@/components/anime-cover";
import { useAnime } from "@/components/anime-provider";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { ANIME_STATUS_LABELS } from "@/lib/anime-utils";
import { RATING_VALUES } from "@/lib/rating";
import type { AnimeStatus } from "@/types/anime";

/** Campo de texto: se guarda al salir del campo o con Enter, no en cada tecla. */
function TextField({
  label,
  value,
  disabled,
  placeholder,
  lang,
  maxLength,
  onCommit,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  lang?: string;
  maxLength?: number;
  onCommit: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        key={value}
        defaultValue={value}
        disabled={disabled}
        placeholder={placeholder}
        lang={lang}
        maxLength={maxLength}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== value) onCommit(next);
        }}
      />
    </label>
  );
}

/** Campo numérico libre: se guarda al salir del campo o con Enter. */
function NumberField({
  label,
  value,
  disabled,
  minimum,
  maximum,
  nullable = false,
  placeholder,
  onCommit,
}: {
  label: string;
  value: number | null;
  disabled: boolean;
  minimum: number;
  maximum: number;
  nullable?: boolean;
  placeholder?: string;
  onCommit: (value: number | null) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        key={String(value)}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        defaultValue={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        onBlur={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            if (nullable && value !== null) onCommit(null);
            else event.target.value = value === null ? "" : String(value);
            return;
          }
          const next = Number(raw);
          if (!Number.isInteger(next) || next < minimum || next > maximum) {
            event.target.value = value === null ? "" : String(value);
            return;
          }
          if (next !== value) onCommit(next);
        }}
      />
    </label>
  );
}

export default function AnimeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { editing, loading: libraryLoading, showNotice } = useLibrary();
  const {
    anime: list,
    animeError,
    animeLoading,
    removeAnime,
    setAnimeStatus,
    setProgress,
    toggleAnimeFavorite,
    updateAnime,
  } = useAnime();
  const [saved, setSaved] = useState(false);
  const anime = list.find((item) => item.$id === id);

  if (libraryLoading || animeLoading) return <LibrarySkeleton rows={2} />;
  if (animeError) {
    return (
      <div className="big-empty">
        <strong>{animeError}</strong>
        <button className="button secondary" onClick={() => router.push("/anime")}>Volver</button>
      </div>
    );
  }
  if (!anime) {
    return (
      <div className="big-empty">
        <strong>Este anime no está en tu lista.</strong>
        <button className="button secondary" onClick={() => router.push("/anime")}>Volver a anime</button>
      </div>
    );
  }

  const current = anime;
  const seasonMax = Math.max(current.totalSeasons ?? 0, current.currentSeason + 1, 10);
  const seasons = Array.from({ length: seasonMax }, (_, index) => index + 1);
  const percent = current.totalEpisodes
    ? Math.min(100, Math.round((current.currentEpisode / current.totalEpisodes) * 100))
    : null;

  async function save(changes: Parameters<typeof updateAnime>[1]) {
    try {
      await updateAnime(current.$id, changes);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch {
      // El proveedor ya restauró el valor anterior y avisó del error.
    }
  }

  return (
    <>
      <button className="back-button" onClick={() => router.back()}>← Volver</button>
      <section className="detail-hero">
        <div className="detail-cover"><AnimeCover title={current.title} url={current.coverUrl} priority /></div>
        <div className="detail-title">
          <div className="detail-chips">
            <span className={`status-chip ${current.status}`}>{ANIME_STATUS_LABELS[current.status]}</span>
            {current.favorite && <span className="status-chip favorite">Favorito</span>}
            {saved && <span className="status-chip">Guardado</span>}
          </div>
          <h1>{current.title}</h1>
          {current.titleJapanese && <p lang="ja" className="anime-title-ja">{current.titleJapanese}</p>}
          <div className="status-actions">
            {(Object.entries(ANIME_STATUS_LABELS) as [AnimeStatus, string][]).filter(([status]) => status !== current.status).map(([status, label]) => (
              <button key={status} className="button secondary compact" disabled={!editing} onClick={() => void setAnimeStatus(current.$id, status).catch(() => undefined)}>{label}</button>
            ))}
            <button className={`button secondary compact favorite-toggle${current.favorite ? " active" : ""}`} disabled={!editing} onClick={() => void toggleAnimeFavorite(current.$id).catch(() => undefined)}>
              <span aria-hidden="true">{current.favorite ? "★" : "☆"}</span>{current.favorite ? "Quitar favorito" : "Favorito"}
            </button>
          </div>
        </div>
      </section>

      <section className="anime-progress-panel" aria-label="Progreso">
        <p className="anime-progress-text">
          Temporada {current.currentSeason} · Cap. {current.currentEpisode}{current.totalEpisodes !== null ? ` / ${current.totalEpisodes}` : ""}
        </p>
        {percent !== null && (
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progreso de la temporada">
            <i style={{ width: `${percent}%` }} />
          </div>
        )}
        <div className="detail-facts">
          <label>
            <span>Temporada actual</span>
            <select
              value={current.currentSeason}
              disabled={!editing}
              onChange={(event) => setProgress(current.$id, { season: Number(event.target.value) })}
            >
              {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
            </select>
          </label>
          <NumberField
            label="Capítulo actual"
            value={current.currentEpisode}
            disabled={!editing}
            minimum={0}
            maximum={100000}
            onCommit={(episode) => { if (episode !== null) setProgress(current.$id, { episode }); }}
          />
        </div>
      </section>

      <section className="detail-facts anime-facts">
        <TextField label="Título" value={current.title} disabled={!editing} maxLength={500} onCommit={(title) => {
          if (!title) showNotice("error", "El título no puede estar vacío.");
          else void save({ title });
        }} />
        <TextField label="Título japonés" value={current.titleJapanese} lang="ja" disabled={!editing} maxLength={500} onCommit={(titleJapanese) => void save({ titleJapanese })} />
        <TextField label="Portada (URL https)" value={current.coverUrl ?? ""} disabled={!editing} placeholder="https://" onCommit={(coverUrl) => {
          if (coverUrl && !coverUrl.startsWith("https://")) showNotice("error", "La portada debe ser una URL https://.");
          else void save({ coverUrl: coverUrl || null });
        }} />
        <NumberField label="Año" value={current.releaseYear} disabled={!editing} minimum={1900} maximum={2100} nullable placeholder="Año" onCommit={(releaseYear) => void save({ releaseYear })} />
        <TextField label="Formato" value={current.mediaFormat} disabled={!editing} maxLength={30} placeholder="TV, Movie, OVA…" onCommit={(mediaFormat) => void save({ mediaFormat })} />
        <TextField label="Géneros (separados por comas)" value={current.genres.join(", ")} disabled={!editing} placeholder="Acción, Aventura" onCommit={(value) => {
          const genres = Array.from(new Set(value.split(",").map((genre) => genre.trim()).filter(Boolean))).slice(0, 30);
          void save({ genres });
        }} />
        <NumberField label="Capítulos totales (temporada actual)" value={current.totalEpisodes} disabled={!editing} minimum={0} maximum={100000} nullable placeholder="Desconocido" onCommit={(totalEpisodes) => void save({ totalEpisodes })} />
        <NumberField label="Temporadas totales" value={current.totalSeasons} disabled={!editing} minimum={1} maximum={100} nullable placeholder="Desconocido" onCommit={(totalSeasons) => void save({ totalSeasons })} />
        <div className="rating-fact">
          <span>Tu puntuación</span>
          <div>
            {RATING_VALUES.map((rating) => (
              <button key={rating} disabled={!editing} className={(current.rating ?? 0) >= rating ? "selected" : ""} onClick={() => void save({ rating })} aria-label={`${rating} estrellas`}>★</button>
            ))}
            {current.rating !== null && (
              <button disabled={!editing} className="rating-clear" onClick={() => void save({ rating: null })} aria-label="Quitar puntuación">×</button>
            )}
          </div>
        </div>
        {current.status === "watched" && (
          <NumberField label="Terminado en" value={current.finishedYear} disabled={!editing} minimum={1900} maximum={2100} nullable onCommit={(finishedYear) => void save({ finishedYear })} />
        )}
      </section>

      <div className="detail-columns">
        <details className="synopsis" open>
          <summary><h2>Sinopsis</h2><span>⌄</span></summary>
          <textarea
            key={current.synopsis}
            defaultValue={current.synopsis}
            disabled={!editing}
            maxLength={20000}
            rows={8}
            placeholder="Este anime no tiene una sinopsis disponible."
            onBlur={(event) => { if (event.target.value.trim() !== current.synopsis) void save({ synopsis: event.target.value.trim() }); }}
          />
        </details>
        <section className="notes-section">
          <div><h2>Notas personales</h2>{saved && <span>Guardado</span>}</div>
          <textarea
            key={current.notes}
            defaultValue={current.notes}
            disabled={!editing}
            maxLength={50000}
            placeholder="Ideas, escenas favoritas o impresiones de este anime..."
            onBlur={(event) => { if (event.target.value !== current.notes) void save({ notes: event.target.value }); }}
          />
        </section>
      </div>

      <section className="danger-zone">
        <div><strong>Eliminar de la lista</strong><p>Esta acción no se puede deshacer.</p></div>
        <button
          disabled={!editing}
          className="danger-button"
          onClick={async () => {
            if (!window.confirm(`¿Eliminar “${current.title}”?`)) return;
            try {
              await removeAnime(current.$id);
              router.push("/anime");
            } catch {
              // El proveedor ya mostró el error y restauró el anime.
            }
          }}
        >
          Eliminar anime
        </button>
      </section>
    </>
  );
}
