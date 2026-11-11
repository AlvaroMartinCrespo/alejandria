// Pruebas del envío por Resend (fetch simulado, sin red).
// Uso: node scripts/test-email.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { sendBackupEmail, parseRecipients, MAX_ATTACHMENTS_BYTES } = await import("../src/lib/email.ts");

let n = 0;
async function test(name, fn) { await fn(); n += 1; console.log(`ok  ${name}`); }

const realFetch = globalThis.fetch;
let calls = [];
function stubFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return handler(url, init); };
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const base = { to: "yo@example.com", from: "Alejandría <backup@example.com>", apiKey: "re_secreta_123", subject: "Asunto", text: "Cuerpo" };

await test("parseRecipients separa por comas y limpia espacios", () => {
  assert.deepEqual(parseRecipients(" a@x.com, b@y.com ,, "), ["a@x.com", "b@y.com"]);
  assert.deepEqual(parseRecipients(["a@x.com", " "]), ["a@x.com"]);
});

await test("envía a Resend con Bearer, destinatarios en lista y adjunto en base64", async () => {
  stubFetch(() => json(200, { id: "msg_1" }));
  const content = Buffer.from('{"ñ":"日本語"}', "utf8");
  const result = await sendBackupEmail({ ...base, to: "a@x.com, b@y.com", attachments: [{ filename: "alejandria-backup-2026-11-11.json", content }] });
  assert.deepEqual(result, { id: "msg_1" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, "Bearer re_secreta_123");
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ["a@x.com", "b@y.com"]);
  assert.equal(body.from, base.from);
  assert.equal(body.subject, "Asunto");
  assert.equal(body.attachments.length, 1);
  assert.equal(body.attachments[0].filename, "alejandria-backup-2026-11-11.json");
  assert.equal(Buffer.from(body.attachments[0].content, "base64").toString("utf8"), '{"ñ":"日本語"}');
});

await test("un adjunto en texto se codifica como UTF-8", async () => {
  stubFetch(() => json(200, { id: "m" }));
  await sendBackupEmail({ ...base, attachments: [{ filename: "a.json", content: "ñ" }] });
  assert.equal(Buffer.from(JSON.parse(calls[0].init.body).attachments[0].content, "base64").toString("utf8"), "ñ");
});

await test("si Resend rechaza, el error incluye el estado y su mensaje, nunca la clave", async () => {
  stubFetch(() => json(422, { name: "validation_error", message: "The from address is not verified." }));
  await assert.rejects(sendBackupEmail(base), (error) => {
    assert.match(error.message, /422/);
    assert.match(error.message, /not verified/);
    assert.equal(error.message.includes("re_secreta_123"), false);
    return true;
  });
});

await test("fallo de red o de tiempo: mensaje claro, sin detalles internos", async () => {
  stubFetch(() => { throw new TypeError("fetch failed: getaddrinfo re_secreta_123"); });
  await assert.rejects(sendBackupEmail(base), (error) => { assert.equal(error.message, "No se pudo conectar con Resend."); return true; });
  stubFetch(() => { const e = new Error("t"); e.name = "TimeoutError"; throw e; });
  await assert.rejects(sendBackupEmail(base), /no respondió a tiempo/);
});

await test("respuesta de error sin JSON", async () => {
  stubFetch(() => new Response("<html>502</html>", { status: 502 }));
  await assert.rejects(sendBackupEmail(base), /\(502\)\./);
});

await test("faltan clave, remitente o destinatario: no se llama a la red", async () => {
  stubFetch(() => json(200, { id: "x" }));
  const saved = { key: process.env.RESEND_API_KEY, from: process.env.BACKUP_EMAIL_FROM };
  delete process.env.RESEND_API_KEY; delete process.env.BACKUP_EMAIL_FROM;
  await assert.rejects(sendBackupEmail({ ...base, apiKey: undefined }), /RESEND_API_KEY/);
  await assert.rejects(sendBackupEmail({ ...base, from: undefined }), /BACKUP_EMAIL_FROM/);
  await assert.rejects(sendBackupEmail({ ...base, to: " , " }), /BACKUP_EMAIL_TO/);
  if (saved.key) process.env.RESEND_API_KEY = saved.key;
  if (saved.from) process.env.BACKUP_EMAIL_FROM = saved.from;
  assert.equal(calls.length, 0);
});

await test("adjuntos por encima del límite: se rechazan antes de enviar", async () => {
  stubFetch(() => json(200, { id: "x" }));
  const big = Buffer.alloc(MAX_ATTACHMENTS_BYTES + 1);
  await assert.rejects(sendBackupEmail({ ...base, attachments: [{ filename: "a.json", content: big }] }), /superan el límite/);
  assert.equal(calls.length, 0);
});

globalThis.fetch = realFetch;
console.log(`\n${n} pruebas correctas`);
