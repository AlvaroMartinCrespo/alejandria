"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLibrary } from "@/components/library-provider";
import { normalizeAnime } from "@/lib/anime-utils";
import type { AnimeChanges, AnimeInput } from "@/lib/anime-validation";
import type { Anime, AnimeStatus } from "@/types/anime";

const ANIME_STORAGE_KEY = "alejandria-anime-v1";
const MIGRATION_MESSAGE = "Falta aplicar la migración de anime en Supabase";
const PROGRESS_DEBOUNCE_MS = 400;
const MAX_SEASON = 100;
const MAX_EPISODE = 100000;

export type AddAnimeInput = Partial<AnimeInput> & { title: string };

interface AnimeContextValue {
  anime: Anime[];
  animeLoading: boolean;
  animeError: string | null;
  addAnime: (input: AddAnimeInput) => Promise<Anime>;
  updateAnime: (id: string, changes: AnimeChanges) => Promise<void>;
  setAnimeStatus: (id: string, status: AnimeStatus) => Promise<void>;
  toggleAnimeFavorite: (id: string) => Promise<void>;
  removeAnime: (id: string) => Promise<void>;
  /** Mueve el anime a `index` dentro de su grupo de estado (orden manual). */
  moveAnime: (id: string, index: number) => Promise<void>;
  /** Valor exacto escrito por el usuario (función principal). */
  setProgress: (id: string, progress: { season?: number; episode?: number }) => void;
  restoreAnime: (value: Anime[]) => Promise<number>;
}

const AnimeContext = createContext<AnimeContextValue | null>(null);

type PendingProgress = {
  timer: number;
  changes: AnimeChanges;
  baseline: Anime;
};

/** Orden manual: por `order` y, si falta o empata, por fecha de alta. */
export function compareManualOrder(left: Anime, right: Anime) {
  const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.addedAt.localeCompare(right.addedAt);
}

function toInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return null;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function AnimeProvider({ children }: { children: ReactNode }) {
  const { editing, loading: libraryLoading, showNotice, storageMode } = useLibrary();
  const [anime, setAnime] = useState<Anime[]>([]);
  const [animeLoading, setAnimeLoading] = useState(true);
  const [animeError, setAnimeError] = useState<string | null>(null);
  const animeRef = useRef<Anime[]>([]);
  const pendingRef = useRef(new Map<string, PendingProgress>());
  const loadedModeRef = useRef<"supabase" | "local" | null>(null);

  function setList(next: Anime[]) {
    animeRef.current = next;
    setAnime(next);
  }

  function patchLocal(id: string, changes: Partial<Anime>) {
    setList(animeRef.current.map((item) => (item.$id === id ? { ...item, ...changes } : item)));
  }

  function revertFields(id: string, previous: Anime, keys: string[]) {
    const revert = Object.fromEntries(
      keys.map((key) => [key, previous[key as keyof Anime]]),
    ) as Partial<Anime>;
    patchLocal(id, revert);
  }

  function requireEditing() {
    if (editing) return;
    showNotice("error", "La edición está bloqueada.");
    throw new Error("La edición está bloqueada.");
  }

  const loadAnime = useEffectEvent(async (mode: "supabase" | "local") => {
    if (mode === "supabase") {
      try {
        const response = await fetch("/api/anime", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { anime?: Anime[]; error?: string } | null;
        if (!response.ok || !data?.anime) {
          throw new Error(data?.error || MIGRATION_MESSAGE);
        }
        setList(data.anime.map(normalizeAnime));
        setAnimeError(null);
      } catch (error) {
        // No se cae a localStorage ni se afecta a los libros.
        setList([]);
        setAnimeError(error instanceof Error && error.message ? error.message : MIGRATION_MESSAGE);
      }
      setAnimeLoading(false);
      return;
    }

    let stored: Anime[] = [];
    const raw = window.localStorage.getItem(ANIME_STORAGE_KEY);
    if (raw) {
      try {
        stored = (JSON.parse(raw) as Anime[]).map(normalizeAnime);
      } catch {
        window.localStorage.removeItem(ANIME_STORAGE_KEY);
        showNotice("error", "La copia local de anime estaba dañada y se ha reiniciado.");
      }
    }
    setList(stored);
    setAnimeError(null);
    setAnimeLoading(false);
  });

  // Espera a que la biblioteca decida dónde guardar antes de cargar el anime.
  useEffect(() => {
    if (libraryLoading || loadedModeRef.current === storageMode) return;
    loadedModeRef.current = storageMode;
    void Promise.resolve().then(() => loadAnime(storageMode));
  }, [libraryLoading, storageMode]);

  useEffect(() => {
    if (!animeLoading && storageMode === "local") {
      window.localStorage.setItem(ANIME_STORAGE_KEY, JSON.stringify(anime));
    }
  }, [anime, animeLoading, storageMode]);

  async function flushProgress(id: string) {
    const entry = pendingRef.current.get(id);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    pendingRef.current.delete(id);
    try {
      const response = await fetch(`/api/anime/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.changes),
        keepalive: true,
      });
      if (!response.ok) throw new Error();
    } catch {
      if (animeRef.current.some((item) => item.$id === id)) {
        revertFields(id, entry.baseline, Object.keys(entry.changes));
      }
      showNotice("error", "No se pudo guardar el progreso. Se restauró el valor anterior.");
    }
  }

  const flushAll = useEffectEvent(() => {
    for (const id of Array.from(pendingRef.current.keys())) void flushProgress(id);
  });

  // Si se cierra o se oculta la pestaña con cambios sin enviar, se envían ya.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, []);

  async function addAnime(input: AddAnimeInput) {
    requireEditing();
    if (input.sourceId && animeRef.current.some((item) => item.sourceId === input.sourceId)) {
      throw new Error("Este anime ya está en tu lista.");
    }
    const status = input.status ?? "to_watch";
    const now = new Date();
    const draft: AddAnimeInput = {
      ...input,
      status,
      lastWatchedAt: input.lastWatchedAt ?? (status === "watching" ? now.toISOString() : null),
      finishedYear: input.finishedYear ?? (status === "watched" ? now.getFullYear() : null),
    };

    if (storageMode === "supabase") {
      const response = await fetch("/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (response.status === 409) throw new Error("Este anime ya está en tu lista.");
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "No se pudo guardar el anime.");
      }
      const created = normalizeAnime((await response.json()) as Anime);
      setList([...animeRef.current, created]);
      showNotice("success", "Anime añadido.");
      return created;
    }

    const created = normalizeAnime({
      ...draft,
      $id: crypto.randomUUID(),
      order: Date.now(),
      addedAt: now.toISOString(),
    });
    setList([...animeRef.current, created]);
    showNotice("success", "Anime añadido.");
    return created;
  }

  async function updateAnime(id: string, changes: AnimeChanges) {
    requireEditing();
    const previous = animeRef.current.find((item) => item.$id === id);
    if (!previous) return;
    patchLocal(id, changes);
    if (storageMode === "supabase") {
      let ok = false;
      try {
        const response = await fetch(`/api/anime/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        });
        ok = response.ok;
      } catch {
        ok = false;
      }
      if (!ok) {
        revertFields(id, previous, Object.keys(changes));
        showNotice("error", "No se pudo guardar el cambio. Se restauró el valor anterior.");
        throw new Error("No se pudo actualizar el anime.");
      }
    }
  }

  async function setAnimeStatus(id: string, status: AnimeStatus) {
    const changes: AnimeChanges = {
      status,
      finishedYear: status === "watched" ? new Date().getFullYear() : null,
    };
    if (status === "watching") changes.lastWatchedAt = new Date().toISOString();
    await updateAnime(id, changes);
  }

  async function toggleAnimeFavorite(id: string) {
    const item = animeRef.current.find((current) => current.$id === id);
    if (!item) return;
    await updateAnime(id, { favorite: !item.favorite });
  }

  async function removeAnime(id: string) {
    requireEditing();
    const previous = animeRef.current;
    const index = previous.findIndex((item) => item.$id === id);
    if (index < 0) return;
    const pending = pendingRef.current.get(id);
    if (pending) {
      window.clearTimeout(pending.timer);
      pendingRef.current.delete(id);
    }
    setList(previous.filter((item) => item.$id !== id));
    if (storageMode === "supabase") {
      let ok = false;
      try {
        ok = (await fetch(`/api/anime/${id}`, { method: "DELETE" })).ok;
      } catch {
        ok = false;
      }
      if (!ok) {
        const next = [...animeRef.current];
        next.splice(Math.min(index, next.length), 0, previous[index]);
        setList(next);
        showNotice("error", "No se pudo eliminar el anime.");
        throw new Error("No se pudo eliminar el anime.");
      }
    }
  }

  async function moveAnime(id: string, index: number) {
    requireEditing();
    const moved = animeRef.current.find((item) => item.$id === id);
    if (!moved) return;
    const group = animeRef.current
      .filter((item) => item.status === moved.status && item.$id !== id)
      .sort(compareManualOrder);
    group.splice(Math.max(0, Math.min(index, group.length)), 0, moved);
    const changes = new Map<string, number>();
    group.forEach((item, order) => {
      if (item.order !== order) changes.set(item.$id, order);
    });
    if (!changes.size) return;

    const previous = animeRef.current;
    setList(previous.map((item) => {
      const order = changes.get(item.$id);
      return order === undefined ? item : { ...item, order };
    }));
    if (storageMode === "supabase") {
      let ok = false;
      try {
        const response = await fetch("/api/anime/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moves: Array.from(changes, ([moveId, order]) => ({ id: moveId, order })) }),
        });
        ok = response.ok;
      } catch {
        ok = false;
      }
      if (!ok) {
        const previousOrders = new Map(previous.map((item) => [item.$id, item.order]));
        setList(animeRef.current.map((item) =>
          changes.has(item.$id) ? { ...item, order: previousOrders.get(item.$id) ?? null } : item,
        ));
        showNotice("error", "No se pudo reordenar los animes.");
        throw new Error("No se pudo reordenar los animes.");
      }
    }
  }

  function setProgress(id: string, progress: { season?: number; episode?: number }) {
    requireEditing();
    const current = animeRef.current.find((item) => item.$id === id);
    if (!current) return;

    const season = progress.season === undefined ? null : toInteger(progress.season, 1, MAX_SEASON);
    const episode = progress.episode === undefined ? null : toInteger(progress.episode, 0, MAX_EPISODE);
    if (season === null && episode === null) return;

    const changes: AnimeChanges = { lastWatchedAt: new Date().toISOString() };
    if (season !== null && season !== current.currentSeason) {
      changes.currentSeason = season;
      changes.totalEpisodes = null; // los capítulos totales eran de la temporada anterior
    }
    if (episode !== null) changes.currentEpisode = episode;

    const knownTotal = changes.totalEpisodes === null ? null : current.totalEpisodes;
    if (episode !== null && knownTotal !== null && episode > knownTotal) {
      showNotice("error", `El capítulo ${episode} supera los ${knownTotal} capítulos conocidos de esta temporada.`);
    }

    // La interfaz se actualiza al instante; la petición se agrupa por anime.
    const existing = pendingRef.current.get(id);
    patchLocal(id, changes);
    if (storageMode !== "supabase") return;

    if (existing) window.clearTimeout(existing.timer);
    pendingRef.current.set(id, {
      timer: window.setTimeout(() => void flushProgress(id), PROGRESS_DEBOUNCE_MS),
      changes: { ...(existing?.changes ?? {}), ...changes },
      baseline: existing?.baseline ?? current,
    });
  }

  async function restoreAnime(value: Anime[]) {
    requireEditing();
    if (!value.length) return 0;

    if (storageMode === "local") {
      const merged = new Map(animeRef.current.map((item) => [item.sourceId || item.$id, item]));
      value.forEach((item) => merged.set(item.sourceId || item.$id, item));
      setList(Array.from(merged.values()));
      showNotice("success", `${value.length} animes restaurados.`);
      return value.length;
    }

    try {
      const imported = await fetch("/api/anime/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "alejandria-library-backup", version: 3, anime: value }),
      });
      if (!imported.ok) throw new Error();
      const refreshed = await fetch("/api/anime", { cache: "no-store" });
      const data = (await refreshed.json()) as { anime: Anime[] };
      setList(data.anime.map(normalizeAnime));
      setAnimeError(null);
      showNotice("success", `${value.length} animes restaurados en Supabase.`);
      return value.length;
    } catch {
      showNotice("error", "La restauración de anime quedó incompleta. Revisa Supabase e inténtalo de nuevo.");
      throw new Error("No se pudo completar la restauración de anime.");
    }
  }

  return (
    <AnimeContext.Provider
      value={{
        anime,
        animeLoading,
        animeError,
        addAnime,
        updateAnime,
        setAnimeStatus,
        toggleAnimeFavorite,
        removeAnime,
        moveAnime,
        setProgress,
        restoreAnime,
      }}
    >
      {children}
    </AnimeContext.Provider>
  );
}

export function useAnime() {
  const value = useContext(AnimeContext);
  if (!value) throw new Error("useAnime debe usarse dentro de AnimeProvider");
  return value;
}
