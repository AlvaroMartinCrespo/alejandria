import { NextResponse } from "next/server";
import { getLibraryBackupStatus } from "@/lib/backup-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fecha del último envío correcto y del siguiente automático. Solo fechas y recuentos: ningún secreto ni dirección. */
export async function GET() {
  try {
    return NextResponse.json(await getLibraryBackupStatus());
  } catch {
    // Normalmente: falta aplicar supabase/migration-backup-log.sql.
    return NextResponse.json({ error: "No se pudo consultar el registro de copias." }, { status: 503 });
  }
}
