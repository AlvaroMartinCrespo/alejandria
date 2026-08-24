import { ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";
import {
  APPWRITE_BOOKS_COLLECTION_ID,
  APPWRITE_DATABASE_ID,
  getDatabases,
} from "@/lib/appwrite";
import { normalizeBook } from "@/lib/book-utils";
import { parseGoogleBook } from "@/lib/book-validation";

function unavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Appwrite no disponible";
  return NextResponse.json({ error: message }, { status: 503 });
}

export async function GET() {
  try {
    const result = await getDatabases().listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_BOOKS_COLLECTION_ID,
      [Query.limit(500)],
    );
    return NextResponse.json({ books: result.documents.map((document) => normalizeBook(document as never)) });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = parseGoogleBook(await request.json());
    const document = await getDatabases().createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_BOOKS_COLLECTION_ID,
      ID.unique(),
      {
        ...result,
        status: "to_read",
        order: Date.now(),
        rating: null,
        finishedYear: null,
        addedAt: new Date().toISOString(),
        currentPage: 0,
        notes: "",
      },
    );
    return NextResponse.json(normalizeBook(document as never), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("válid"))) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Libro no válido" }, { status: 400 });
    }
    return unavailable(error);
  }
}