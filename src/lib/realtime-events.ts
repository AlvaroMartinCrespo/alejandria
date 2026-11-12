/**
 * Lógica pura para aplicar eventos de Supabase Realtime (`postgres_changes`) sobre una lista
 * del estado. Sin React ni Supabase: se prueba con `scripts/test-realtime.mjs`.
 */

export interface ChangeEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  /** Fila nueva (vacía en DELETE). */
  new: Record<string, unknown>;
  /** Fila anterior: en DELETE solo trae la clave primaria (`id`). */
  old: Record<string, unknown>;
}

interface Identified {
  $id: string;
  updatedAt?: string;
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

/** `true` si el evento es más antiguo que lo que ya se tiene (hay que ignorarlo). */
export function isStale(incoming?: string, local?: string) {
  if (!incoming || !local) return false;
  const a = Date.parse(incoming);
  const b = Date.parse(local);
  return Number.isFinite(a) && Number.isFinite(b) && a < b;
}

/** Id de la fila afectada por el evento, o `null` si no se puede determinar. */
export function eventRowId(event: ChangeEvent): string | null {
  const row = event.eventType === "DELETE" ? event.old : event.new;
  return typeof row?.id === "string" ? row.id : null;
}

/**
 * Aplica un evento a la lista y devuelve la lista nueva (o la MISMA si no hay cambios).
 *
 * - INSERT: se añade si no existe (evita duplicados con la respuesta del propio POST); si ya
 *   existe se trata como UPDATE.
 * - UPDATE: sustituye por id solo si `updated_at` entrante ≥ el local. Se mezcla con el
 *   elemento local ignorando los campos ausentes: con `REPLICA IDENTITY DEFAULT`, Postgres
 *   puede omitir en el evento las columnas grandes (TOAST) que no cambiaron (notas, sinopsis).
 *   Si el id no existe (se perdió el INSERT), se añade.
 * - DELETE: quita por id.
 *
 * @param fromRow  mapeo fila → objeto (`fromBookRow`…); recibe la fila tal como llega.
 * @param normalize opcional, aplicado al resultado mezclado (`normalizeBook`…).
 */
export function applyChange<Row, T extends Identified>(
  list: T[],
  event: ChangeEvent,
  fromRow: (row: Row) => T,
  normalize: (value: T) => T = (value) => value,
): T[] {
  const id = eventRowId(event);
  if (!id) return list;

  if (event.eventType === "DELETE") {
    return list.some((item) => item.$id === id) ? list.filter((item) => item.$id !== id) : list;
  }

  const incoming = fromRow(event.new as Row);
  const index = list.findIndex((item) => item.$id === id);
  if (index < 0) return [...list, normalize(incoming)];

  const local = list[index];
  if (isStale(incoming.updatedAt, local.updatedAt)) return list;
  const merged = normalize({ ...local, ...definedOnly(incoming) });
  const next = list.slice();
  next[index] = merged;
  return next;
}

/** Aplica varios eventos en orden (el reordenado genera N UPDATE seguidos). */
export function applyChanges<Row, T extends Identified>(
  list: T[],
  events: ChangeEvent[],
  fromRow: (row: Row) => T,
  normalize?: (value: T) => T,
): T[] {
  return events.reduce((current, event) => applyChange(current, event, fromRow, normalize), list);
}

const dropStamp = (key: string, value: unknown) => (key === "updatedAt" ? undefined : value);

/**
 * `true` si dos listas son iguales salvo la marca `updatedAt`. El eco de un cambio propio
 * llega con un `updated_at` más nuevo pero con el mismo contenido: no es un cambio ajeno
 * y no debe avisar al usuario.
 */
export function sameContent(left: Identified[], right: Identified[]) {
  return JSON.stringify(left, dropStamp) === JSON.stringify(right, dropStamp);
}
