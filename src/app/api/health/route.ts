import { NextResponse } from "next/server";
import { checkSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!configured) {
    return NextResponse.json(
      {
        status: "degraded",
        supabase: "not_configured",
        googleBooksKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
      },
      { status: 503 },
    );
  }

  try {
    await checkSupabase();
    return NextResponse.json({
      status: "ok",
      supabase: "connected",
      googleBooksKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        supabase: "unreachable",
        googleBooksKey: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
      },
      { status: 503 },
    );
  }
}