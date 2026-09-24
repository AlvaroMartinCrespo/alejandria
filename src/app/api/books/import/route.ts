import { NextResponse } from "next/server";
import { parseBookBackup } from "@/lib/book-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { importBooks } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  let backup;
  try {
    backup = parseBookBackup(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "La copia no es válida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const imported = await importBooks(backup.books, backup.collections);
    return NextResponse.json({ imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar la copia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}