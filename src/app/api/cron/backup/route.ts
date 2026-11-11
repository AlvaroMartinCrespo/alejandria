import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runLibraryBackup } from "@/lib/backup-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Leer todas las tablas y enviar el correo puede tardar más que el límite por defecto.
export const maxDuration = 60;

/** Comparación en tiempo constante (se comparan hashes para que la longitud no se filtre). */
function safeEqual(a: string, b: string) {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

/**
 * Cron diario de Vercel. Vercel envía `Authorization: Bearer $CRON_SECRET` en cada invocación.
 * Solo se acepta ese secreto: la cookie de edición NO autoriza esta ruta.
 * Envía la copia únicamente si han pasado BACKUP_EVERY_DAYS días desde el último envío correcto.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET no está configurado." }, { status: 503 });

  const authorization = request.headers.get("authorization") ?? "";
  if (!safeEqual(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const outcome = await runLibraryBackup({ trigger: "cron" });
  return NextResponse.json(outcome, { status: outcome.status === "error" ? 500 : 200 });
}
