import { NextResponse } from "next/server";
import { reorderBooks } from "@/lib/supabase";
import { hasEditorSession } from "@/lib/editor-auth";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const body = await request.json() as { moves?: unknown };
    if (!Array.isArray(body.moves) || body.moves.some((move) =>
      typeof move !== "object" || move === null ||
      typeof (move as Record<string, unknown>).id !== "string" ||
      !Number.isInteger((move as Record<string, unknown>).order) ||
      !((move as Record<string, unknown>).collectionId === null || typeof (move as Record<string, unknown>).collectionId === "string"),
    )) {
      return NextResponse.json({ error: "Movimientos no válidos" }, { status: 400 });
    }
    await reorderBooks(body.moves as Array<{ id: string; collectionId: string | null; order: number }>);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo reordenar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}