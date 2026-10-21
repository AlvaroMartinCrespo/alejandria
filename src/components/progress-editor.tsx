"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, RotateCw } from "lucide-react";

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY = 700;
const SAVED_VISIBLE_MS = 2200;

/**
 * Editor del porcentaje leído.
 *
 * El input trabaja con un borrador de texto (`draft`) en lugar de con el número
 * guardado. Antes el valor era `Number(event.target.value)`, y `Number("") === 0`,
 * así que al borrar el campo volvía a aparecer un `0` imposible de quitar.
 * Con el borrador, el campo puede quedar vacío mientras se escribe y solo se
 * guarda cuando hay un número válido.
 */
export function ProgressEditor({
  bookId,
  title,
  progress,
  disabled,
  onSave,
}: {
  bookId: string;
  title: string;
  progress: number;
  disabled: boolean;
  onSave: (id: string, progress: number) => Promise<void>;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState(String(progress));
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);
  const inFlight = useRef(false);
  const queued = useRef<number | null>(null);
  const lastSaved = useRef(progress);
  const dirty = useRef(false);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // Al salir de la página con un cambio pendiente, se guarda en lugar de perderlo.
  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      const pending = queued.current;
      if (dirty.current && pending !== null && !inFlight.current) {
        void onSaveRef.current(bookId, pending).catch(() => undefined);
      }
    };
  }, [bookId]);

  async function persist(value: number) {
    if (inFlight.current) {
      queued.current = value;
      return;
    }
    inFlight.current = true;
    setState("saving");
    try {
      await onSaveRef.current(bookId, value);
      lastSaved.current = value;
      const next = queued.current;
      queued.current = null;
      inFlight.current = false;
      if (next !== null && next !== value) {
        await persist(next);
        return;
      }
      dirty.current = false;
      setState("saved");
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setState("idle"), SAVED_VISIBLE_MS);
    } catch {
      inFlight.current = false;
      queued.current = null;
      setState("error");
    }
  }

  function schedule(value: number) {
    if (timer.current) window.clearTimeout(timer.current);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    queued.current = value;
    setState("pending");
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const next = queued.current;
      queued.current = null;
      if (next !== null) void persist(next);
    }, AUTOSAVE_DELAY);
  }

  function handleChange(raw: string) {
    // Solo dígitos: permite borrar del todo y evita "e", "-" o decimales.
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    if (digits === "") {
      // Campo vacío: se respeta mientras se escribe y no se guarda nada todavía.
      setDraft("");
      dirty.current = true;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      queued.current = null;
      setState("idle");
      return;
    }
    const value = Math.min(100, Number(digits));
    // String(value) quita ceros a la izquierda ("030" -> "30") y limita a 100.
    setDraft(String(value));
    dirty.current = true;
    if (value === lastSaved.current && !inFlight.current) {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      queued.current = null;
      dirty.current = false;
      setState("idle");
      return;
    }
    schedule(value);
  }

  function handleBlur() {
    if (draft === "") {
      // Se dejó vacío: se vuelve al último valor guardado en lugar de guardar un 0 por accidente.
      setDraft(String(lastSaved.current));
      dirty.current = false;
      return;
    }
    // Al salir del campo se guarda sin esperar al temporizador.
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
      const next = queued.current;
      queued.current = null;
      if (next !== null) void persist(next);
    }
  }

  function retry() {
    const value = draft === "" ? lastSaved.current : Number(draft);
    void persist(value);
  }

  return (
    <div className="progress-editor">
      <label htmlFor={inputId}>Porcentaje leído</label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={draft}
        disabled={disabled}
        aria-label={`Porcentaje leído de ${title}`}
        aria-invalid={state === "error" || undefined}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <span aria-hidden="true">%</span>
      <span className={`save-indicator ${state}`} role="status" aria-live="polite">
        {state === "pending" && (
          <>
            <i className="save-dot" aria-hidden="true" />
            Sin guardar
          </>
        )}
        {state === "saving" && (
          <>
            <i className="save-dot" aria-hidden="true" />
            Guardando…
          </>
        )}
        {state === "saved" && (
          <>
            <Check size={13} strokeWidth={3} aria-hidden="true" />
            Guardado
          </>
        )}
        {state === "error" && (
          <>
            <i className="save-dot" aria-hidden="true" />
            No se guardó
            <button type="button" className="save-retry" onClick={retry} aria-label="Reintentar guardado">
              <RotateCw size={12} aria-hidden="true" />
              Reintentar
            </button>
          </>
        )}
      </span>
    </div>
  );
}
