// Pruebas de la lógica pura de eventos de Realtime. Uso: node scripts/test-realtime.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { applyChange, applyChanges, eventRowId, isStale, sameContent } = await import("../src/lib/realtime-events.ts");
const { fromBookRow, fromCollectionRow, fromAnimeRow } = await import("../src/lib/row-mappers.ts");

let n = 0;
function test(name, fn) { fn(); n += 1; console.log(`ok  ${name}`); }

const row = (over = {}) => ({
  id: "b1", google_books_id: "g1", title: "Dune", authors: ["F. Herbert"], cover_url: null, published_year: 1965,
  page_count: 600, synopsis: "sinopsis larga", status: "reading", favorite: false, sort_order: 1, collection_id: null,
  rating: null, finished_year: null, finished_month: null, added_at: "2026-01-01T00:00:00Z", progress: 10,
  notes: "mis notas", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-01T10:00:00Z", ...over,
});
const ev = (eventType, newRow = {}, oldRow = {}) => ({ eventType, new: newRow, old: oldRow });
const book = (over) => fromBookRow(row(over));

test("INSERT añade el elemento", () => {
  const next = applyChange([], ev("INSERT", row()), fromBookRow);
  assert.equal(next.length, 1);
  assert.equal(next[0].$id, "b1");
});

test("INSERT duplicado (eco del propio POST) no duplica", () => {
  const list = [book()];
  const next = applyChange(list, ev("INSERT", row()), fromBookRow);
  assert.equal(next.length, 1);
});

test("UPDATE más nuevo reemplaza", () => {
  const next = applyChange([book()], ev("UPDATE", row({ progress: 55, updated_at: "2026-02-01T10:00:05Z" })), fromBookRow);
  assert.equal(next[0].progress, 55);
  assert.equal(next[0].updatedAt, "2026-02-01T10:00:05Z");
});

test("UPDATE viejo se ignora y devuelve la misma lista", () => {
  const list = [book({ progress: 80, updated_at: "2026-02-01T10:00:10Z" })];
  const next = applyChange(list, ev("UPDATE", row({ progress: 20, updated_at: "2026-02-01T10:00:05Z" })), fromBookRow);
  assert.equal(next, list);
  assert.equal(next[0].progress, 80);
});

test("UPDATE con la misma marca de tiempo se aplica (≥)", () => {
  const list = [book()];
  const next = applyChange(list, ev("UPDATE", row({ favorite: true })), fromBookRow);
  assert.equal(next[0].favorite, true);
});

test("UPDATE sin columnas TOAST (notas/sinopsis ausentes) conserva las locales", () => {
  const { notes, synopsis, ...partial } = row({ progress: 70, updated_at: "2026-02-01T10:00:09Z" });
  const next = applyChange([book()], ev("UPDATE", partial), fromBookRow, (b) => b);
  assert.equal(next[0].progress, 70);
  assert.equal(next[0].notes, "mis notas");
  assert.equal(next[0].synopsis, "sinopsis larga");
});

test("UPDATE con valor null explícito sí lo aplica", () => {
  const next = applyChange([book({ rating: 8 })], ev("UPDATE", row({ rating: null, updated_at: "2026-02-01T10:00:09Z" })), fromBookRow);
  assert.equal(next[0].rating, null);
});

test("UPDATE de un id desconocido (INSERT perdido) lo añade", () => {
  const next = applyChange([], ev("UPDATE", row({ id: "zz" })), fromBookRow);
  assert.equal(next.length, 1);
  assert.equal(next[0].$id, "zz");
});

test("DELETE quita por id (solo trae la clave primaria)", () => {
  const list = [book(), book({ id: "b2" })];
  const next = applyChange(list, ev("DELETE", {}, { id: "b1" }), fromBookRow);
  assert.deepEqual(next.map((b) => b.$id), ["b2"]);
});

test("DELETE de id inexistente devuelve la misma lista", () => {
  const list = [book()];
  assert.equal(applyChange(list, ev("DELETE", {}, { id: "nope" }), fromBookRow), list);
});

test("evento sin id se ignora", () => {
  const list = [book()];
  assert.equal(applyChange(list, ev("UPDATE", {}), fromBookRow), list);
  assert.equal(eventRowId(ev("DELETE", {}, {})), null);
});

test("reordenar: N UPDATE seguidos se aplican juntos", () => {
  const list = [book({ id: "a", sort_order: 0 }), book({ id: "b", sort_order: 1 }), book({ id: "c", sort_order: 2 })];
  const events = [
    ev("UPDATE", row({ id: "a", sort_order: 2, updated_at: "2026-02-01T11:00:00Z" })),
    ev("UPDATE", row({ id: "b", sort_order: 0, updated_at: "2026-02-01T11:00:00Z" })),
    ev("UPDATE", row({ id: "c", sort_order: 1, updated_at: "2026-02-01T11:00:00Z" })),
  ];
  const next = applyChanges(list, events, fromBookRow);
  assert.deepEqual(next.map((b) => [b.$id, b.order]), [["a", 2], ["b", 0], ["c", 1]]);
});

test("dos guardados seguidos: gana el último evento", () => {
  const events = [
    ev("UPDATE", row({ progress: 30, updated_at: "2026-02-01T10:00:01Z" })),
    ev("UPDATE", row({ progress: 40, updated_at: "2026-02-01T10:00:02Z" })),
  ];
  assert.equal(applyChanges([book()], events, fromBookRow)[0].progress, 40);
});

test("carpetas (sin updated_at): UPDATE siempre se aplica", () => {
  const list = [fromCollectionRow({ id: "c1", name: "A", sort_order: 0 })];
  const next = applyChange(list, ev("UPDATE", { id: "c1", name: "B", sort_order: 1 }), fromCollectionRow);
  assert.deepEqual(next[0], { $id: "c1", name: "B", order: 1 });
});

test("anime", () => {
  const a = { id: "a1", source_id: "jikan:1", title: "X", title_japanese: "", cover_url: null, release_year: 2000, media_format: "TV",
    genres: [], synopsis: "", status: "watching", favorite: false, rating: null, current_season: 1, current_episode: 1,
    total_episodes: 12, total_seasons: 1, finished_year: null, finished_month: null, last_watched_at: null, sort_order: 0,
    notes: "", added_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-01T10:00:00Z" };
  const next = applyChange([fromAnimeRow(a)], ev("UPDATE", { ...a, current_episode: 4, updated_at: "2026-02-01T10:00:03Z" }), fromAnimeRow);
  assert.equal(next[0].currentEpisode, 4);
});

test("isStale con formatos de Postgres (microsegundos y +00:00)", () => {
  assert.equal(isStale("2026-02-01T10:00:00.123456+00:00", "2026-02-01T10:00:00.500000+00:00"), true);
  assert.equal(isStale("2026-02-01T10:00:01+00:00", "2026-02-01T10:00:00.500000+00:00"), false);
  assert.equal(isStale(undefined, "2026-02-01T10:00:00Z"), false);
});

test("sameContent: el eco propio (solo cambia updatedAt) no cuenta como cambio ajeno", () => {
  const local = [book({ progress: 50 })];
  const echo = applyChange(local, ev("UPDATE", row({ progress: 50, updated_at: "2026-02-01T10:05:00Z" })), fromBookRow);
  assert.equal(sameContent(echo, local), true);
  const remote = applyChange(local, ev("UPDATE", row({ progress: 60, updated_at: "2026-02-01T10:05:00Z" })), fromBookRow);
  assert.equal(sameContent(remote, local), false);
});

test("eco con campos TOAST ausentes tampoco cuenta como cambio ajeno", () => {
  const local = [book({ progress: 50 })];
  const { notes, synopsis, ...partial } = row({ progress: 50, updated_at: "2026-02-01T10:05:00Z" });
  const echo = applyChange(local, ev("UPDATE", partial), fromBookRow);
  assert.equal(sameContent(echo, local), true);
});

console.log(`\n${n} pruebas correctas`);
