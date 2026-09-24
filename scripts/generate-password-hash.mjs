import { randomBytes, scryptSync } from "node:crypto";

const password = process.env.ALEJANDRIA_PASSWORD;
if (!password) {
  console.error("Define ALEJANDRIA_PASSWORD antes de ejecutar este script.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log(`ALEJANDRIA_PASSWORD_HASH=scrypt:${salt}:${hash}`);
console.log(`ALEJANDRIA_SESSION_SECRET=${randomBytes(32).toString("hex")}`);