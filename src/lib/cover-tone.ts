import { useCallback, useState, type CSSProperties } from "react";

/**
 * Color dominante de una portada, listo para usarse como acento sobre fondo oscuro.
 *
 * ¿Por qué no `node-vibrant` / `fast-average-color`? Para una sola operación (un
 * color por portada) bastan ~80 líneas de canvas, evitan una dependencia nueva y
 * permiten ajustar el resultado a esta interfaz (ver `toAccent`). Si más adelante
 * se quisiera una paleta completa, esta función se sustituye por
 * `Vibrant.from(img).getPalette()` sin tocar a quien la usa: solo devuelve un hex.
 *
 * Funciona porque `next/image` sirve las portadas desde `/_next/image` (mismo
 * origen), así que el canvas no queda "contaminado" (tainted). Con una imagen
 * `unoptimized` de otro dominio `getImageData` lanza y se devuelve `null`: el
 * llamador conserva el acento por defecto.
 */
export type CoverTone = {
  /** Hex del acento (#rrggbb), con contraste ≥ 4,5:1 sobre las superficies oscuras. */
  color: string;
};

const SAMPLE_WIDTH = 32;
const HUE_BINS = 36;
/** Luminancia relativa aproximada de la superficie más clara donde se usa el acento (#191c1b). */
const SURFACE_LUMINANCE = 0.011;
const MIN_CONTRAST = 4.5;

export function extractCoverTone(img: HTMLImageElement): CoverTone | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const width = SAMPLE_WIDTH;
  const height = Math.max(8, Math.round((SAMPLE_WIDTH * img.naturalHeight) / img.naturalWidth));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  let pixels: Uint8ClampedArray;
  try {
    context.drawImage(img, 0, 0, width, height);
    pixels = context.getImageData(0, 0, width, height).data;
  } catch {
    return null; // canvas contaminado (imagen de otro origen sin CORS)
  }

  // Histograma por tono. Cada píxel pesa según lo "vivo" que es (saturación) y lo
  // lejos que está del negro y del blanco, para que ni el fondo ni los textos de la
  // portada decidan el color.
  const bins = Array.from({ length: HUE_BINS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  let neutral = { weight: 0, r: 0, g: 0, b: 0 };

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const [hue, saturation, lightness] = rgbToHsl(r, g, b);
    if (lightness < 0.1 || lightness > 0.94) continue;

    const midness = 1 - Math.abs(2 * lightness - 1);
    const weight = saturation * saturation * midness;
    const bin = bins[Math.min(HUE_BINS - 1, Math.floor((hue / 360) * HUE_BINS))];
    bin.weight += weight;
    bin.r += r * weight;
    bin.g += g * weight;
    bin.b += b * weight;
    neutral = { weight: neutral.weight + midness, r: neutral.r + r * midness, g: neutral.g + g * midness, b: neutral.b + b * midness };
  }

  // Tono ganador: se suman los contiguos a medio peso para no partir un mismo color en dos cajas.
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < HUE_BINS; i += 1) {
    const score = bins[i].weight + 0.5 * (bins[(i + HUE_BINS - 1) % HUE_BINS].weight + bins[(i + 1) % HUE_BINS].weight);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  const sampleCount = width * height;
  const vivid = best >= 0 && bins[best].weight > sampleCount * 0.02;
  const source = vivid ? bins[best] : neutral;
  if (source.weight <= 0) return null; // portada casi totalmente negra o blanca
  return { color: toAccent(source.r / source.weight, source.g / source.weight, source.b / source.weight) };
}

/**
 * Convierte el color medio en un acento utilizable: lo aclara y satura lo justo para
 * que se vea sobre fondos casi negros y lo sube hasta alcanzar el contraste mínimo.
 */
function toAccent(r: number, g: number, b: number): string {
  const [hue, rawSaturation, rawLightness] = rgbToHsl(r, g, b);
  const saturation = rawSaturation < 0.12 ? rawSaturation : Math.min(0.85, Math.max(0.4, rawSaturation));
  let lightness = Math.min(0.72, Math.max(0.58, rawLightness));
  let rgb = hslToRgb(hue, saturation, lightness);
  for (let attempt = 0; attempt < 12 && contrastOnSurface(rgb) < MIN_CONTRAST; attempt += 1) {
    lightness = Math.min(0.9, lightness + 0.03);
    rgb = hslToRgb(hue, saturation, lightness);
  }
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function contrastOnSurface([r, g, b]: number[]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return (luminance + 0.05) / (SURFACE_LUMINANCE + 0.05);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): number[] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] =
    hue < 60 ? [chroma, x, 0]
    : hue < 120 ? [x, chroma, 0]
    : hue < 180 ? [0, chroma, x]
    : hue < 240 ? [0, x, chroma]
    : hue < 300 ? [x, 0, chroma]
    : [chroma, 0, x];
  return [r, g, b].map((channel) => Math.round((channel + m) * 255));
}

/** Resultados ya calculados, para no repintar desde cero al volver a una página. */
const memo = new Map<string, CoverTone | null>();

/**
 * Hook para páginas: devuelve el tono de la portada y el callback que hay que pasar
 * a `<BookCover onTone={…} />`. El tono queda en memoria durante la sesión.
 *
 * La primera pintura nunca lo usa (el servidor no conoce el color), así que no hay
 * desajuste de hidratación: el acento por defecto aparece primero y el del libro
 * entra con un fundido.
 */
export function useCoverTone(url: string | null) {
  const [state, setState] = useState<{ url: string | null; tone: CoverTone | null }>({ url: null, tone: null });
  const tone = url ? (state.url === url ? state.tone : (memo.get(url) ?? null)) : null;
  const onTone = useCallback(
    (next: CoverTone | null) => {
      if (!url) return;
      memo.set(url, next);
      setState({ url, tone: next });
    },
    [url],
  );
  return { tone, onTone };
}

/** Estilo inline que expone el tono al CSS como `--book-color` (sin tono: no añade nada). */
export function toneStyle(tone: CoverTone | null): CSSProperties | undefined {
  return tone ? ({ "--book-color": tone.color } as CSSProperties) : undefined;
}
