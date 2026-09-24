import "server-only";

import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "alejandria-editor";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function config() {
  const passwordHash = process.env.ALEJANDRIA_PASSWORD_HASH;
  const sessionSecret = process.env.ALEJANDRIA_SESSION_SECRET;
  if (!passwordHash || !sessionSecret) return null;
  return { passwordHash, sessionSecret };
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function isEditorProtectionConfigured() {
  return config() !== null;
}

export function verifyEditorPassword(password: string) {
  const currentConfig = config();
  if (!currentConfig) return false;
  const [algorithm, salt, storedHash] = currentConfig.passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !storedHash || !/^[a-f0-9]+$/i.test(storedHash)) return false;
  const expected = Buffer.from(storedHash, "hex");
  const derived = scryptSync(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function hasEditorSession() {
  const currentConfig = config();
  if (!currentConfig) return false;
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [expiresAt, nonce, signature] = value.split(".");
  if (!expiresAt || !nonce || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  const expected = sign(`${expiresAt}.${nonce}`, currentConfig.sessionSecret);
  const received = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export function createEditorSession() {
  const currentConfig = config();
  if (!currentConfig) throw new Error("La protección de edición no está configurada");
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const nonce = randomUUID();
  return {
    value: `${expiresAt}.${nonce}.${sign(`${expiresAt}.${nonce}`, currentConfig.sessionSecret)}`,
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export const editorCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};