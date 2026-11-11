// Pruebas de la lógica pura de las curiosidades del recap. Uso: node scripts/test-recap.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const R = await import("../src/lib/recap-insights.ts");

let n = 0;
function test(name, fn) { fn(); n += 1; console.log(`ok  ${name}`); }

let seq = 0;
const book = (o = {}) => ({
  $id: `b${++seq}`, googleBooksId: "", title: `Libro ${seq}`, authors: ["A"], coverUrl: null,
  publishedYear: null, pageCount: null, synopsis: "", status: "read", favorite: false, order: null,
  collectionId: null, rating: null, finishedYear: 2025, finishedMonth: null, addedAt: "2024-01-01T00:00:00Z",
  progress: 100, ...o,
});
const entry = (bookId, day, events, from = null, to = null) => ({ $id: `${bookId}-${day}`, bookId, day, events, progressFrom: from, progressTo: to });

test("estaciones: diciembre es invierno", () => {
  assert.equal(R.seasonOfMonth(12), "invierno");
  assert.equal(R.seasonOfMonth(1), "invierno");
  assert.equal(R.seasonOfMonth(3), "primavera");
  assert.equal(R.seasonOfMonth(7), "verano");
  assert.equal(R.seasonOfMonth(10), "otoño");
});

test("seasonInsights: empates y libros sin mes", () => {
  const r = R.seasonInsights([book({ finishedMonth: 1 }), book({ finishedMonth: 7 }), book({ finishedMonth: null })]);
  assert.equal(r.dated, 2);
  assert.deepEqual(r.top.map((t) => t.season), ["invierno", "verano"]);
  assert.equal(R.seasonInsights([book()]).top.length, 0);
});

test("pageInsights: mediana, tochos y apilado", () => {
  const r = R.pageInsights([book({ pageCount: 100 }), book({ pageCount: 300 }), book({ pageCount: 600 }), book()]);
  assert.equal(r.median, 300);
  assert.equal(r.thick, 1);
  assert.equal(r.thin, 1);
  assert.ok(Math.abs(r.stackCm - 1000 / 150) < 1e-9);
  assert.equal(r.lengthVsRating, null);
});

test("pageInsights: largos vs cortos con muestra suficiente", () => {
  const shorts = [1, 2, 3].map(() => book({ pageCount: 100, rating: 6 }));
  const longs = [1, 2, 3].map(() => book({ pageCount: 500, rating: 9 }));
  const r = R.pageInsights([...shorts, ...longs]).lengthVsRating;
  assert.equal(r.longAvg, 9);
  assert.equal(r.shortAvg, 6);
});

test("ratingInsights: moda con empate va a la nota más alta", () => {
  const r = R.ratingInsights([book({ rating: 7 }), book({ rating: 7 }), book({ rating: 9 }), book({ rating: 9 }), book({ rating: 10 }), book()]);
  assert.deepEqual(r.mode, { rating: 9, count: 2 });
  assert.equal(r.perfect, 1);
  assert.equal(r.notable, 3);
  assert.equal(r.rated, 5);
  assert.equal(R.ratingInsights([book()]).mode, null);
});

test("authorInsights: autores únicos y mejor valorado (≥2 notas)", () => {
  const r = R.authorInsights([
    book({ authors: ["X"], rating: 10 }), book({ authors: ["X"], rating: 8 }),
    book({ authors: ["Y"], rating: 10 }), book({ authors: ["Z"], rating: 5 }), book({ authors: ["Z"], rating: 5 }),
  ]);
  assert.equal(r.distinct, 3);
  assert.equal(r.singles, 1);
  assert.deepEqual(r.bestRated, { author: "X", average: 9, count: 2 });
});

test("publicationInsights: antigüedad al leer, clásicos y rango", () => {
  const r = R.publicationInsights([
    book({ publishedYear: 1605, finishedYear: 2025 }),
    book({ publishedYear: 2024, finishedYear: 2025 }),
    book({ publishedYear: 1975, finishedYear: 2025 }),
    book(),
  ], 2026);
  assert.equal(r.dated, 3);
  assert.equal(r.span, 2024 - 1605);
  assert.equal(r.classics, 2);
  assert.equal(r.fresh, 1);
  assert.equal(r.newest.publishedYear, 2024);
  assert.equal(R.publicationInsights([book()], 2026).averageAge, null);
});

test("favoriteInsights y notas", () => {
  assert.equal(R.favoriteInsights([book({ pageCount: 100, favorite: true })]), null);
  const r = R.favoriteInsights([book({ pageCount: 400, favorite: true }), book({ pageCount: 200 }), book({ pageCount: 100 })]);
  assert.deepEqual(r, { favoriteAvgPages: 400, restAvgPages: 150 });
  assert.equal(R.notesCount([book({ notes: "  " }), book({ notes: "hola" }), book()]), 1);
});

test("yearTrend: racha de años, mejor año y evolución", () => {
  const y = (rating, n = 3) => Array.from({ length: n }, () => book({ rating }));
  const map = new Map([[2019, y(6)], [2020, y(7)], [2021, y(9)], [2024, y(8)]]);
  const t = R.yearTrend(map);
  assert.deepEqual(t.longestRun, { length: 3, from: 2019, to: 2021 });
  assert.deepEqual(t.bestRatedYear, { year: 2021, average: 9 });
  assert.equal(t.ratingTrend.firstYear, 2019);
  assert.equal(t.ratingTrend.lastYear, 2024);
  assert.equal(R.yearTrend(new Map()), null);
  assert.equal(R.yearTrend(new Map([[2020, y(5, 2)]])).bestRatedYear, null);
});

test("longestStreakRange con huecos y cambio de mes", () => {
  const r = R.longestStreakRange(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-05", "2026-02-06"]);
  assert.deepEqual(r, { length: 3, from: "2026-01-30", to: "2026-02-01" });
  assert.equal(R.longestStreakRange([]), null);
});

test("finishTimes: inclusivo, mismo día = 1, ignora los incompletos", () => {
  const t = R.finishTimes([
    entry("a", "2026-03-01", ["started", "status"]), entry("a", "2026-03-10", ["finished", "status"]),
    entry("b", "2026-04-02", ["started", "finished", "status"]),
    entry("c", "2026-05-01", ["started"]),
    entry("d", "2026-06-10", ["finished"]),
  ]);
  const byId = Object.fromEntries(t.map((x) => [x.bookId, x.days]));
  assert.deepEqual(byId, { a: 10, b: 1 });
});

test("habitInsights: día de la semana, fin de semana, mes y mejor día", () => {
  // 2026-11-07 sábado, 2026-11-08 domingo, 2026-11-09 lunes
  const e = [
    entry("a", "2026-11-07", ["progress"], 0, 20), entry("b", "2026-11-07", ["progress"], 10, 15),
    entry("a", "2026-11-08", ["progress"], 20, 60), entry("a", "2026-11-09", ["progress"], 60, 50),
  ];
  const h = R.habitInsights(e, ["2026-10-31"]);
  assert.equal(h.readDays, 4);
  assert.equal(h.weekendShare, 75);
  assert.deepEqual(h.topMonth, { month: "2026-11", days: 3 });
  assert.deepEqual(h.bestDay, { day: "2026-11-08", gain: 40, books: 1 });
  assert.deepEqual(h.biggestJump, { bookId: "a", day: "2026-11-08", gain: 40 });
  assert.equal(h.longestStreak.length, 3);
  assert.equal(R.habitInsights([], []).topWeekday, null);
});

test("backlogInsights: pendientes, esperando y leyendo", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  const r = R.backlogInsights([
    book({ status: "to_read", pageCount: 300, addedAt: "2026-01-01T00:00:00Z" }),
    book({ status: "to_read", pageCount: 200, addedAt: "2026-10-01T00:00:00Z" }),
    book({ status: "reading", progress: 40 }),
    book({ status: "read" }),
  ], now);
  assert.equal(r.toRead, 2);
  assert.equal(r.pendingPages, 500);
  assert.equal(r.oldestWaiting.days, 314);
  assert.equal(r.reading[0].progress, 40);
  assert.equal(r.readShare, 25);
  assert.equal(R.backlogInsights([], now).readShare, null);
});

test("topCollection ignora carpetas inexistentes", () => {
  const cols = [{ $id: "c1", name: "Fantasía", order: 0 }];
  assert.deepEqual(R.topCollection([book({ collectionId: "c1" }), book({ collectionId: "c1" }), book({ collectionId: "zzz" })], cols), { name: "Fantasía", count: 2 });
  assert.equal(R.topCollection([book()], cols), null);
});

console.log(`\n${n} pruebas OK`);
