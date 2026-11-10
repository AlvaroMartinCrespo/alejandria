// Resuelve el alias "@/…" → "src/…" para ejecutar TypeScript con Node en los scripts de prueba.
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

const root = pathResolve(import.meta.dirname, "..", "src");

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = pathResolve(root, specifier.slice(2));
    const file = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate) && candidate.match(/\.tsx?$/));
    if (file) return next(pathToFileURL(file).href, context);
  }
  return next(specifier, context);
}
