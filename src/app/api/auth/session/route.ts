import { NextResponse } from "next/server";
import { createEditorSession, editorCookie, hasEditorSession, isEditorProtectionConfigured, verifyEditorPassword } from "@/lib/editor-auth";

export async function GET() {
  return NextResponse.json({ editing: await hasEditorSession(), configured: isEditorProtectionConfigured() });
}

export async function POST(request: Request) {
  if (!isEditorProtectionConfigured()) {
    return NextResponse.json({ error: "La protección de edición no está configurada." }, { status: 503 });
  }
  try {
    const { password } = await request.json() as { password?: unknown };
    if (typeof password !== "string" || password.length > 512 || !verifyEditorPassword(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
    }
    const session = createEditorSession();
    const response = NextResponse.json({ editing: true });
    response.cookies.set(editorCookie.name, session.value, { ...editorCookie.options, maxAge: session.maxAge });
    return response;
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }
}

export function DELETE() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(editorCookie.name, "", { ...editorCookie.options, maxAge: 0 });
  return response;
}