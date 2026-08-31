/** Estados mutuamente excluyentes dentro del recorrido de lectura. */
export type BookStatus = "to_read" | "reading" | "read";

/**
 * Modelo de un libro, tal y como lo utiliza la aplicación.
 * Coincide con la tabla de la Fase 1 del roadmap.
 */
export interface Book {
  $id: string; // ID estable, compatible con copias históricas de Appwrite
  googleBooksId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string;
  status: BookStatus;
  favorite: boolean;
  order: number | null; // posición manual, solo relevante en status "to_read"
  rating: number | null; // 0-5
  finishedYear: number | null; // año en que se terminó de leer
  addedAt: string; // ISO date
  progress: number; // porcentaje leído, de 0 a 100
  notes?: string; // notas personales opcionales
}

export interface LibraryBackup {
  format: "alejandria-library-backup";
  version: 1;
  exportedAt: string;
  bookCount: number;
  books: Book[];
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
