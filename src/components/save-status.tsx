"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_VISIBLE_MS = 1800;

export interface SaveStatus {
  /** Estado actual de un campo concreto. */
  stateOf: (key: string) => SaveState;
  /** Marca que el campo ha empezado a actualizarse. */
  begin: (key: string) => void;
  /** Marca que ha terminado; `ok=false` deja el aviso de error visible. */
  end: (key: string, ok: boolean) => void;
  /** Ejecuta una operación mostrando Actualizando… → Actualizado. Devuelve si salió bien. */
  track: (key: string, operation: () => Promise<unknown>) => Promise<boolean>;
}

/**
 * Estado de guardado por campo. Cada campo (`"notes"`, `"rating"`…) tiene su
 * propio indicador: "Actualizando…" mientras la petición no ha terminado,
 * "Actualizado" cuando ya está en la base de datos (desaparece solo) y
 * "No se actualizó" si falló. Admite varias peticiones simultáneas por campo:
 * "Actualizado" solo aparece cuando terminan todas.
 */
export function useSaveStatus(): SaveStatus {
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const pending = useRef<Record<string, number>>({});
  const failed = useRef<Record<string, boolean>>({});
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    const active = timers.current;
    return () => Object.values(active).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const set = useCallback((key: string, state: SaveState) => {
    setStates((current) => (current[key] === state ? current : { ...current, [key]: state }));
  }, []);

  const begin = useCallback((key: string) => {
    if (timers.current[key]) window.clearTimeout(timers.current[key]);
    pending.current[key] = (pending.current[key] ?? 0) + 1;
    failed.current[key] = false;
    set(key, "saving");
  }, [set]);

  const end = useCallback((key: string, ok: boolean) => {
    pending.current[key] = Math.max(0, (pending.current[key] ?? 1) - 1);
    if (!ok) failed.current[key] = true;
    if (pending.current[key] > 0) return;
    if (failed.current[key]) {
      set(key, "error");
      return;
    }
    set(key, "saved");
    if (timers.current[key]) window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => set(key, "idle"), SAVED_VISIBLE_MS);
  }, [set]);

  const track = useCallback(async (key: string, operation: () => Promise<unknown>) => {
    begin(key);
    try {
      await operation();
      end(key, true);
      return true;
    } catch {
      end(key, false);
      return false;
    }
  }, [begin, end]);

  const stateOf = useCallback((key: string) => states[key] ?? "idle", [states]);

  return { stateOf, begin, end, track };
}

/**
 * Guardado con espera para campos de texto/número: agrupa lo que se escribe y
 * envía una sola petición cuando se deja de teclear (o al salir del campo / de
 * la página). El indicador pasa a "Actualizando…" desde la primera pulsación.
 */
export function useAutosave<T>(
  key: string,
  status: SaveStatus,
  commit: (value: T) => Promise<unknown>,
  delay = 700,
) {
  const timer = useRef<number | null>(null);
  const latest = useRef<{ value: T } | null>(null);
  const open = useRef(false);
  const commitRef = useRef(commit);
  const { begin, end } = status;

  useEffect(() => {
    commitRef.current = commit;
  });

  const run = useCallback(async () => {
    timer.current = null;
    const item = latest.current;
    if (!item) return;
    latest.current = null;
    let ok = true;
    try {
      await commitRef.current(item.value);
    } catch {
      ok = false;
    }
    // Si mientras se guardaba se siguió escribiendo, se espera a la siguiente tanda.
    if (latest.current === null && timer.current === null) {
      open.current = false;
      end(key, ok);
    }
  }, [end, key]);

  const schedule = useCallback((value: T) => {
    latest.current = { value };
    if (!open.current) {
      open.current = true;
      begin(key);
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void run(), delay);
  }, [begin, delay, key, run]);

  const flush = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      void run();
    }
  }, [run]);

  // Al salir de la página con un cambio sin enviar, se envía en lugar de perderlo.
  useEffect(() => () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      void run();
    }
  }, [run]);

  return { schedule, flush };
}

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span className={`save-indicator ${state}`} role="status" aria-live="polite">
      {state === "saving" && (
        <>
          <i className="save-dot" aria-hidden="true" />
          Actualizando…
        </>
      )}
      {state === "saved" && (
        <>
          <Check size={13} strokeWidth={3} aria-hidden="true" />
          Actualizado
        </>
      )}
      {state === "error" && (
        <>
          <i className="save-dot" aria-hidden="true" />
          No se actualizó
        </>
      )}
    </span>
  );
}
