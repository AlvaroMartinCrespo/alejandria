// Pruebas de la lógica pura del calendario. Uso: node scripts/test-activity.mjs
// (Node ≥ 22.6 ejecuta TypeScript directamente.)
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const {
  addDays, applyIncoming, compareRecentlyRead, lastFinishedDays, describeChange, groupByDay, mergeEntry, pagesReadInYear, pagesReadOf, progressDelta, streaks, todayInZone,
} = await import("../src/lib/reading-activity.ts");
const { parseActivityBackup, parseMarksBackup } = await import("../src/lib/activity-validation.ts");

let n = 0;
function test(name, fn) { fn(); n += 1; console.log(`ok  ${name}`); }
const id = () => "id-1";
const log = (entries, book, day, change, prev) => {
  const d = describeChange(prev, change);
  return d ? applyIncoming(entries, { bookId: book, day, events: d.events, progressFrom: d.from, progressTo: d.to }) : entries;
};

test("avance normal 20 → 33", () => {
  const d = describeChange({ status: "reading", progress: 20 }, { progress: 33 });
  assert.deepEqual(d, { events: ["progress"], from: 20, to: 33 });
});

test("varios guardados el mismo día dejan una fila 20 → 33", () => {
  let e = [];
  e = log(e, "b", "2026-11-10", { progress: 25 }, { status: "reading", progress: 20 });
  e = log(e, "b", "2026-11-10", { progress: 33 }, { status: "reading", progress: 25 });
  assert.equal(e.length, 1);
  assert.equal(e[0].progressFrom, 20);
  assert.equal(e[0].progressTo, 33);
  assert.equal(progressDelta(e[0]), 13);
});

test("retroceso (corrección a la baja) da delta negativo", () => {
  let e = log([], "b", "2026-11-10", { progress: 40 }, { status: "reading", progress: 50 });
  assert.equal(progressDelta(e[0]), -10);
});

test("páginas del día = avance % × páginas del libro", () => {
  assert.equal(pagesReadOf({ progressFrom: 20, progressTo: 33 }, 300), 39);
  assert.equal(pagesReadOf({ progressFrom: 0, progressTo: 100 }, 250), 250);
});

test("páginas del día: sin páginas, sin progreso o a la baja dan 0", () => {
  assert.equal(pagesReadOf({ progressFrom: 20, progressTo: 33 }, null), 0);
  assert.equal(pagesReadOf({ progressFrom: 20, progressTo: 33 }, 0), 0);
  assert.equal(pagesReadOf({ progressFrom: null, progressTo: 33 }, 300), 0);
  assert.equal(pagesReadOf({ progressFrom: 50, progressTo: 40 }, 300), 0);
});

test("páginas del año: suman día a día sin esperar a terminar el libro", () => {
  const entry = (bookId, day, from, to) => ({ $id: `${bookId}-${day}`, bookId, day, events: ["progress"], progressFrom: from, progressTo: to });
  const reading = { $id: "r", status: "reading", pageCount: 200, finishedYear: null };
  const activity = [entry("r", "2026-11-10", 0, 10), entry("r", "2026-11-11", 10, 25)]; // 20 + 30 págs
  assert.equal(pagesReadInYear([reading], activity, 2026), 50);
  assert.equal(pagesReadInYear([reading], activity, 2025), 0);
});

test("páginas del año: libro terminado no cuenta dos veces lo ya registrado", () => {
  const entry = (bookId, day, from, to) => ({ $id: `${bookId}-${day}`, bookId, day, events: ["progress"], progressFrom: from, progressTo: to });
  const done = { $id: "d", status: "read", pageCount: 200, finishedYear: 2026 };
  // 50 págs registradas; el resto (150) se cuenta al estar terminado → 200 en total
  assert.equal(pagesReadInYear([done], [entry("d", "2026-03-01", 0, 25)], 2026), 200);
  // sin historial: se cuenta entero, como antes
  assert.equal(pagesReadInYear([done], [], 2026), 200);
  // empezado el año anterior: lo de 2025 no suma a 2026, pero el resto sí
  assert.equal(pagesReadInYear([done], [entry("d", "2025-12-20", 0, 50), entry("d", "2026-01-05", 50, 60)], 2026), 100);
  // terminado otro año: solo lo registrado en este
  assert.equal(pagesReadInYear([{ ...done, finishedYear: 2025 }], [entry("d", "2026-01-05", 50, 60)], 2026), 20);
});

test("cambio a Leyendo registra started + status", () => {
  const d = describeChange({ status: "to_read", progress: 0 }, { status: "reading" });
  assert.deepEqual(d.events, ["status", "started"]);
});

test("cambio a Leído registra finished + status y no toca el progreso", () => {
  const d = describeChange({ status: "reading", progress: 80 }, { status: "read", finishedYear: 2026 });
  assert.deepEqual(d.events, ["status", "finished"]);
  assert.equal(d.from, 80); assert.equal(d.to, 80);
});

test("progreso + estado el mismo día unen eventos y conservan from", () => {
  let e = log([], "b", "2026-11-10", { progress: 90 }, { status: "reading", progress: 80 });
  e = log(e, "b", "2026-11-10", { status: "read" }, { status: "reading", progress: 90 });
  assert.deepEqual(e[0].events, ["finished", "progress", "status"]);
  assert.equal(e[0].progressFrom, 80); assert.equal(e[0].progressTo, 90);
});

test("estado primero y progreso después: from no se pisa", () => {
  let e = log([], "b", "2026-11-10", { status: "reading" }, { status: "to_read", progress: 0 });
  e = log(e, "b", "2026-11-10", { progress: 12 }, { status: "reading", progress: 0 });
  assert.equal(e[0].progressFrom, 0); assert.equal(e[0].progressTo, 12);
});

test("favorito, nota o valoración no cuentan", () => {
  assert.equal(describeChange({ status: "reading", progress: 10 }, { favorite: true }), null);
  assert.equal(describeChange({ status: "reading", progress: 10 }, { notes: "hola", rating: 8 }), null);
});

test("mismo valor de progreso o estado no cuenta", () => {
  assert.equal(describeChange({ status: "reading", progress: 10 }, { progress: 10, status: "reading" }), null);
});

test("medianoche: 23:30 UTC del 9-nov ya es 10-nov en Madrid; 00:30 Madrid", () => {
  assert.equal(todayInZone("Europe/Madrid", new Date("2026-11-09T23:30:00Z")), "2026-11-10");
  assert.equal(todayInZone("Europe/Madrid", new Date("2026-11-09T22:59:00Z")), "2026-11-09");
  assert.equal(todayInZone("UTC", new Date("2026-11-09T23:30:00Z")), "2026-11-09");
});

test("cambio de horario de verano", () => {
  assert.equal(todayInZone("Europe/Madrid", new Date("2026-03-28T23:30:00Z")), "2026-03-29");
});

test("addDays: mes, año y bisiesto", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("rachas", () => {
  const days = ["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-09", "2026-11-10"];
  assert.deepEqual(streaks(days, "2026-11-10"), { current: 2, longest: 3 });
  assert.deepEqual(streaks(days, "2026-11-11"), { current: 2, longest: 3 }); // ayer cuenta
  assert.deepEqual(streaks(days, "2026-11-12"), { current: 0, longest: 3 });
  assert.deepEqual(streaks([], "2026-11-10"), { current: 0, longest: 0 });
});

test("groupByDay agrupa", () => {
  const a = mergeEntry(undefined, { bookId: "a", day: "2026-11-10", events: ["progress"], progressFrom: 0, progressTo: 5 }, id);
  const b = mergeEntry(undefined, { bookId: "b", day: "2026-11-10", events: ["progress"], progressFrom: 0, progressTo: 5 }, id);
  assert.equal(groupByDay([a, b]).get("2026-11-10").length, 2);
});

test("parseActivityBackup: v3 sin activity → []", () => {
  assert.deepEqual(parseActivityBackup({ books: [] }), []);
});

test("parseActivityBackup: válida y duplicados por (libro, día)", () => {
  const out = parseActivityBackup({ activity: [
    { bookId: "a", day: "2026-11-10", events: ["progress"], progressFrom: 1, progressTo: 2 },
    { bookId: "a", day: "2026-11-10", events: ["progress", "status"], progressFrom: 1, progressTo: 3 },
  ] });
  assert.equal(out.length, 1); assert.equal(out[0].progressTo, 3);
});

test("parseActivityBackup rechaza datos inválidos", () => {
  const bad = (entry) => assert.throws(() => parseActivityBackup({ activity: [entry] }));
  bad({ bookId: "a", day: "2026-02-30", events: [], progressFrom: 0, progressTo: 0 });
  bad({ bookId: "a", day: "10/11/2026", events: [], progressFrom: 0, progressTo: 0 });
  bad({ bookId: "", day: "2026-11-10", events: [], progressFrom: 0, progressTo: 0 });
  bad({ bookId: "a", day: "2026-11-10", events: ["x"], progressFrom: 0, progressTo: 0 });
  bad({ bookId: "a", day: "2026-11-10", events: [], progressFrom: 101, progressTo: 0 });
  assert.throws(() => parseActivityBackup({ activity: "no" }));
});

test("30 días marcados terminando hoy dan racha 30; si falta hoy, sigue viva desde ayer", () => {
  const days = Array.from({ length: 30 }, (_, i) => addDays("2026-11-10", -i));
  assert.deepEqual(streaks(days, "2026-11-10"), { current: 30, longest: 30 });
  assert.deepEqual(streaks(days.slice(1), "2026-11-10"), { current: 29, longest: 29 });
  // un hueco rompe la racha
  assert.equal(streaks(days.filter((d) => d !== "2026-11-01"), "2026-11-10").current, 9);
});

test("parseMarksBackup", () => {
  assert.deepEqual(parseMarksBackup({ books: [] }), []);
  assert.deepEqual(parseMarksBackup({ marks: ["2026-11-02", "2026-11-01", "2026-11-02"] }), ["2026-11-01", "2026-11-02"]);
  assert.throws(() => parseMarksBackup({ marks: ["2026-13-01"] }));
  assert.throws(() => parseMarksBackup({ marks: "x" }));
});

test("lastFinishedDays y orden de recientes: con fecha primero (más reciente arriba), sin fecha después", () => {
  const e = (bookId, day, events) => ({ $id: `${bookId}-${day}`, bookId, day, events, progressFrom: null, progressTo: null });
  const days = lastFinishedDays([
    e("a", "2026-03-01", ["finished"]), e("a", "2026-05-10", ["finished"]), // releído: cuenta el último
    e("b", "2026-04-02", ["finished"]), e("c", "2026-04-03", ["progress"]), // c no terminó
  ]);
  assert.equal(days.get("a"), "2026-05-10");
  assert.equal(days.get("b"), "2026-04-02");
  assert.equal(days.has("c"), false);
  const book = (id, addedAt) => ({ $id: id, addedAt });
  const list = [book("x", "2026-01-01T00:00:00Z"), book("b", "2020-01-01T00:00:00Z"), book("y", "2026-02-01T00:00:00Z"), book("a", "2019-01-01T00:00:00Z")];
  assert.deepEqual(list.sort((p, q) => compareRecentlyRead(p, q, days)).map((x) => x.$id), ["a", "b", "y", "x"]);
});

console.log(`\n${n} pruebas correctas`);
