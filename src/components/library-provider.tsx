"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";
import { googleResultToBook, normalizeBook } from "@/lib/book-utils";
import type { Book, BookStatus, GoogleBookResult } from "@/types/book";

const STORAGE_KEY = "alejandria-v1";
const LEGACY_STORAGE_KEY = "mi-biblioteca-v1";

type BookChanges = Partial<Omit<Book, "$id" | "googleBooksId" | "addedAt">>;

interface LibraryContextValue {
  books: Book[];
  loading: boolean;
  storageMode: "appwrite" | "local";
  notice: { type: "success" | "error"; message: string } | null;
  clearNotice: () => void;
  addBook: (result: GoogleBookResult) => Promise<Book>;
  updateBook: (id: string, changes: BookChanges) => Promise<void>;
  setStatus: (id: string, status: BookStatus) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  reorderToRead: (sourceId: string, targetId: string) => Promise<void>;
  restoreBackup: (value: unknown) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<"appwrite" | "local">("local");
  const [notice, setNotice] = useState<LibraryContextValue["notice"]>(null);

  function showNotice(type: "success" | "error", message: string) {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3500);
  }

  const loadLibrary = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/books", { cache: "no-store" });
      if (!response.ok) throw new Error("Appwrite no está configurado");
      const data = (await response.json()) as { books: Book[] };
      startTransition(() => {
        setBooks(data.books.map(normalizeBook));
        setStorageMode("appwrite");
        setLoading(false);
      });
    } catch {
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      let localBooks: Book[] = [];
      if (stored) {
        try {
          localBooks = (JSON.parse(stored) as Book[]).map(normalizeBook);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
          showNotice("error", "La copia local estaba dañada y se ha reiniciado.");
        }
      }
      startTransition(() => {
        setBooks(localBooks);
        setStorageMode("local");
        setLoading(false);
      });
      if (stored) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  });

  useEffect(() => {
    void loadLibrary();
  }, []);

  useEffect(() => {
    if (!loading && storageMode === "local") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
  }, [books, loading, storageMode]);

  async function addBook(result: GoogleBookResult) {
    if (books.some((book) => book.googleBooksId === result.googleBooksId)) {
      throw new Error("Este libro ya está en tu biblioteca.");
    }

    if (storageMode === "appwrite") {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!response.ok) throw new Error("No se pudo guardar el libro.");
      const book = normalizeBook((await response.json()) as Book);
      setBooks((current) => [...current, book]);
      showNotice("success", "Libro añadido a Quiero leer.");
      return book;
    }

    const book = googleResultToBook(result, crypto.randomUUID());
    setBooks((current) => [...current, book]);
    showNotice("success", "Libro añadido a Quiero leer.");
    return book;
  }

  async function updateBook(id: string, changes: BookChanges) {
    const previous = books;
    setBooks((current) =>
      current.map((book) => (book.$id === id ? { ...book, ...changes } : book)),
    );
    if (storageMode === "appwrite") {
      const response = await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) {
        setBooks(previous);
        showNotice("error", "No se pudo guardar el cambio. Se restauró el valor anterior.");
        throw new Error("No se pudo actualizar el libro.");
      }
    }
  }

  async function setStatus(id: string, status: BookStatus) {
    const changes: BookChanges = {
      status,
      finishedYear: status === "read" ? new Date().getFullYear() : null,
      order: status === "to_read" ? Date.now() : null,
    };

    await updateBook(id, changes);
  }

  async function toggleFavorite(id: string) {
    const book = books.find((item) => item.$id === id);
    if (!book) return;
    await updateBook(id, { favorite: !book.favorite });
  }

  async function removeBook(id: string) {
    const previous = books;
    setBooks((current) => current.filter((book) => book.$id !== id));
    if (storageMode === "appwrite") {
      const response = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setBooks(previous);
        showNotice("error", "No se pudo eliminar el libro.");
        throw new Error("No se pudo eliminar el libro.");
      }
    }
  }

  async function reorderToRead(sourceId: string, targetId: string) {
    const list = books
      .filter((book) => book.status === "to_read")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const from = list.findIndex((book) => book.$id === sourceId);
    const to = list.findIndex((book) => book.$id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    await Promise.all(list.map((book, index) => updateBook(book.$id, { order: index })));
  }

  async function restoreBackup(value: unknown) {
    if (!Array.isArray(value)) throw new Error("El archivo no contiene una biblioteca válida.");
    const imported = value
      .filter((item): item is Partial<Book> & { title: string } =>
        typeof item === "object" && item !== null && typeof item.title === "string",
      )
      .map((item) => normalizeBook({ ...item, $id: item.$id || crypto.randomUUID() }));
    if (!imported.length) throw new Error("No se encontraron libros válidos en el archivo.");

    if (storageMode === "local") {
      setBooks((current) => {
        const merged = new Map(
          current.map((book) => [book.googleBooksId || book.$id, book]),
        );
        imported.forEach((book) => merged.set(book.googleBooksId || book.$id, book));
        return Array.from(merged.values());
      });
      showNotice("success", `${imported.length} libros restaurados.`);
      return;
    }

    try {
      for (const incoming of imported) {
        const existing = books.find(
          (book) =>
            (incoming.googleBooksId && book.googleBooksId === incoming.googleBooksId) ||
            book.$id === incoming.$id,
        );
        const changes: BookChanges = {
          title: incoming.title,
          authors: incoming.authors,
          coverUrl: incoming.coverUrl,
          publishedYear: incoming.publishedYear,
          pageCount: incoming.pageCount,
          synopsis: incoming.synopsis,
          status: incoming.status,
          favorite: incoming.favorite,
          order: incoming.order,
          rating: incoming.rating,
          finishedYear: incoming.finishedYear,
          progress: incoming.progress,
          notes: incoming.notes,
        };

        if (existing) {
          const response = await fetch(`/api/books/${existing.$id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
          });
          if (!response.ok) throw new Error();
        } else {
          const createdResponse = await fetch("/api/books", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(incoming),
          });
          if (!createdResponse.ok) throw new Error();
          const created = normalizeBook((await createdResponse.json()) as Book);
          const updateResponse = await fetch(`/api/books/${created.$id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(changes),
          });
          if (!updateResponse.ok) throw new Error();
        }
      }
      const refreshed = await fetch("/api/books", { cache: "no-store" });
      const data = (await refreshed.json()) as { books: Book[] };
      setBooks(data.books.map(normalizeBook));
      showNotice("success", `${imported.length} libros restaurados en Appwrite.`);
    } catch {
      showNotice("error", "La restauración quedó incompleta. Revisa Appwrite e inténtalo de nuevo.");
      throw new Error("No se pudo completar la restauración.");
    }
  }

  return (
    <LibraryContext.Provider
      value={{
        books,
        loading,
        storageMode,
        notice,
        clearNotice: () => setNotice(null),
        addBook,
        updateBook,
        setStatus,
        toggleFavorite,
        removeBook,
        reorderToRead,
        restoreBackup,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary debe usarse dentro de LibraryProvider");
  return value;
}