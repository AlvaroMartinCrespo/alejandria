import { NextResponse } from "next/server";
import { parseActivityBackup, parseMarksBackup } from "@/lib/activity-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { addReadingMarks, importReadingLog } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  let entries;
  let marks;
  try {
    const body = await request.json();
    entries = parseActivityBackup(body);
    marks = parseMarksBackup(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "El historial no es válido";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const imported = await importReadingLog(entries);
    await addReadingMarks(marks);
    return NextResponse.json({ imported, marks: marks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar el historial";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
