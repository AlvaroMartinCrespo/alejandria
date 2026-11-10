import { NextResponse } from "next/server";
import { hasEditorSession } from "@/lib/editor-auth";
import { DEFAULT_TIMEZONE, addDays, todayInZone } from "@/lib/reading-activity";
import { addReadingMarks, removeReadingMarks } from "@/lib/supabase";

export const runtime = "nodejs";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400;

function days(value: unknown, limit: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_DAYS) throw new Error("Lista de días no válida");
  return Array.from(new Set(value.map((day) => {
    if (typeof day !== "string" || !DAY_PATTERN.test(day) || Number.isNaN(Date.parse(day)) || day > limit) {
      throw new Error("Día no válido");
    }
    return day;
  })));
}

/** Marca (`add`) o desmarca (`remove`) días como «he leído», sin libro asociado. */
export async function POST(request: Request) {
  if (!(await hasEditorSession())) return NextResponse.json({ error: "Edición bloqueada." }, { status: 401 });
  let add: string[];
  let remove: string[];
  try {
    const body = (await request.json()) as { add?: unknown; remove?: unknown };
    // Un día de margen por si el reloj del navegador va por delante de la zona del servidor.
    const limit = addDays(todayInZone(process.env.ALEJANDRIA_TIMEZONE || DEFAULT_TIMEZONE), 1);
    add = days(body.add, limit);
    remove = days(body.remove, limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Petición no válida";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await addReadingMarks(add);
    await removeReadingMarks(remove);
    return NextResponse.json({ added: add.length, removed: remove.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron guardar los días";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
