import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el NAVEGADOR (solo lectura / Realtime).
 *
 * Usa la clave `anon`, que es pública por diseño: va incluida en el JavaScript.
 * Las políticas de `supabase/migration-realtime.sql` solo le permiten `SELECT`;
 * todas las escrituras siguen pasando por las rutas `/api/*` con la clave de servidor.
 *
 * Las variables `NEXT_PUBLIC_*` se sustituyen en tiempo de compilación, por eso se
 * leen con el nombre literal (no con `process.env[name]`).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** `true` si hay variables para abrir el canal de tiempo real. Sin ellas, la app funciona como siempre. */
export const realtimeConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Devuelve el cliente (creado una sola vez) o `null` si faltan las variables. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined" || !url || !anonKey) return null;
  client ??= createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}
