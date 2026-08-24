import { NextResponse } from "next/server";
import type { GoogleBookResult } from "@/types/book";

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ books: [] });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: "La búsqueda es demasiado larga" }, { status: 400 });
  }

  const params = new URLSearchParams({ q: query, maxResults: "12", printType: "books" });
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("Google Books no respondió correctamente");
    const data = (await response.json()) as { items?: GoogleVolume[] };
    const books: GoogleBookResult[] = (data.items ?? []).map(({ id, volumeInfo = {} }) => ({
      googleBooksId: id,
      title: volumeInfo.title ?? "Sin título",
      authors: volumeInfo.authors ?? ["Autor desconocido"],
      coverUrl:
        (volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail ?? null)?.replace(
          "http://",
          "https://",
        ) ?? null,
      publishedYear: Number(volumeInfo.publishedDate?.slice(0, 4)) || null,
      pageCount: volumeInfo.pageCount ?? null,
      synopsis: volumeInfo.description ?? "Sin sinopsis disponible.",
    }));
    return NextResponse.json({ books });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo buscar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}