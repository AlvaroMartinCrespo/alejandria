import { NextResponse } from "next/server";
import { parseCollectionName } from "@/lib/book-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { createCollection } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const { name } = await request.json() as { name?: unknown };
    return NextResponse.json(await createCollection(parseCollectionName(name)), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la carpeta";
    return NextResponse.json({ error: message }, { status: message.includes("carpeta") ? 400 : 500 });
  }
}