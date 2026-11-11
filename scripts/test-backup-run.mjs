// Pruebas de la lógica del backup por correo (dependencias simuladas, sin red).
// Uso: node scripts/test-backup-run.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { runBackup, isBackupDue, localDate, addDaysToDate, buildEmailText, buildBackupStatus } = await import("../src/lib/backup-run.ts");

let n = 0;
async function test(name, fn) { await fn(); n += 1; console.log(`ok  ${name}`); }

const book = (o = {}) => ({
  $id: "b1", googleBooksId: "g1", title: "Libro", authors: ["A"], coverUrl: null, publishedYear: 1999, pageCount: 320,
  synopsis: "", status: "read", favorite: false, order: 1, collectionId: null, rating: 9, finishedYear: 2025, finishedMonth: 3,
  addedAt: "2024-01-01T00:00:00.000Z", progress: 100, notes: "nota", ...o,
});
const source = (o = {}) => ({
  books: [book(), book({ $id: "b2", googleBooksId: "g2" })],
  collections: [{ $id: "c1", name: "Pendientes", order: 0 }],
  anime: [{ $id: "a1", sourceId: "", title: "Anime", titleJapanese: "アニメ", coverUrl: null, releaseYear: 2010, mediaFormat: "TV", genres: [], synopsis: "", status: "watched", favorite: false, rating: 8, currentSeason: 1, currentEpisode: 12, totalEpisodes: 12, totalSeasons: 1, finishedYear: 2026, finishedMonth: 1, lastWatchedAt: null, order: 1, notes: "", addedAt: "2026-01-01T00:00:00.000Z" }],
  activity: [],
  marks: ["2025-03-02"],
  omitted: [],
  ...o,
});

function makeDeps(over = {}) {
  const state = { sent: [], logs: [], lastCalls: 0 };
  const deps = {
    now: () => new Date("2026-11-11T07:00:02Z"),
    missingConfig: [],
    config: { to: "yo@example.com", from: "Alejandría <b@example.com>", apiKey: "re_x", everyDays: 14, timeZone: "Europe/Madrid" },
    getLastSuccess: async () => { state.lastCalls += 1; return null; },
    loadSource: async () => source(),
    sendEmail: async (input) => { state.sent.push(input); return { id: "msg_1" }; },
    log: async (entry) => { state.logs.push(entry); },
    ...over,
  };
  return { deps, state };
}
const last = (sentAt) => async () => ({ sentAt, trigger: "cron", bookCount: 2, animeCount: 1 });

await test("fechas: días naturales en la zona configurada", () => {
  assert.equal(localDate(new Date("2026-11-11T23:30:00Z"), "Europe/Madrid"), "2026-11-12");
  assert.equal(localDate(new Date("2026-11-11T23:30:00Z"), "UTC"), "2026-11-11");
  assert.equal(addDaysToDate("2026-10-28", 14), "2026-11-11");
  assert.equal(addDaysToDate("2026-12-25", 14), "2027-01-08");
});

await test("isBackupDue: 14 días naturales aunque pasen 13 d 23 h 59 min (sin deriva diaria)", () => {
  const now = new Date("2026-11-11T07:00:02Z");
  assert.equal(isBackupDue(null, now, 14, "Europe/Madrid"), true);
  assert.equal(isBackupDue("2026-10-28T07:00:05Z", now, 14, "Europe/Madrid"), true);
  assert.equal(isBackupDue("2026-10-29T07:00:05Z", now, 14, "Europe/Madrid"), false);
  assert.equal(isBackupDue("2026-11-11T05:00:00Z", now, 14, "Europe/Madrid"), false);
});

await test("sin envíos previos: envía un único JSON con el resumen y lo registra", async () => {
  const { deps, state } = makeDeps();
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.status, "sent");
  assert.equal(outcome.bookCount, 2);
  assert.equal(outcome.animeCount, 1);
  assert.equal(outcome.filename, "alejandria-backup-2026-11-11.json");
  assert.equal(outcome.logged, true);
  assert.equal(state.sent.length, 1);
  const mail = state.sent[0];
  assert.equal(mail.to, "yo@example.com");
  assert.equal(mail.attachments.length, 1, "solo se adjunta el JSON");
  assert.equal(mail.attachments[0].filename, "alejandria-backup-2026-11-11.json");
  assert.match(mail.subject, /2026-11-11/);
  assert.match(mail.text, /Libros: 2/);
  assert.match(mail.text, /Anime: 1/);
  const backup = JSON.parse(Buffer.from(mail.attachments[0].content).toString("utf8"));
  assert.equal(backup.format, "alejandria-library-backup");
  assert.equal(backup.version, 5);
  assert.equal(backup.books.length, 2);
  assert.equal(backup.anime.length, 1);
  assert.deepEqual(state.logs, [{ status: "success", trigger: "cron", bookCount: 2, animeCount: 1, jsonBytes: mail.attachments[0].content.length, errorMessage: null }]);
});

await test("antes de 14 días no hace nada: ni carga datos, ni envía, ni registra", async () => {
  let loaded = false;
  const { deps, state } = makeDeps({ getLastSuccess: last("2026-11-04T07:00:00Z"), loadSource: async () => { loaded = true; return source(); } });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.deepEqual(outcome, { status: "skipped", lastBackupAt: "2026-11-04T07:00:00Z", nextDueDate: "2026-11-18" });
  assert.equal(loaded, false);
  assert.equal(state.sent.length + state.logs.length, 0);
});

await test("a los 14 días naturales vuelve a enviar", async () => {
  const { deps, state } = makeDeps({ getLastSuccess: last("2026-10-28T07:00:05Z") });
  assert.equal((await runBackup(deps, { trigger: "cron" })).status, "sent");
  assert.equal(state.sent.length, 1);
});

await test("el envío manual (force) ignora el plazo y queda registrado como manual", async () => {
  const { deps, state } = makeDeps({ getLastSuccess: last("2026-11-10T07:00:00Z") });
  assert.equal((await runBackup(deps, { trigger: "manual", force: true })).status, "sent");
  assert.equal(state.logs[0].trigger, "manual");
});

await test("el nombre del archivo usa la fecha local (23:30 UTC ya es el día siguiente en Madrid)", async () => {
  const { deps } = makeDeps({ now: () => new Date("2026-11-11T23:30:00Z") });
  assert.equal((await runBackup(deps, { trigger: "cron" })).filename, "alejandria-backup-2026-11-12.json");
});

await test("si el envío falla: error registrado, sin éxito, y el cron del día siguiente reintenta", async () => {
  const { deps, state } = makeDeps({ sendEmail: async () => { throw new Error("Resend rechazó el correo (422): dominio no verificado"); } });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.status, "error");
  assert.equal(outcome.stage, "send");
  assert.match(outcome.error, /dominio no verificado/);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].status, "error");
  assert.match(state.logs[0].errorMessage, /dominio no verificado/);
  assert.equal(state.logs[0].bookCount, 2);
  // Sin éxito registrado, getLastSuccess sigue devolviendo null: al día siguiente toca de nuevo.
  const next = makeDeps({ now: () => new Date("2026-11-12T07:00:02Z") });
  assert.equal((await runBackup(next.deps, { trigger: "cron" })).status, "sent");
});

await test("falta configuración: no consulta, no envía; lo registra como error", async () => {
  const { deps, state } = makeDeps({ missingConfig: ["RESEND_API_KEY", "BACKUP_EMAIL_TO"] });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.status, "error");
  assert.equal(outcome.stage, "config");
  assert.match(outcome.error, /RESEND_API_KEY, BACKUP_EMAIL_TO/);
  assert.equal(state.sent.length, 0);
  assert.equal(state.lastCalls, 0);
  assert.equal(state.logs[0].status, "error");
});

await test("sin acceso a backup_log (falta la migración) no se envía nada, para no reenviar cada día", async () => {
  const { deps, state } = makeDeps({ getLastSuccess: async () => { throw new Error('relation "backup_log" does not exist'); } });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.status, "error");
  assert.equal(outcome.stage, "log-table");
  assert.match(outcome.error, /migration-backup-log\.sql/);
  assert.equal(state.sent.length, 0);
});

await test("si no se pueden cargar los datos: error de generación registrado, sin envío", async () => {
  const { deps, state } = makeDeps({ loadSource: async () => { throw new Error("Supabase respondió con 500"); } });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.stage, "build");
  assert.match(outcome.error, /Supabase respondió con 500/);
  assert.equal(state.sent.length, 0);
  assert.equal(state.logs[0].status, "error");
});

await test("si registrar el error también falla, se devuelve el error original", async () => {
  const { deps } = makeDeps({ sendEmail: async () => { throw new Error("fallo A"); }, log: async () => { throw new Error("fallo B"); } });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.stage, "send");
  assert.equal(outcome.error, "fallo A");
});

await test("si el correo sale pero falla el registro: se informa (logged: false) en vez de fingir un error", async () => {
  const { deps, state } = makeDeps({ log: async () => { throw new Error("sin tabla"); } });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.status, "sent");
  assert.equal(outcome.logged, false);
  assert.equal(state.sent.length, 1);
});

await test("copia incompleta: el correo avisa y el JSON lleva `omitted`", async () => {
  const { deps, state } = makeDeps({ loadSource: async () => source({ omitted: ["activity", "marks"] }) });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.deepEqual(outcome.omitted, ["activity", "marks"]);
  assert.match(state.sent[0].text, /AVISO: copia incompleta.*historial de lectura y los días marcados/);
  assert.deepEqual(JSON.parse(Buffer.from(state.sent[0].attachments[0].content).toString("utf8")).omitted, ["activity", "marks"]);
});

await test("JSON por encima del límite de adjuntos: error, no se envía", async () => {
  const huge = source({ books: [book({ notes: "x".repeat(31 * 1024 * 1024) })] });
  const { deps, state } = makeDeps({ loadSource: async () => huge });
  const outcome = await runBackup(deps, { trigger: "cron" });
  assert.equal(outcome.status, "error");
  assert.match(outcome.error, /supera el límite/);
  assert.equal(state.sent.length, 0);
  assert.equal(state.logs[0].status, "error");
});

await test("el texto del correo no incluye secretos ni la dirección de destino", () => {
  const text = buildEmailText(source(), "alejandria-backup-2026-11-11.json", 2048, "2026-11-11");
  assert.match(text, /2 KB/);
  assert.equal(/re_x|example\.com/.test(text), false);
});

await test("estado: fecha de la próxima copia y configuración", () => {
  const config = { to: "yo@example.com", from: "b@example.com", apiKey: "re_x", everyDays: 14, timeZone: "Europe/Madrid" };
  const lastBackup = { sentAt: "2026-10-28T07:00:05Z", trigger: "manual", bookCount: 2, animeCount: 1 };
  assert.deepEqual(buildBackupStatus(lastBackup, config, []), { configured: true, everyDays: 14, lastBackup, nextDueDate: "2026-11-11" });
  assert.deepEqual(buildBackupStatus(null, config, ["RESEND_API_KEY"]), { configured: false, everyDays: 14, lastBackup: null, nextDueDate: null });
  assert.equal(JSON.stringify(buildBackupStatus(null, config, [])).includes("example.com"), false, "no expone destino ni remitente");
});

await test("envío manual (force): envía aunque no toque y registra trigger manual", async () => {
  const { deps, state } = makeDeps({ getLastSuccess: last("2026-11-10T07:00:05Z") });
  const outcome = await runBackup(deps, { trigger: "manual", force: true });
  assert.equal(outcome.status, "sent");
  assert.equal(state.sent.length, 1);
  assert.equal(state.logs[0].trigger, "manual");
  assert.equal(state.logs[0].status, "success");
});

console.log(`\n${n} pruebas correctas`);
