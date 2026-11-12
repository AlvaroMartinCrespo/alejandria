"use client";

import { useEffect, useRef } from "react";

/** Cada cuánto se vuelve a pedir todo mientras la pestaña está visible. */
export const LIVE_REFRESH_INTERVAL_MS = 45_000;
/** Mínimo entre dos refrescos (focus + visibilitychange suelen llegar juntos). */
const MIN_GAP_MS = 5_000;

/** `true` si el usuario tiene el foco en un campo editable (no se le debe pisar lo que escribe). */
export function isTypingInField() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/**
 * Opción 0 del plan de tiempo real: vuelve a pedir los datos cuando la pestaña recupera el
 * foco / la conexión y cada ~45 s mientras está visible. Sirve para que un dispositivo se
 * entere de lo que hizo el otro sin recargar. `refresh` decide por sí misma si debe omitirse
 * (guardados en curso, campo en edición…).
 */
export function useLiveRefresh(
  refresh: () => void | Promise<void>,
  enabled: boolean,
  intervalMs = LIVE_REFRESH_INTERVAL_MS,
) {
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();

    const run = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      void Promise.resolve(refreshRef.current()).catch(() => undefined);
    };

    const timer = window.setInterval(run, intervalMs);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, [enabled, intervalMs]);
}

/** Comparación por valor para no volver a renderizar si el servidor devuelve lo mismo. */
export function sameData(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
