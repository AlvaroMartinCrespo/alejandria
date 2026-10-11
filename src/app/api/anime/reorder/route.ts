import { NextResponse } from "next/server";
import { hasEditorSession } from "@/lib/editor-auth";
import { reorderAnime } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const body = await request.json() as { moves?: unknown };
    if (!Array.isArray(body.moves) || body.moves.length > 5000 || body.moves.some((move) =>
      typeof move !== "object" || move === null ||
      typeof (move as Record<string, unknown>).id !== "string" ||
      !Number.isInteger((move as Record<string, unknown>).order) ||
      Number((move as Record<string, unknown>).order) < 0,
    )) {
      return NextResponse.json({ error: "Movimientos no válidos" }, { status: 400 });
    }
    await reorderAnime(body.moves as Array<{ id: string; order: number }>);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Movimientos no válidos" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "No se pudo reordenar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
