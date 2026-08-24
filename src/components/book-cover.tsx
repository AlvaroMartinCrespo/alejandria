import Image from "next/image";
import { coverFallback } from "@/lib/book-utils";

export function BookCover({
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
        <Image src={url} alt="" fill sizes="(max-width: 700px) 72px, 96px" priority={priority} />
      ) : (
        <span>{coverFallback(title)}</span>
      )}
    </div>
  );
}