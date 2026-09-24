import { NextResponse } from "next/server";
import { parseCollectionName } from "@/lib/book-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { deleteCollection, updateCollection } from "@/lib/supabase";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const input = await request.json() as { name?: unknown; order?: unknown };
    const changes: { name?: string; order?: number } = {};
    if (input.name !== undefined) changes.name = parseCollectionName(input.name);
    if (input.order !== undefined) {
      const order = input.order;
      if (typeof order !== "number" || !Number.isInteger(order) || order < 0) {
        throw new Error("Orden de carpeta no válido");
      }
      changes.order = order;
    }
    const { id } = await params;
    return NextResponse.json(await updateCollection(id, changes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la carpeta";
    return NextResponse.json({ error: message }, { status: message.includes("válido") ? 400 : 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const { id } = await params;
    await deleteCollection(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar la carpeta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}