"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { ChangeEvent } from "@/lib/realtime-events";

/**
 * `off`: sin tiempo real (modo local o faltan variables) · `connecting` · `live` · `offline`.
 */
export type RealtimeStatus = "off" | "connecting" | "live" | "offline";

interface Options {
  enabled: boolean;
  /** Nombre único del canal (uno por provider). */
  channel: string;
  /** Tablas `public.*` a escuchar. */
  tables: string[];
  /** Cada evento recibido. El provider decide cuándo aplicarlo (ver `onIdle`). */
  onChange: (table: string, event: ChangeEvent) => void;
  /** Se llama cuando se calma la actividad propia (fin de un guardado, salida de un campo). */
  onIdle?: () => void;
  /** Refetch completo (reconexión, eventos descartados). */
  resync: () => void | Promise<void>;
  /** `true` si ahora mismo no se debe tocar el estado (guardado en vuelo, campo en edición…). */
  isBusy: () => boolean;
}

/**
 * Abre un canal de Supabase Realtime y entrega los cambios de las tablas indicadas.
 *
 * Protección frente al eco y a pisar lo que se está editando: mientras `isBusy()` es `true`
 * (guardado propio en vuelo, campo en edición) el provider NO aplica los eventos, los deja en
 * cola; `settle()` avisa (`onIdle`) cuando se calma y entonces se aplican. Si hace falta, se
 * marca «sucio» y `settle()` hace un `resync()` completo (refetch).
 * Al (re)conectar el canal también se hace `resync()`: los eventos ocurridos mientras el
 * dispositivo dormía no se reenvían.
 */
export function useRealtimeSync(options: Options) {
  const { enabled, channel: channelName, tables } = options;
  const [status, setStatus] = useState<RealtimeStatus>("off");
  const optionsRef = useRef(options);
  const dirtyRef = useRef(false);
  const tablesKey = tables.join(",");

  useEffect(() => {
    optionsRef.current = options;
  });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  /** Llamar cuando termine un guardado propio: si había eventos descartados, resincroniza. */
  const settle = useCallback(() => {
    const current = optionsRef.current;
    if (current.isBusy()) return;
    current.onIdle?.();
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    void Promise.resolve(current.resync()).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let active = true;
    const channel = supabase.channel(channelName);
    for (const table of tablesKey.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (!active) return;
        optionsRef.current.onChange(table, payload as unknown as ChangeEvent);
      });
    }

    queueMicrotask(() => active && setStatus("connecting"));
    channel.subscribe((state) => {
      if (!active) return;
      if (state === "SUBSCRIBED") {
        setStatus("live");
        const current = optionsRef.current;
        if (current.isBusy()) dirtyRef.current = true;
        else void Promise.resolve(current.resync()).catch(() => undefined);
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
        setStatus("offline");
      }
    });

    // Al salir de un campo se aplican los cambios que esperaban en cola mientras se escribía.
    let timer: number | undefined;
    const onFocusOut = () => {
      window.clearTimeout(timer);
      // Más que el debounce del autosave (700 ms): así no se aplica nada viejo antes de que se guarde lo escrito.
      timer = window.setTimeout(settle, 1500);
    };
    document.addEventListener("focusout", onFocusOut);

    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("focusout", onFocusOut);
      void supabase.removeChannel(channel);
      setStatus("off");
    };
  }, [enabled, channelName, tablesKey, settle]);

  return { status, markDirty, settle };
}
