import Image from "next/image";
import { coverFallback } from "@/lib/book-utils";

const OPTIMIZED_HOSTS = new Set(["cdn.myanimelist.net", "s4.anilist.co"]);

function isOptimizedHost(url: string) {
  try {
    return OPTIMIZED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Igual que BookCover (mismo CSS `.book-cover`), pero con `unoptimized` si el host
 * no está en `images.remotePatterns`, para que una URL manual no rompa `next/image`.
 */
export function AnimeCover({
  title,
  url,
  priority = false,
}: {
  title: string;
  url: string | null;
  priority?: boolean;
}) {
  return (
    <div className="book-cover" aria-label={`Portada de ${title}`}>
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes="(max-width: 700px) 72px, 96px"
          priority={priority}
          unoptimized={!isOptimizedHost(url)}
        />
      ) : (
        <span>{coverFallback(title)}</span>
      )}
    </div>
  );
}
