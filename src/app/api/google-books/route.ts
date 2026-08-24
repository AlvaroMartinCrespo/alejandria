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

interface GoogleErrorResponse {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
}

function googleBooksError(status: number, data: GoogleErrorResponse, hasApiKey: boolean) {
  const reason = data.error?.errors?.[0]?.reason;

  if (status === 503 || reason === "backendFailed") {
    return "Google Books está temporalmente fuera de servicio. Espera unos segundos y vuelve a buscar.";
  }
  if (status === 429 || reason === "rateLimitExceeded" || reason === "dailyLimitExceeded") {
    return hasApiKey
      ? "Se agotó la cuota de Google Books para esta clave. Revisa las cuotas en Google Cloud."
      : "Se agotó la cuota pública de Google Books. Configura GOOGLE_BOOKS_API_KEY para disponer de una cuota propia.";
  }
  if (status === 403) {
    return "Google Books rechazó la clave. Comprueba que Books API esté habilitada y que la clave no tenga restricciones incompatibles con Vercel.";
  }
  if (status === 400) {
    return "Google Books rechazó la búsqueda o la clave configurada no es válida.";
  }
  return data.error?.message || "Google Books no respondió correctamente.";
}

function responseStatus(upstreamStatus: number) {
  if ([400, 403, 429, 503].includes(upstreamStatus)) return upstreamStatus;
  return 502;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchGoogleBooks(url: string) {
  const delays = [0, 250, 750];

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await wait(delays[attempt]);
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) return { response, error: null };

    const error = (await response.json().catch(() => ({}))) as GoogleErrorResponse;
    const reason = error.error?.errors?.[0]?.reason;
    const transient = response.status === 503 || reason === "backendFailed";
    if (!transient || attempt === delays.length - 1) return { response, error };
  }

  throw new Error("Google Books no respondió.");
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ books: [] });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: "La búsqueda es demasiado larga" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  const params = new URLSearchParams({ q: query, maxResults: "12", printType: "books" });
  if (apiKey) params.set("key", apiKey);

  try {
    const { response, error } = await fetchGoogleBooks(
      `https://www.googleapis.com/books/v1/volumes?${params}`,
    );
    if (!response.ok) {
      const data = error ?? {};
      return NextResponse.json(
        {
          error: googleBooksError(response.status, data, Boolean(apiKey)),
          upstreamStatus: response.status,
          reason: data.error?.errors?.[0]?.reason ?? null,
        },
        { status: responseStatus(response.status) },
      );
    }
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
    return NextResponse.json(
      { books },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo buscar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}