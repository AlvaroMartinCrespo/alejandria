"use client";

import Image from "next/image";
import { coverFallback } from "@/lib/book-utils";
import { extractCoverTone, type CoverTone } from "@/lib/cover-tone";

export function BookCover({
  title,
  url,
  priority = false,
  sizes = "(max-width: 700px) 72px, 96px",
  onTone,
}: {
  title: string;
  url: string | null;
  priority?: boolean;
  /** Anchura real de la portada: las grandes (detalle, «Leyendo ahora») deben pedir más píxeles. */
  sizes?: string;
  /** Si se pasa, recibe el color dominante en cuanto la imagen carga (ver `useCoverTone`). */
  onTone?: (tone: CoverTone | null) => void;
}) {
  return (
    <div className="book-cover" aria-label={`Portada de ${title}`}>
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          onLoad={onTone ? (event) => onTone(extractCoverTone(event.currentTarget)) : undefined}
        />
      ) : (
        <span>{coverFallback(title)}</span>
      )}
    </div>
  );
}
