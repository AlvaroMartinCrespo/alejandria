// Pruebas del JSON de copia (v5): integridad del round-trip y compatibilidad con copias antiguas.
// Uso: node scripts/test-backup.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { buildLibraryBackup, BACKUP_VERSION } = await import("../src/lib/backup.ts");
const { parseBookBackup } = await import("../src/lib/book-validation.ts");
const { parseAnimeBackup } = await import("../src/lib/anime-validation.ts");
const { parseActivityBackup, parseMarksBackup } = await import("../src/lib/activity-validation.ts");

let n = 0;
function test(name, fn) { fn(); n += 1; console.log(`ok  ${name}`); }

const book = (o = {}) => ({
  $id: "b1", googleBooksId: "g1", title: "Libro", authors: ["A", "B"], coverUrl: "https://x/c.jpg",
  publishedYear: 1999, pageCount: 320, synopsis: "sin", status: "read", favorite: true, order: 7,
  collectionId: null, rating: 9, finishedYear: 2025, finishedMonth: 3, addedAt: "2024-01-01T00:00:00.000Z",
  progress: 100, notes: "nota", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2025-03-02T10:00:00.000Z", ...o,
});
const anime = (o = {}) => ({
  $id: "a1", sourceId: "jikan:1", title: "Anime", titleJapanese: "アニメ", coverUrl: null, releaseYear: 2010,
  mediaFormat: "TV", genres: ["Acción"], synopsis: "", status: "watched", favorite: true, rating: 8,
  currentSeason: 2, currentEpisode: 12, totalEpisodes: 12, totalSeasons: 2, finishedYear: 2026, finishedMonth: 11,
  lastWatchedAt: "2026-11-01T00:00:00.000Z", order: 3, notes: "n", addedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", ...o,
});
const entry = { $id: "e1", bookId: "b1", day: "2025-03-01", events: ["started", "progress"], progressFrom: 0, progressTo: 40, createdAt: "2025-03-01T20:00:00.000Z", updatedAt: "2025-03-01T21:00:00.000Z" };
const source = () => ({
  books: [book(), book({ $id: "b2", googleBooksId: "", status: "to_read", collectionId: "c1", order: 1, finishedYear: null, finishedMonth: null, rating: null, progress: 0, favorite: false })],
  collections: [{ $id: "c1", name: "Pendientes", order: 0, createdAt: "2024-01-01T00:00:00.000Z" }],
  anime: [anime()],
  activity: [entry],
  marks: ["2025-03-02", "2025-03-03"],
});

test("la copia es v5 e incluye contadores y todas las secciones", () => {
  const backup = buildLibraryBackup(source());
  assert.equal(backup.version, BACKUP_VERSION);
  assert.equal(BACKUP_VERSION, 5);
  assert.equal(backup.app, "alejandria");
  assert.deepEqual([backup.bookCount, backup.collectionCount, backup.animeCount, backup.activityCount, backup.markCount], [2, 1, 1, 1, 2]);
  assert.equal("omitted" in backup, false, "una copia completa no lleva `omitted`");
});

test("round-trip: lo que se exporta se restaura igual (campos restaurables)", () => {
  const raw = JSON.parse(JSON.stringify(buildLibraryBackup(source())));
  const { books, collections } = parseBookBackup(raw);
  const strip = ({ createdAt, updatedAt, ...rest }) => rest; // marcas de tiempo: informativas, no se restauran
  assert.deepEqual(books.map(strip), source().books.map(strip));
  assert.deepEqual(collections, [{ $id: "c1", name: "Pendientes", order: 0 }]);
  assert.deepEqual(parseAnimeBackup(raw).map(strip), [strip(anime())]);
  assert.deepEqual(parseActivityBackup(raw).map(strip), [strip(entry)]);
  assert.deepEqual(parseMarksBackup(raw), ["2025-03-02", "2025-03-03"]);
});

test("el JSON conserva las marcas de tiempo y el mes de anime", () => {
  const raw = JSON.parse(JSON.stringify(buildLibraryBackup(source())));
  assert.equal(raw.books[0].createdAt, "2024-01-01T00:00:00.000Z");
  assert.equal(raw.books[0].updatedAt, "2025-03-02T10:00:00.000Z");
  assert.equal(raw.collections[0].createdAt, "2024-01-01T00:00:00.000Z");
  assert.equal(raw.anime[0].finishedMonth, 11);
  assert.equal(raw.anime[0].updatedAt, "2026-11-01T00:00:00.000Z");
  assert.equal(raw.activity[0].createdAt, "2025-03-01T20:00:00.000Z");
});

test("copias v4 (anime sin finishedMonth) siguen importándose", () => {
  const { finishedMonth, createdAt, updatedAt, ...legacy } = anime();
  const [restored] = parseAnimeBackup({ version: 4, anime: [legacy] });
  assert.equal(restored.finishedMonth, null);
  assert.equal(restored.finishedYear, 2026);
});

test("finishedMonth fuera de rango se rechaza", () => {
  assert.throws(() => parseAnimeBackup({ anime: [anime({ finishedMonth: 13 })] }));
  assert.throws(() => parseAnimeBackup({ anime: [anime({ finishedMonth: 0 })] }));
});

test("`omitted` marca una copia incompleta", () => {
  const backup = buildLibraryBackup({ ...source(), activity: [], marks: [], omitted: ["activity", "marks"] });
  assert.deepEqual(backup.omitted, ["activity", "marks"]);
});

console.log(`\n${n} pruebas correctas`);
