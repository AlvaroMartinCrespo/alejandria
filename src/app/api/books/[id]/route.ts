import { NextResponse } from "next/server";
import {
  APPWRITE_BOOKS_COLLECTION_ID,
  APPWRITE_DATABASE_ID,
  getDatabases,
} from "@/lib/appwrite";
import { normalizeBook } from "@/lib/book-utils";
import { parseBookChanges } from "@/lib/book-validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const changes = parseBookChanges(await request.json());
    const document = await getDatabases().updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_BOOKS_COLLECTION_ID,
      id,
      changes,
    );
    return NextResponse.json(normalizeBook(document as never));
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
    await getDatabases().deleteDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_BOOKS_COLLECTION_ID,
      id,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}