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
import { parseBookBackup } from "@/lib/book-validation";
import type { Book, BookStatus, Collection, GoogleBookResult } from "@/types/book";

const STORAGE_KEY = "alejandria-v1";
const COLLECTIONS_STORAGE_KEY = "alejandria-collections-v1";
const LEGACY_STORAGE_KEY = "mi-biblioteca-v1";

type BookChanges = Partial<Omit<Book, "$id" | "googleBooksId" | "addedAt">>;

interface LibraryContextValue {
  books: Book[];
  collections: Collection[];
  loading: boolean;
  editing: boolean;
  editorConfigured: boolean;
  storageMode: "supabase" | "local";
  notice: { type: "success" | "error"; message: string } | null;
  clearNotice: () => void;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  addBook: (result: GoogleBookResult) => Promise<Book>;
  updateBook: (id: string, changes: BookChanges) => Promise<void>;
  setStatus: (id: string, status: BookStatus) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  moveCollection: (id: string, direction: "up" | "down") => Promise<void>;
  moveBook: (bookId: string, collectionId: string | null, index: number) => Promise<void>;
  restoreBackup: (value: unknown) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editorConfigured, setEditorConfigured] = useState(false);
  const [storageMode, setStorageMode] = useState<"supabase" | "local">("local");
  const [notice, setNotice] = useState<LibraryContextValue["notice"]>(null);

  function showNotice(type: "success" | "error", message: string) {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 3500);
  }

  const loadLibrary = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/books", { cache: "no-store" });
      if (!response.ok) throw new Error("Supabase no está configurado");
      const data = (await response.json()) as { books: Book[]; collections: Collection[] };
      startTransition(() => {
        setBooks(data.books.map(normalizeBook));
        setCollections(data.collections);
        setStorageMode("supabase");
        setLoading(false);
      });
    } catch {
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      let localBooks: Book[] = [];
      let localCollections: Collection[] = [];
      if (stored) {
        try {
          localBooks = (JSON.parse(stored) as Book[]).map(normalizeBook);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
          showNotice("error", "La copia local estaba dañada y se ha reiniciado.");
        }
      }
      const storedCollections = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
      if (storedCollections) {
        try {
          localCollections = JSON.parse(storedCollections) as Collection[];
        } catch {
          window.localStorage.removeItem(COLLECTIONS_STORAGE_KEY);
          showNotice("error", "Las carpetas locales estaban dañadas y se han reiniciado.");
        }
      }
      startTransition(() => {
        setBooks(localBooks);
        setCollections(localCollections);
        setStorageMode("local");
        setLoading(false);
      });
      if (stored) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  });

  const loadEditorSession = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) return;
      const session = await response.json() as { editing: boolean; configured: boolean };
      setEditing(session.editing);
      setEditorConfigured(session.configured);
    } catch {
      setEditing(false);
    }
  });

  useEffect(() => {
    void loadLibrary();
    void loadEditorSession();
  }, []);

  useEffect(() => {
    if (!loading && storageMode === "local") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
  }, [books, loading, storageMode]);

  useEffect(() => {
    if (!loading && storageMode === "local") {
      window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
    }
  }, [collections, loading, storageMode]);

  async function addBook(result: GoogleBookResult) {
    requireEditing();
    if (books.some((book) => book.googleBooksId === result.googleBooksId)) {
      throw new Error("Este libro ya está en tu biblioteca.");
    }

    if (storageMode === "supabase") {
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
    requireEditing();
    const previous = books;
    setBooks((current) =>
      current.map((book) => (book.$id === id ? { ...book, ...changes } : book)),
    );
    if (storageMode === "supabase") {
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
      collectionId: null,
    };

    await updateBook(id, changes);
  }

  async function toggleFavorite(id: string) {
    const book = books.find((item) => item.$id === id);
    if (!book) return;
    await updateBook(id, { favorite: !book.favorite });
  }

  async function removeBook(id: string) {
    requireEditing();
    const previous = books;
    setBooks((current) => current.filter((book) => book.$id !== id));
    if (storageMode === "supabase") {
      const response = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setBooks(previous);
        showNotice("error", "No se pudo eliminar el libro.");
        throw new Error("No se pudo eliminar el libro.");
      }
    }
  }

  async function createCollection(name: string) {
    requireEditing();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 60) throw new Error("El nombre debe tener entre 1 y 60 caracteres.");
    if (storageMode === "local") {
      setCollections((current) => [...current, { $id: crypto.randomUUID(), name: trimmedName, order: current.length }]);
      return;
    }
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    });
    if (!response.ok) throw new Error("No se pudo crear la carpeta.");
    const collection = (await response.json()) as Collection;
    setCollections((current) => [...current, collection]);
  }

  async function renameCollection(id: string, name: string) {
    requireEditing();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 60) throw new Error("El nombre debe tener entre 1 y 60 caracteres.");
    const previous = collections;
    setCollections((current) => current.map((collection) => collection.$id === id ? { ...collection, name: trimmedName } : collection));
    if (storageMode === "supabase") {
      const response = await fetch(`/api/collections/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: trimmedName }),
      });
      if (!response.ok) {
        setCollections(previous);
        showNotice("error", "No se pudo renombrar la carpeta.");
        throw new Error("No se pudo renombrar la carpeta.");
      }
    }
  }

  async function deleteCollection(id: string) {
    requireEditing();
    const previousBooks = books;
    const previousCollections = collections;
    setCollections((current) => current.filter((collection) => collection.$id !== id));
    setBooks((current) => current.map((book) => book.collectionId === id ? { ...book, collectionId: null } : book));
    if (storageMode === "supabase") {
      const response = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setBooks(previousBooks);
        setCollections(previousCollections);
        showNotice("error", "No se pudo borrar la carpeta.");
        throw new Error("No se pudo borrar la carpeta.");
      }
    }
  }

  async function moveCollection(id: string, direction: "up" | "down") {
    requireEditing();
    const sorted = [...collections].sort((left, right) => left.order - right.order);
    const from = sorted.findIndex((collection) => collection.$id === id);
    const to = from + (direction === "up" ? -1 : 1);
    if (from < 0 || to < 0 || to >= sorted.length) return;
    [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
    const reordered = sorted.map((collection, order) => ({ ...collection, order }));
    const previous = collections;
    setCollections(reordered);
    if (storageMode === "supabase") {
      const responses = await Promise.all(reordered.map((collection) => fetch(`/api/collections/${collection.$id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: collection.order }),
      })));
      if (responses.some((response) => !response.ok)) {
        setCollections(previous);
        showNotice("error", "No se pudo reordenar las carpetas.");
        throw new Error("No se pudo reordenar las carpetas.");
      }
    }
  }

  async function moveBook(bookId: string, collectionId: string | null, index: number) {
    requireEditing();
    const movedBook = books.find((book) => book.$id === bookId);
    if (!movedBook || movedBook.status !== "to_read") return;
    const sourceId = movedBook.collectionId;
    const source = books.filter((book) => book.status === "to_read" && book.collectionId === sourceId && book.$id !== bookId)
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    const destination = sourceId === collectionId
      ? source
      : books.filter((book) => book.status === "to_read" && book.collectionId === collectionId)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    destination.splice(Math.max(0, Math.min(index, destination.length)), 0, { ...movedBook, collectionId });
    const changes = new Map<string, { collectionId: string | null; order: number }>();
    if (sourceId !== collectionId) {
      source.forEach((book, order) => changes.set(book.$id, { collectionId: sourceId, order }));
    }
    destination.forEach((book, order) => changes.set(book.$id, { collectionId, order }));
    const previous = books;
    setBooks((current) => current.map((book) => {
      const change = changes.get(book.$id);
      return change ? { ...book, ...change } : book;
    }));
    if (storageMode === "supabase") {
      const response = await fetch("/api/books/reorder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves: Array.from(changes, ([id, change]) => ({ id, ...change })) }),
      });
      if (!response.ok) {
        setBooks(previous);
        showNotice("error", "No se pudo reordenar los libros.");
        throw new Error("No se pudo reordenar los libros.");
      }
    }
  }

  async function restoreBackup(value: unknown) {
    requireEditing();
    const imported = parseBookBackup(value);

    if (storageMode === "local") {
      setBooks((current) => {
        const merged = new Map(
          current.map((book) => [book.googleBooksId || book.$id, book]),
        );
        imported.books.forEach((book) => merged.set(book.googleBooksId || book.$id, book));
        return Array.from(merged.values());
      });
      setCollections((current) => {
        const merged = new Map(current.map((collection) => [collection.$id, collection]));
        imported.collections.forEach((collection) => merged.set(collection.$id, collection));
        return Array.from(merged.values());
      });
      showNotice("success", `${imported.books.length} libros restaurados.`);
      return;
    }

    try {
      const importedResponse = await fetch("/api/books/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "alejandria-library-backup", version: 2, books: imported.books, collections: imported.collections }),
      });
      if (!importedResponse.ok) throw new Error();
      const refreshed = await fetch("/api/books", { cache: "no-store" });
      const data = (await refreshed.json()) as { books: Book[]; collections: Collection[] };
      setBooks(data.books.map(normalizeBook));
      setCollections(data.collections);
      showNotice("success", `${imported.books.length} libros restaurados en Supabase.`);
    } catch {
      showNotice("error", "La restauración quedó incompleta. Revisa Supabase e inténtalo de nuevo.");
      throw new Error("No se pudo completar la restauración.");
    }
  }

  function requireEditing() {
    if (editing) return;
    showNotice("error", "La edición está bloqueada.");
    throw new Error("La edición está bloqueada.");
  }

  async function unlock(password: string) {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new Error(data?.error ?? "No se pudo desbloquear la edición.");
    setEditing(true);
  }

  async function lock() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setEditing(false);
  }

  return (
    <LibraryContext.Provider
      value={{
        books,
        collections,
        loading,
        editing,
        editorConfigured,
        storageMode,
        notice,
        clearNotice: () => setNotice(null),
        unlock,
        lock,
        addBook,
        updateBook,
        setStatus,
        toggleFavorite,
        removeBook,
        createCollection,
        renameCollection,
        deleteCollection,
        moveCollection,
        moveBook,
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