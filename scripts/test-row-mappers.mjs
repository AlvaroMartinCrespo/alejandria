// Pruebas del mapeo fila → objeto (compartido entre servidor y navegador).
// Uso: node scripts/test-row-mappers.mjs
import assert from "node:assert/strict";

const { fromBookRow, fromCollectionRow, fromAnimeRow } = await import("../src/lib/row-mappers.ts");

let n = 0;
function test(name, fn) { fn(); n += 1; console.log(`ok  ${name}`); }

const bookRow = {
  id: "b1", google_books_id: "g1", title: "Dune", authors: ["Frank Herbert"], cover_url: "https://x/y.jpg",
  published_year: 1965, page_count: 612, synopsis: "…", status: "reading", favorite: true, sort_order: 3,
  collection_id: "c1", rating: 9, finished_year: null, finished_month: null, added_at: "2026-01-01T00:00:00Z",
  progress: 42, notes: "n", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-01T00:00:00Z",
};

test("libro: snake_case → camelCase con updatedAt", () => {
  const book = fromBookRow(bookRow);
  assert.equal(book.$id, "b1");
  assert.equal(book.googleBooksId, "g1");
  assert.equal(book.coverUrl, "https://x/y.jpg");
  assert.equal(book.order, 3);
  assert.equal(book.collectionId, "c1");
  assert.equal(book.progress, 42);
  assert.equal(book.createdAt, "2026-01-01T00:00:00Z");
  assert.equal(book.updatedAt, "2026-02-01T00:00:00Z");
});

test("libro: sin marcas de tiempo no añade las claves (como el evento DELETE o filas parciales)", () => {
  const { created_at, updated_at, ...rest } = bookRow;
  const book = fromBookRow(rest);
  assert.equal("createdAt" in book, false);
  assert.equal("updatedAt" in book, false);
});

test("carpeta", () => {
  assert.deepEqual(fromCollectionRow({ id: "c1", name: "Sci-fi", sort_order: 2, created_at: "2026-01-01T00:00:00Z" }), {
    $id: "c1", name: "Sci-fi", order: 2, createdAt: "2026-01-01T00:00:00Z",
  });
  assert.deepEqual(fromCollectionRow({ id: "c2", name: "X", sort_order: 0 }), { $id: "c2", name: "X", order: 0 });
});

test("anime", () => {
  const anime = fromAnimeRow({
    id: "a1", source_id: "jikan:1", title: "Cowboy Bebop", title_japanese: "カウボーイビバップ", cover_url: null,
    release_year: 1998, media_format: "TV", genres: ["Sci-Fi"], synopsis: "", status: "watching", favorite: false,
    rating: null, current_season: 1, current_episode: 5, total_episodes: 26, total_seasons: 1, finished_year: null,
    finished_month: null, last_watched_at: "2026-03-01T00:00:00Z", sort_order: 0, notes: "", added_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  });
  assert.equal(anime.$id, "a1");
  assert.equal(anime.currentEpisode, 5);
  assert.equal(anime.totalEpisodes, 26);
  assert.equal(anime.lastWatchedAt, "2026-03-01T00:00:00Z");
  assert.equal(anime.updatedAt, "2026-03-01T00:00:00Z");
  assert.equal("createdAt" in anime, false);
});

console.log(`\n${n} pruebas correctas`);
