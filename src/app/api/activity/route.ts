import { NextResponse } from "next/server";
import { listReadingLog, listReadingMarks } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lectura abierta, igual que /api/books.
export async function GET() {
  try {
    // Si falta la migración de los días marcados, el historial sigue funcionando.
    const [entries, marks] = await Promise.all([listReadingLog(), listReadingMarks().catch(() => [] as string[])]);
    return NextResponse.json({ entries, marks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Historial no disponible";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
