import { NextResponse } from "next/server";
import { parseAnimeChanges } from "@/lib/anime-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { deleteAnime, updateAnime } from "@/lib/supabase";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const { id } = await params;
    const changes = parseAnimeChanges(await request.json());
    if (!Object.keys(changes).length) {
      return NextResponse.json({ error: "Cambios no válidos" }, { status: 400 });
    }
    return NextResponse.json(await updateAnime(id, changes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar";
    if (error instanceof SyntaxError || message.includes("válid") || message.includes("vacío")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "El anime no existe") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const { id } = await params;
    await deleteAnime(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
