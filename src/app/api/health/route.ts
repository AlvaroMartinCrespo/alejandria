import { NextResponse } from "next/server";
import { checkAnimeTable, checkSupabase } from "@/lib/supabase";

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
    // Informativo: la tabla de anime no afecta al estado global.
    const anime = await checkAnimeTable().then(() => "ok" as const, () => "missing" as const);
    return NextResponse.json({
      status: "ok",
      supabase: "connected",
      anime,
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