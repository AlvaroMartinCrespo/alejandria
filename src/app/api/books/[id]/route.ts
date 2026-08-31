import { NextResponse } from "next/server";
import { parseBookChanges } from "@/lib/book-validation";
import { deleteBook, updateBook } from "@/lib/supabase";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const changes = parseBookChanges(await request.json());
    return NextResponse.json(await updateBook(id, changes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar";
    if (error instanceof SyntaxError || message.includes("válid") || message.includes("vacío")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await deleteBook(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}