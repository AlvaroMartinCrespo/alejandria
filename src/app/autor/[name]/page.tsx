"use client";

import { useParams, useRouter } from "next/navigation";
import { BookRow } from "@/components/book-row";
import { useLibrary } from "@/components/library-provider";
import { LibrarySkeleton } from "@/components/library-skeleton";
import { booksByAuthor, plural } from "@/lib/recap";

/** Los parámetros dinámicos pueden llegar codificados (%C3%A9…); se normalizan sin romper nombres raros. */
function decodeParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Todos los libros leídos de un autor (se llega desde Estadísticas → Autores). */
export default function AuthorPage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const { books, loading } = useLibrary();
  const author = decodeParam(params.name);

  if (loading) return <LibrarySkeleton rows={3} />;

  const list = booksByAuthor(books.filter((book) => book.status === "read"), author)
    .sort((a, b) => {
      if ((b.finishedYear ?? 0) !== (a.finishedYear ?? 0)) return (b.finishedYear ?? 0) - (a.finishedYear ?? 0);
      if ((b.finishedMonth ?? 0) !== (a.finishedMonth ?? 0)) return (b.finishedMonth ?? 0) - (a.finishedMonth ?? 0);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

  return (
    <>
      <button className="back-button" onClick={() => router.back()}>← Volver</button>
      <section className="page-heading archive-heading">
        <div><p className="eyebrow">Autor</p><h1>{author}</h1></div>
        <p className="heading-note">{plural(list.length, "libro leído", "libros leídos")}.</p>
      </section>
      {list.length
        ? <div className="author-books">{list.map((book) => <BookRow key={book.$id} book={book} hideStatus />)}</div>
        : <div className="big-empty"><strong>No hay libros leídos de este autor.</strong><p>Cuando termines alguno, aparecerá aquí.</p></div>}
    </>
  );
}
