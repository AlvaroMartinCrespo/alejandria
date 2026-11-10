import { NextResponse } from "next/server";
import { parseActivityBackup } from "@/lib/activity-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { importReadingLog } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  let entries;
  try {
    entries = parseActivityBackup(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "El historial no es válido";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    return NextResponse.json({ imported: await importReadingLog(entries) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar el historial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
