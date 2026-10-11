"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AnimeCover } from "@/components/anime-cover";
import { useAnime } from "@/components/anime-provider";
import { ANIME_STATUS_LABELS, animeTitleKey, splitSeasonFromTitle } from "@/lib/anime-utils";
import type { AnimeSearchResult, AnimeStatus } from "@/types/anime";

type Tab = "search" | "manual";

function digits(value: string, maxLength: number) {
  return value.replace(/[^\d]/g, "").slice(0, maxLength);
}

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

export function AddAnimeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAnime, anime } = useAnime();
  const [tab, setTab] = useState<Tab>("search");

  // Búsqueda
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("0");
  const activeRequest = useRef<AbortController | null>(null);

  // Manual
  const [title, setTitle] = useState("");
  const [titleJapanese, setTitleJapanese] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [mediaFormat, setMediaFormat] = useState("");
  const [totalEpisodes, setTotalEpisodes] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [status, setStatus] = useState<AnimeStatus>("to_watch");
  const [manualSeason, setManualSeason] = useState("1");
  const [manualEpisode, setManualEpisode] = useState("0");
  const [manualMessage, setManualMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const searchAnime = useEffectEvent(async (term: string) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setSearching(true);
    setMessage("");
    try {
      const response = await fetch(`/api/anime-search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      });
      const data = (await response.json()) as { anime?: AnimeSearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error || `La búsqueda respondió con ${response.status}.`);
      setResults(data.anime ?? []);
      setPendingId(null);
      if (!data.anime?.length) setMessage("No encontramos coincidencias.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResults([]);
      setMessage(error instanceof Error ? error.message : "No se pudo conectar con el servicio de anime.");
    } finally {
      if (activeRequest.current === controller) setSearching(false);
    }
  });

  useEffect(() => {
    if (query.trim().length < 2) {
      activeRequest.current?.abort();
      // Se difiere para no actualizar estado de forma síncrona dentro del efecto.
      const reset = window.setTimeout(() => {
        setResults([]);
        setMessage("");
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(reset);
    }
    const timer = window.setTimeout(() => void searchAnime(query.trim()), 700);
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

  useEffect(() => () => activeRequest.current?.abort(), []);

  if (!open) return null;

  const existingKeys = new Set(anime.map((item) => animeTitleKey(item.title)));
  const existingSources = new Set(anime.map((item) => item.sourceId).filter(Boolean));

  function isAdded(result: AnimeSearchResult) {
    const { baseTitle } = splitSeasonFromTitle(result.title);
    return existingSources.has(result.sourceId) || existingKeys.has(animeTitleKey(baseTitle));
  }

  async function addFromResult(result: AnimeSearchResult, nextStatus: AnimeStatus, startSeason: number, startEpisode: number) {
    const detected = splitSeasonFromTitle(result.title);
    try {
      await addAnime({
        sourceId: result.sourceId,
        title: detected.baseTitle,
        titleJapanese: result.titleJapanese,
        coverUrl: result.coverUrl,
        releaseYear: result.releaseYear,
        mediaFormat: result.mediaFormat,
        totalEpisodes: result.totalEpisodes,
        genres: result.genres,
        synopsis: result.synopsis,
        status: nextStatus,
        currentSeason: nextStatus === "watching" ? startSeason : detected.season,
        currentEpisode: nextStatus === "watching" ? startEpisode : 0,
      });
      setPendingId(null);
      setMessage(`“${detected.baseTitle}” se añadió a ${ANIME_STATUS_LABELS[nextStatus]}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo añadir.");
    }
  }

  function startWatching(result: AnimeSearchResult) {
    setSeason(String(splitSeasonFromTitle(result.title).season));
    setEpisode("0");
    setPendingId(result.sourceId);
  }

  async function submitManual(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setManualMessage("El título es obligatorio.");
      return;
    }
    const cover = coverUrl.trim();
    if (cover && !cover.startsWith("https://")) {
      setManualMessage("La portada debe ser una URL https://.");
      return;
    }
    const year = optionalNumber(releaseYear);
    if (year !== null && (year < 1900 || year > 2100)) {
      setManualMessage("El año debe estar entre 1900 y 2100.");
      return;
    }
    const startSeason = Math.min(100, Math.max(1, Number(manualSeason) || 1));
    const startEpisode = Math.min(100000, Math.max(0, Number(manualEpisode) || 0));
    const matching = anime.find((item) => animeTitleKey(item.title) === animeTitleKey(cleanTitle));
    if (matching) {
      setManualMessage("Ya tienes un anime con ese título.");
      return;
    }

    setSaving(true);
    try {
      await addAnime({
        title: cleanTitle,
        titleJapanese: titleJapanese.trim(),
        coverUrl: cover || null,
        releaseYear: year,
        mediaFormat: mediaFormat.trim(),
        totalEpisodes: optionalNumber(totalEpisodes),
        synopsis: synopsis.trim(),
        status,
        currentSeason: status === "watching" ? startSeason : 1,
        currentEpisode: status === "watching" ? startEpisode : 0,
        sourceId: "",
      });
      setManualMessage(`“${cleanTitle}” se añadió a ${ANIME_STATUS_LABELS[status]}.`);
      setTitle("");
      setTitleJapanese("");
      setCoverUrl("");
      setReleaseYear("");
      setMediaFormat("");
      setTotalEpisodes("");
      setSynopsis("");
      setManualSeason("1");
      setManualEpisode("0");
    } catch (error) {
      setManualMessage(error instanceof Error ? error.message : "No se pudo añadir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel anime-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-anime-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Jikan · AniList</p>
            <h2 id="add-anime-title">Añadir un anime</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="anime-modal-tabs" role="tablist" aria-label="Forma de añadir">
          <button type="button" role="tab" aria-selected={tab === "search"} className={tab === "search" ? "active" : ""} onClick={() => setTab("search")}>Buscar</button>
          <button type="button" role="tab" aria-selected={tab === "manual"} className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Manual</button>
        </div>

        {tab === "search" ? (
          <>
            <div className="search-field large">
              <span aria-hidden="true">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Título del anime"
                maxLength={120}
              />
              {searching && <span className="spinner" aria-label="Buscando" />}
            </div>
            <div className="search-results" aria-live="polite">
              {!query && (
                <div className="search-prompt">
                  <strong>Encuentra tu próximo anime</strong>
                  <p>Escribe al menos dos caracteres para buscar en el catálogo.</p>
                </div>
              )}
              {results.length > 0 && (
                <p className="anime-search-hint">Añade el anime una sola vez y elige tu temporada y capítulo.</p>
              )}
              {message && <p className="empty-inline">{message}</p>}
              {results.map((result) => {
                const added = isAdded(result);
                const detected = splitSeasonFromTitle(result.title);
                const confirming = pendingId === result.sourceId;
                const meta = [result.mediaFormat, result.releaseYear].filter(Boolean).join(" · ");
                return (
                  <article className="result-row anime-result" key={result.sourceId}>
                    <AnimeCover title={detected.baseTitle} url={result.coverUrl} />
                    <div>
                      <strong>{detected.baseTitle}</strong>
                      {result.titleJapanese && <p lang="ja">{result.titleJapanese}</p>}
                      <small>{meta || "Sin datos"}{detected.season > 1 ? ` · Temporada ${detected.season}` : ""}</small>
                    </div>
                    {added ? (
                      <button className="button secondary compact" disabled>Ya añadido</button>
                    ) : (
                      <div className="anime-result-actions">
                        <button className="button secondary compact" onClick={() => void addFromResult(result, "to_watch", 1, 0)}>Pendiente</button>
                        <button className="button secondary compact" onClick={() => startWatching(result)} aria-expanded={confirming}>Viendo</button>
                        <button className="button secondary compact" onClick={() => void addFromResult(result, "watched", 1, 0)}>Visto</button>
                      </div>
                    )}
                    {!added && confirming && (
                      <div className="anime-start-fields">
                        <label>
                          <span>Temporada</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={season}
                            onChange={(event) => setSeason(digits(event.target.value, 3))}
                            onFocus={(event) => event.currentTarget.select()}
                          />
                        </label>
                        <label>
                          <span>Capítulo por el que voy</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={episode}
                            onChange={(event) => setEpisode(digits(event.target.value, 6))}
                            onFocus={(event) => event.currentTarget.select()}
                          />
                        </label>
                        <button
                          className="button primary compact"
                          onClick={() => void addFromResult(
                            result,
                            "watching",
                            Math.min(100, Math.max(1, Number(season) || 1)),
                            Math.min(100000, Math.max(0, Number(episode) || 0)),
                          )}
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <form className="anime-manual-form" onSubmit={(event) => void submitManual(event)}>
            <label>
              <span>Título *</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={500} required autoFocus />
            </label>
            <label>
              <span>Título japonés</span>
              <input lang="ja" value={titleJapanese} onChange={(event) => setTitleJapanese(event.target.value)} maxLength={500} />
            </label>
            <label>
              <span>URL de portada (https)</span>
              <input type="url" inputMode="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://" />
            </label>
            <div className="anime-form-grid">
              <label>
                <span>Año</span>
                <input inputMode="numeric" value={releaseYear} onChange={(event) => setReleaseYear(digits(event.target.value, 4))} />
              </label>
              <label>
                <span>Formato</span>
                <input value={mediaFormat} onChange={(event) => setMediaFormat(event.target.value.slice(0, 30))} placeholder="TV, Movie, OVA…" />
              </label>
              <label>
                <span>Capítulos totales</span>
                <input inputMode="numeric" value={totalEpisodes} onChange={(event) => setTotalEpisodes(digits(event.target.value, 6))} />
              </label>
              <label>
                <span>Estado</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as AnimeStatus)}>
                  {(Object.entries(ANIME_STATUS_LABELS) as [AnimeStatus, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            {status === "watching" && (
              <div className="anime-form-grid">
                <label>
                  <span>Temporada actual</span>
                  <input inputMode="numeric" value={manualSeason} onChange={(event) => setManualSeason(digits(event.target.value, 3))} onFocus={(event) => event.currentTarget.select()} />
                </label>
                <label>
                  <span>Capítulo actual</span>
                  <input inputMode="numeric" value={manualEpisode} onChange={(event) => setManualEpisode(digits(event.target.value, 6))} onFocus={(event) => event.currentTarget.select()} />
                </label>
              </div>
            )}
            <label>
              <span>Sinopsis</span>
              <textarea value={synopsis} onChange={(event) => setSynopsis(event.target.value)} rows={4} maxLength={20000} />
            </label>
            {manualMessage && <p className="empty-inline" aria-live="polite">{manualMessage}</p>}
            <button className="button primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Añadir anime"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
