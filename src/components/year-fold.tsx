"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

const listeners = new Set<() => void>();

function readOpen(storageKey: string, id: string): boolean {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    return parsed[id] === true;
  } catch {
    return false;
  }
}

function writeOpen(storageKey: string, id: string, open: boolean) {
  try {
    // Lectura + escritura en el momento: así varios años no se pisan entre sí.
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    window.localStorage.setItem(storageKey, JSON.stringify({ ...parsed, [id]: open }));
    listeners.forEach((notify) => notify());
  } catch {
    // Sin almacenamiento disponible: el desplegable sigue funcionando, solo que sin memoria.
  }
}

/**
 * Desplegable de un año. Recuerda en localStorage si estaba abierto o cerrado
 * (por defecto, cerrado). `forceOpen` lo abre temporalmente (p. ej. durante una
 * búsqueda) sin modificar el estado guardado.
 */
export function YearFold({
  storageKey,
  id,
  title,
  count,
  forceOpen = false,
  children,
}: {
  storageKey: string;
  id: string;
  title: string;
  count: string;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  // Lee el estado guardado sin desajustes de hidratación (en servidor: cerrado).
  const open = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => readOpen(storageKey, id),
    () => false,
  );

  return (
    <details
      className="year-fold"
      open={open || forceOpen}
      onToggle={(event) => {
        const next = (event.currentTarget as HTMLDetailsElement).open;
        if (forceOpen) return;
        if (next !== open) writeOpen(storageKey, id, next);
      }}
    >
      <summary>
        <ChevronDown className="year-chevron" size={17} aria-hidden="true" />
        <strong>{title}</strong>
        <span className="year-count">{count}</span>
      </summary>
      <div className="year-fold-body">{children}</div>
    </details>
  );
}
