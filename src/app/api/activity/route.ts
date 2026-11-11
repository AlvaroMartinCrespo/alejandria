import { NextResponse } from "next/server";
import { listReadingLog, listReadingMarks } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lectura abierta, igual que /api/books.
export async function GET() {
  try {
    // Si falta la migración de los días marcados, el historial sigue funcionando.
    // `marksAvailable` avisa al cliente de que la lista vacía no es real (la copia JSON lo necesita).
    let marksAvailable = true;
    const [entries, marks] = await Promise.all([
      listReadingLog(),
      listReadingMarks().catch(() => {
        marksAvailable = false;
        return [] as string[];
      }),
    ]);
    return NextResponse.json({ entries, marks, marksAvailable });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Historial no disponible";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
