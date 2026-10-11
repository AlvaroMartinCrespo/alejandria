import { NextResponse } from "next/server";
import { parseAnimeInput } from "@/lib/anime-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { AnimeDuplicateError, createAnime, listAnime } from "@/lib/supabase";

function unavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Supabase no disponible";
  const missingTable = /anime|schema cache|relation/i.test(message);
  return NextResponse.json(
    { error: missingTable ? "Falta aplicar la migración de anime en Supabase" : message },
    { status: 503 },
  );
}

export async function GET() {
  try {
    return NextResponse.json({ anime: await listAnime() });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  try {
    const input = parseAnimeInput(await request.json());
    return NextResponse.json(await createAnime(input), { status: 201 });
  } catch (error) {
    if (error instanceof AnimeDuplicateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof SyntaxError || (error instanceof Error && (error.message.includes("válid") || error.message.includes("vacío")))) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Anime no válido" }, { status: 400 });
    }
    return unavailable(error);
  }
}
