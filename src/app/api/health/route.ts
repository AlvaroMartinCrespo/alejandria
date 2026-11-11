import { NextResponse } from "next/server";
import { checkAnimeTable, checkReadingLogTable, checkSupabase, getLastSuccessfulBackup } from "@/lib/supabase";

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
    const readingLog = await checkReadingLogTable().then(() => "ok" as const, () => "missing" as const);
    // Informativo: fecha del último backup enviado correctamente (null si nunca; "missing" si falta la tabla).
    const lastBackup = await getLastSuccessfulBackup().then((backup) => backup?.sentAt ?? null, () => "missing" as const);
    return NextResponse.json({
      status: "ok",
      supabase: "connected",
      anime,
      readingLog,
      lastBackup,
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