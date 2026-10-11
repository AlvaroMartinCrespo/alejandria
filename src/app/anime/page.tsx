"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, closestCorners, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimeRow } from "@/components/anime-row";
import { AnimeTabs } from "@/components/anime-tabs";
import { compareManualOrder, useAnime } from "@/components/anime-provider";
import { JapaneseHeading } from "@/components/japanese-heading";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import type { Anime } from "@/types/anime";

type SortMode = "manual" | "lastWatched" | "title" | "rating" | "added";

const SORT_LABELS: Record<SortMode, string> = {
  manual: "Manual",
  lastWatched: "Último visto",
  title: "Título",
  rating: "Puntuación",
  added: "Añadido",
};

function sortAnime(list: Anime[], mode: SortMode) {
  const sorted = [...list];
  switch (mode) {
    case "manual":
      return sorted.sort(compareManualOrder);
    case "lastWatched":
      return sorted.sort((left, right) => (right.lastWatchedAt ?? "").localeCompare(left.lastWatchedAt ?? ""));
    case "title":
      return sorted.sort((left, right) => left.title.localeCompare(right.title, "es", { sensitivity: "base" }));
    case "rating":
      return sorted.sort((left, right) => (right.rating ?? -1) - (left.rating ?? -1));
    case "added":
      return sorted.sort((left, right) => right.addedAt.localeCompare(left.addedAt));
  }
}

export default function AnimePage() {
  const { editing, loading: libraryLoading } = useLibrary();
  const { anime, animeError, animeLoading, moveAnime } = useAnime();
  const [sort, setSort] = useState<SortMode>("manual");
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  if (libraryLoading || animeLoading) return <LibrarySkeleton />;

  const sortable = editing && sort === "manual";
  const watching = sortAnime(anime.filter((item) => item.status === "watching"), sort);
  const toWatch = sortAnime(anime.filter((item) => item.status === "to_watch"), sort);
  const onHold = sortAnime(anime.filter((item) => item.status === "on_hold"), sort);
  const dropped = sortAnime(anime.filter((item) => item.status === "dropped"), sort);
  const watched = sortAnime(anime.filter((item) => item.status === "watched"), sort);
  const groups: Record<string, Anime[]> = { watching, to_watch: toWatch, on_hold: onHold, dropped };

  const watchedByYear = new Map<number | null, Anime[]>();
  for (const item of watched) {
    const key = item.finishedYear;
    watchedByYear.set(key, [...(watchedByYear.get(key) ?? []), item]);
  }
  const watchedYears = Array.from(watchedByYear.keys()).sort((left, right) => {
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  });

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!event.over || event.active.id === event.over.id) return;
    const moved = anime.find((item) => item.$id === String(event.active.id));
    const target = anime.find((item) => item.$id === String(event.over!.id));
    if (!moved || !target || moved.status !== target.status) return;
    const group = groups[moved.status];
    const index = group?.findIndex((item) => item.$id === target.$id) ?? -1;
    if (index >= 0) void moveAnime(moved.$id, index).catch(() => undefined);
  }

  function renderGroup(list: Anime[], draggable: boolean) {
    return (
      <SortableContext items={list.map((item) => item.$id)} strategy={verticalListSortingStrategy}>
        <div className="collection-books anime-list">
          {list.map((item, index) => (
            <AnimeRow
              key={item.$id}
              anime={item}
              sortable={draggable}
              onMoveUp={draggable && index > 0 ? () => void moveAnime(item.$id, index - 1).catch(() => undefined) : undefined}
              onMoveDown={draggable && index < list.length - 1 ? () => void moveAnime(item.$id, index + 1).catch(() => undefined) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    );
  }

  return (
    <>
      <JapaneseHeading />
      <AnimeTabs />

      {animeError ? (
        <section className="big-empty">
          <h2>No se pudo cargar el anime</h2>
          <p>{animeError}</p>
        </section>
      ) : (
        <>
          <div className="anime-toolbar">
            <label className="anime-sort">
              <span>Ordenar</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Ordenar animes">
                {(Object.entries(SORT_LABELS) as [SortMode, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {editing && sort !== "manual" && <small>El arrastre solo está activo con orden manual.</small>}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event) => setActiveId(String(event.active.id))}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={handleDragEnd}
          >
            {watching.length > 0 ? (
              <section className="now-reading anime-now">
                <div className="section-label"><span>Siguiendo ahora</span><i /></div>
                <div className="now-reading-list">{renderGroup(watching, sortable)}</div>
              </section>
            ) : (
              <section className="quiet-empty">
                <span>Ahora mismo</span>
                <h2>{anime.length ? "No estás siguiendo nada." : "Aún no hay anime."}</h2>
                <p>
                  {anime.length
                    ? "Elige “Viendo” en cualquier anime para tenerlo siempre a mano."
                    : "Pulsa “Añadir anime” para empezar tu lista."}
                </p>
              </section>
            )}

            <div className="home-sections anime-sections">
              <details className="library-section" open>
                <summary>
                  <span><strong>Pendientes</strong><small>{toWatch.length} por ver</small></span>
                  <i aria-hidden="true">⌄</i>
                </summary>
                <div className="section-body">
                  {toWatch.length ? renderGroup(toWatch, sortable) : <EmptyList text="Los animes que quieras ver más adelante aparecerán aquí." />}
                </div>
              </details>

              <details className="library-section">
                <summary>
                  <span><strong>En pausa</strong><small>{onHold.length} en pausa</small></span>
                  <i aria-hidden="true">⌄</i>
                </summary>
                <div className="section-body">
                  {onHold.length ? renderGroup(onHold, sortable) : <EmptyList text="Nada en pausa por ahora." />}
                </div>
              </details>

              <details className="library-section">
                <summary>
                  <span><strong>Abandonados</strong><small>{dropped.length} abandonados</small></span>
                  <i aria-hidden="true">⌄</i>
                </summary>
                <div className="section-body">
                  {dropped.length ? renderGroup(dropped, sortable) : <EmptyList text="Todavía no has abandonado ninguno." />}
                </div>
              </details>

              <details className="library-section">
                <summary>
                  <span><strong>Vistos</strong><small>{watched.length} terminados</small></span>
                  <i aria-hidden="true">⌄</i>
                </summary>
                <div className="section-body">
                  {watched.length ? watchedYears.map((year) => (
                    <div className="anime-year-group" key={year ?? "none"}>
                      <h3 className="anime-year-label">
                        {year ?? "Sin año"} <small>({watchedByYear.get(year)!.length})</small>
                      </h3>
                      {renderGroup(watchedByYear.get(year)!, false)}
                    </div>
                  )) : <EmptyList text="Los animes que termines se archivarán aquí, por año." />}
                </div>
              </details>
            </div>

            <DragOverlay>
              {activeId ? <AnimeRow anime={anime.find((item) => item.$id === activeId)!} overlay /> : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </>
  );
}

function EmptyList({ text }: { text: string }) {
  return <div className="list-empty"><span>＋</span><p>{text}</p></div>;
}
