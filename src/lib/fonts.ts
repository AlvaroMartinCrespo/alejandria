import { Fraunces, IBM_Plex_Mono, Instrument_Sans, Noto_Serif_JP } from "next/font/google";

/**
 * Tipografías propias, servidas por `next/font` (auto-alojadas en el build: sin
 * peticiones a Google en tiempo de ejecución y sin dependencias nuevas).
 *
 *  - Fraunces: serif con carácter para títulos, citas y sinopsis. El eje óptico
 *    (`opsz`) hace que los titulares grandes ganen contraste y los textos
 *    pequeños sigan siendo legibles.
 *  - Instrument Sans: sans limpia para la interfaz.
 *  - IBM Plex Mono: metadatos (páginas, años, etiquetas de la ficha).
 *  - Noto Serif JP: japonés (cabeceras de anime y sellos hanko). Es una fuente
 *    CJK enorme, así que no se precarga: el navegador solo descarga los
 *    fragmentos (`unicode-range`) de los caracteres que realmente aparecen.
 *
 * Cada una expone una variable CSS (`--font-*`); las pilas completas con sus
 * alternativas del sistema están en `:root` de globals.css (`--serif`, `--sans`,
 * `--mono`, `--jp`).
 */
export const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

export const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-instrument-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const notoSerifJP = Noto_Serif_JP({
  weight: ["400", "600"],
  preload: false,
  display: "swap",
  variable: "--font-noto-serif-jp",
});

/** Clases que declaran las variables CSS de las cuatro fuentes. Se aplican en <html>. */
export const fontVariables = [
  fraunces.variable,
  instrumentSans.variable,
  plexMono.variable,
  notoSerifJP.variable,
].join(" ");
