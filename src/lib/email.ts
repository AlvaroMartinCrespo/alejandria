/**
 * Envío de correo con Resend (https://resend.com/docs/api-reference/emails/send-email) mediante `fetch`,
 * sin dependencias adicionales. Solo para servidor: usa `RESEND_API_KEY`.
 */

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 30_000;

/** Resend admite 40 MB por correo *después* de codificar los adjuntos en base64 (×4/3). */
export const MAX_ATTACHMENTS_BYTES = 30 * 1024 * 1024;

export interface EmailAttachment {
  filename: string;
  content: Uint8Array | string;
}

export interface SendEmailInput {
  /** Una dirección o varias separadas por comas. */
  to: string | string[];
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
  /** Por defecto `BACKUP_EMAIL_FROM`. */
  from?: string;
  /** Por defecto `RESEND_API_KEY`. */
  apiKey?: string;
}

/** Divide «a@x.com, b@y.com» en una lista limpia. */
export function parseRecipients(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : value.split(",");
  return list.map((address) => address.trim()).filter(Boolean);
}

function toBuffer(content: Uint8Array | string) {
  return typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
}

/** Envía un correo con adjuntos. Devuelve el identificador de Resend; lanza un `Error` legible si falla. */
export async function sendBackupEmail({
  to,
  subject,
  text,
  attachments = [],
  from = process.env.BACKUP_EMAIL_FROM,
  apiKey = process.env.RESEND_API_KEY,
}: SendEmailInput): Promise<{ id: string }> {
  if (!apiKey) throw new Error("Falta RESEND_API_KEY.");
  if (!from) throw new Error("Falta BACKUP_EMAIL_FROM.");
  const recipients = parseRecipients(to);
  if (!recipients.length) throw new Error("Falta BACKUP_EMAIL_TO.");

  const files = attachments.map((attachment) => ({ filename: attachment.filename, buffer: toBuffer(attachment.content) }));
  const total = files.reduce((sum, file) => sum + file.buffer.length, 0);
  if (total > MAX_ATTACHMENTS_BYTES) {
    const mb = (value: number) => (value / 1024 / 1024).toFixed(1);
    throw new Error(`Los adjuntos pesan ${mb(total)} MB y superan el límite de ${mb(MAX_ATTACHMENTS_BYTES)} MB del correo.`);
  }

  let response: Response;
  try {
    response = await fetch(RESEND_URL, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        text,
        attachments: files.map((file) => ({ filename: file.filename, content: file.buffer.toString("base64") })),
      }),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new Error(timedOut ? "Resend no respondió a tiempo." : "No se pudo conectar con Resend.");
  }

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(`Resend rechazó el correo (${response.status})${body?.message ? `: ${body.message}` : "."}`);
  }
  return { id: body?.id ?? "" };
}
