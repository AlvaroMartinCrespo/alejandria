import { NextResponse } from "next/server";
import { parseBookChanges } from "@/lib/book-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { DEFAULT_TIMEZONE, describeChange, todayInZone } from "@/lib/reading-activity";
import { deleteBook, getBookState, logReadingActivity, updateBook } from "@/lib/supabase";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const { id } = await params;
    const changes = parseBookChanges(await request.json());
    // Estado anterior, para saber qué avanzó (si falla, el guardado sigue adelante).
    const previous = await getBookState(id).catch(() => null);
    const book = await updateBook(id, changes);
    if (previous) {
      try {
        const change = describeChange(previous, changes);
        if (change) {
          const timeZone = process.env.ALEJANDRIA_TIMEZONE || DEFAULT_TIMEZONE;
          await logReadingActivity({ bookId: id, day: todayInZone(timeZone), ...change });
        }
      } catch (error) {
        // El historial es secundario: nunca debe impedir guardar el libro.
        console.error("No se pudo registrar la actividad de lectura:", error);
      }
    }
    return NextResponse.json(book);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar";
    if (error instanceof SyntaxError || message.includes("válid") || message.includes("vacío")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const { id } = await params;
    await deleteBook(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}