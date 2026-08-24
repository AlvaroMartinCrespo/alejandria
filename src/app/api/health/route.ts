import { Query } from "node-appwrite";
import { NextResponse } from "next/server";
import {
  APPWRITE_BOOKS_COLLECTION_ID,
  APPWRITE_DATABASE_ID,
  getDatabases,
} from "@/lib/appwrite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(
    process.env.APPWRITE_ENDPOINT &&
    process.env.APPWRITE_PROJECT_ID &&
    process.env.APPWRITE_API_KEY &&
    APPWRITE_DATABASE_ID &&
    APPWRITE_BOOKS_COLLECTION_ID,
  );

  if (!configured) {
    return NextResponse.json(
      {
        status: "degraded",
        appwrite: "not_configured",
        googleBooksKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
      },
      { status: 503 },
    );
  }

  try {
    await getDatabases().listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_BOOKS_COLLECTION_ID,
      [Query.limit(1)],
    );
    return NextResponse.json({
      status: "ok",
      appwrite: "connected",
      googleBooksKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        appwrite: "unreachable",
        googleBooksKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
      },
      { status: 503 },
    );
  }
}