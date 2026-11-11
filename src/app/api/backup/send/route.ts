import { NextResponse } from "next/server";
import { runLibraryBackup } from "@/lib/backup-service";
import { hasEditorSession } from "@/lib/editor-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Leer todas las tablas y enviar el correo puede tardar más que el límite por defecto.
export const maxDuration = 60;

/**
 * Envío manual desde Estadísticas («Enviar copia ahora»). Solo con sesión de edición.
 * Fuerza el envío aunque no hayan pasado BACKUP_EVERY_DAYS días; si sale bien, queda registrado
 * (trigger `manual`) y el plazo de los envíos automáticos se cuenta desde esta copia.
 */
export async function POST() {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });

  const outcome = await runLibraryBackup({ trigger: "manual", force: true });
  return NextResponse.json(outcome, { status: outcome.status === "error" ? 500 : 200 });
}
