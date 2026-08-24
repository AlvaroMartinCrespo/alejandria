/**
 * Estados posibles de un libro dentro de la biblioteca.
 * Un libro solo puede estar en uno de estos estados a la vez.
 */
export type BookStatus = "to_read" | "reading" | "read" | "favorite";

/**
 * Modelo de un libro, tal y como se guarda en la colección `books` de Appwrite.
 * Coincide con la tabla de la Fase 1 del roadmap.
 */
export interface Book {
  $id: string; // ID del documento en Appwrite
  googleBooksId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string;
  status: BookStatus;
  order: number | null; // posición manual, solo relevante en status "to_read"
  rating: number | null; // 0-5
  finishedYear: number | null; // año en que se terminó de leer
  addedAt: string; // ISO date
  currentPage?: number | null; // progreso opcional mientras se está leyendo
  notes?: string; // notas personales opcionales
}

/**
 * Forma de un resultado de búsqueda de la API de Google Books,
 * ya normalizado a los campos que nos interesan.
 */
export interface GoogleBookResult {
  googleBooksId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string;
}
