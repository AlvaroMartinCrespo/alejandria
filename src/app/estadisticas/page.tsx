"use client";

import Link from "next/link";
import { useLibrary } from "@/components/library-provider";

export default function StatisticsPage() {
  const { books, restoreBackup } = useLibrary();
  const completed = books.filter((book) => book.status === "read" || book.status === "favorite");
  const pages = completed.reduce((sum, book) => sum + (book.pageCount ?? 0), 0);
  const rated = completed.filter((book) => book.rating !== null);
  const average = rated.length ? rated.reduce((sum, book) => sum + (book.rating ?? 0), 0) / rated.length : 0;
  const authorCounts = completed.flatMap((book) => book.authors).reduce<Record<string, number>>((counts, author) => {
    counts[author] = (counts[author] ?? 0) + 1;
    return counts;
  }, {});
  const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];
  const years = Array.from(new Set(completed.map((book) => book.finishedYear).filter(Boolean) as number[])).sort((a, b) => a - b);
  const maxYearCount = Math.max(1, ...years.map((year) => completed.filter((book) => book.finishedYear === year).length));

  function exportJson() {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `alejandria-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      await restoreBackup(JSON.parse(await file.text()) as unknown);
    } catch (error) {
      if (error instanceof SyntaxError) window.alert("El archivo no contiene JSON válido.");
    }
  }

  return (
    <>
      <section className="page-heading stats-heading">
        <div><p className="eyebrow">La biblioteca en números</p><h1>Estadísticas</h1></div>
        <div className="export-actions">
          <button className="button secondary" onClick={exportJson}>↓ JSON</button>
          <label className="button secondary file-button">↑ Restaurar<input type="file" accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} /></label>
          <Link className="button secondary" href="/exportar">▤ PDF</Link>
        </div>
      </section>
      <section className="stat-grid">
        <article><span>Libros terminados</span><strong>{completed.length}</strong><small>en total</small></article>
        <article><span>Páginas leídas</span><strong>{pages.toLocaleString("es")}</strong><small>aproximadamente</small></article>
        <article><span>Puntuación media</span><strong>{average ? average.toFixed(1) : "—"}</strong><small>sobre 5</small></article>
        <article><span>Autor más leído</span><strong className="author-stat">{topAuthor?.[0] ?? "—"}</strong><small>{topAuthor ? `${topAuthor[1]} libros` : "sin datos"}</small></article>
      </section>
      <section className="year-chart">
        <div className="section-title"><div><p className="eyebrow">Ritmo de lectura</p><h2>Libros por año</h2></div></div>
        {years.length ? <div className="bars">
          {years.map((year) => {
            const count = completed.filter((book) => book.finishedYear === year).length;
            return <div className="bar-column" key={year}><strong>{count}</strong><div><i style={{ height: `${Math.max(12, count / maxYearCount * 100)}%` }} /></div><span>{year}</span></div>;
          })}
        </div> : <div className="big-empty compact"><p>Los años aparecerán cuando termines tus primeras lecturas.</p></div>}
      </section>
      <section className="backup-note"><div><h2>Tu biblioteca, siempre tuya</h2><p>JSON conserva o restaura todos los datos. PDF abre la vista de impresión para guardar un listado legible.</p></div><span>Una copia cuando tú quieras</span></section>
    </>
  );
}