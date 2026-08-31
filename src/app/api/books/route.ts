import { NextResponse } from "next/server";
import { parseGoogleBook } from "@/lib/book-validation";
import { createBook, listBooks } from "@/lib/supabase";

function unavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Supabase no disponible";
  return NextResponse.json({ error: message }, { status: 503 });
}

export async function GET() {
  try {
    return NextResponse.json({ books: await listBooks() });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = parseGoogleBook(await request.json());
    return NextResponse.json(await createBook(result), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("válid"))) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Libro no válido" }, { status: 400 });
    }
    return unavailable(error);
  }
}