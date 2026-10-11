import { NextResponse } from "next/server";
import { parseAnimeBackup } from "@/lib/anime-validation";
import { hasEditorSession } from "@/lib/editor-auth";
import { importAnime } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  let anime;
  try {
    anime = parseAnimeBackup(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "La copia no es válida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const imported = anime.length ? await importAnime(anime) : 0;
    return NextResponse.json({ imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar la copia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
