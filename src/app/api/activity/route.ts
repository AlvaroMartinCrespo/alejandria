import { NextResponse } from "next/server";
import { listReadingLog } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lectura abierta, igual que /api/books.
export async function GET() {
  try {
    return NextResponse.json({ entries: await listReadingLog() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Historial no disponible";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
