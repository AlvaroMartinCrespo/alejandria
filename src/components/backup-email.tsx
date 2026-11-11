"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import type { BackupStatus } from "@/lib/backup-run";

type StatusState = BackupStatus | "loading" | "unavailable";
type Notice = { kind: "ok" | "error"; text: string };
type SendResponse = Partial<{ status: string; error: string; bookCount: number; animeCount: number; omitted: string[]; logged: boolean }>;

const OMITTED_LABELS: Record<string, string> = { activity: "el historial de lectura", marks: "los días marcados" };

async function fetchStatus(): Promise<StatusState> {
  try {
    const response = await fetch("/api/backup/status", { cache: "no-store" });
    return response.ok ? ((await response.json()) as BackupStatus) : "unavailable";
  } catch {
    return "unavailable";
  }
}

const dateTime = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" });
const dayOnly = new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" });

function describe(status: BackupStatus) {
  if (!status.configured) return "El envío por correo no está configurado en el servidor.";
  if (!status.lastBackup) return "Todavía no se ha enviado ninguna copia. La primera saldrá en el próximo envío automático.";
  const sent = dateTime.format(new Date(status.lastBackup.sentAt));
  const origin = status.lastBackup.trigger === "manual" ? "manual" : "automática";
  const next = status.nextDueDate ? ` · Próxima automática a partir del ${dayOnly.format(new Date(`${status.nextDueDate}T00:00:00Z`))}` : "";
  return `Última copia enviada: ${sent} (${origin}, ${status.lastBackup.bookCount} libros y ${status.lastBackup.animeCount} anime)${next}.`;
}

/**
 * Copia por correo: muestra cuándo salió la última y, con sesión de edición, permite enviar una ahora.
 * El servidor vuelve a comprobar la sesión: ocultar el botón es solo comodidad.
 */
export function BackupEmail({ editing }: { editing: boolean }) {
  const [status, setStatus] = useState<StatusState>("loading");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    void fetchStatus().then((next) => { if (active) setStatus(next); });
    return () => { active = false; };
  }, []);

  async function sendNow() {
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/backup/send", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as SendResponse;
      if (response.ok && body.status === "sent") {
        const warnings: string[] = [];
        if (body.omitted?.length) warnings.push(`copia incompleta: faltan ${body.omitted.map((part) => OMITTED_LABELS[part] ?? part).join(" y ")}`);
        if (body.logged === false) warnings.push("no se pudo anotar en el registro, así que el envío automático podría repetirla");
        setNotice({
          kind: "ok",
          text: `Copia enviada (${body.bookCount ?? 0} libros y ${body.animeCount ?? 0} anime).${warnings.length ? ` Aviso: ${warnings.join("; ")}.` : ""}`,
        });
      } else {
        setNotice({ kind: "error", text: body.error ?? (response.status === 401 ? "Edición bloqueada: desbloquéala para enviar la copia." : "No se pudo enviar la copia.") });
      }
      setStatus(await fetchStatus());
    } catch {
      setNotice({ kind: "error", text: "No se pudo contactar con el servidor. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSending(false);
    }
  }

  const unavailable = status === "unavailable";
  const configured = typeof status === "object" ? status.configured : true;

  return (
    <section className="backup-mail">
      <div>
        <h2>Copia por correo</h2>
        <p>
          {status === "loading"
            ? "Consultando la última copia…"
            : unavailable
              ? "No se pudo consultar el registro de copias."
              : describe(status)}
        </p>
        <p className={`backup-mail-notice${notice ? ` ${notice.kind}` : ""}`} role="status" aria-live="polite">{notice?.text ?? ""}</p>
      </div>
      {editing && (
        <button className="button secondary" type="button" onClick={() => void sendNow()} disabled={sending || !configured}>
          <Mail size={15} />{sending ? "Enviando…" : "Enviar copia ahora"}
        </button>
      )}
    </section>
  );
}
