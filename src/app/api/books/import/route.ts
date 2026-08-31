import { NextResponse } from "next/server";
import { parseBookBackup } from "@/lib/book-validation";
import { importBooks } from "@/lib/supabase";

export async function POST(request: Request) {
  let books;
  try {
    books = parseBookBackup(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "La copia no es válida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const imported = await importBooks(books);
    return NextResponse.json({ imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar la copia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}