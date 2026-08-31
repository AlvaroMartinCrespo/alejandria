"use client";

import Link from "next/link";
import { Download, FileText, Upload } from "lucide-react";
import { LibraryStatusChart, RatingChart, ReadingYearsChart } from "@/components/library-charts";
import { useLibrary } from "@/components/library-provider";
import type { LibraryBackup } from "@/types/book";

export default function StatisticsPage() {
  const { books, restoreBackup } = useLibrary();
  const completed = books.filter((book) => book.status === "read");
  const pages = completed.reduce((sum, book) => sum + (book.pageCount ?? 0), 0);
  const rated = completed.filter((book) => book.rating !== null);
  const average = rated.length ? rated.reduce((sum, book) => sum + (book.rating ?? 0), 0) / rated.length : 0;
  const authorCounts = completed.flatMap((book) => book.authors).reduce<Record<string, number>>((counts, author) => {
    counts[author] = (counts[author] ?? 0) + 1;
    return counts;
  }, {});
  const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];
  const years = Array.from(new Set(completed.map((book) => book.finishedYear).filter(Boolean) as number[])).sort((a, b) => a - b);
  const statusCounts = {
    reading: books.filter((book) => book.status === "reading").length,
    toRead: books.filter((book) => book.status === "to_read").length,
    read: completed.length,
  };
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: completed.filter((book) => book.rating === rating).length,
  }));
  const statusData = [
    { name: "Leyendo", value: statusCounts.reading, color: "#b8f34a" },
    { name: "Quiero leer", value: statusCounts.toRead, color: "#e9bb58" },
    { name: "Leídos", value: statusCounts.read, color: "#ff735d" },
  ];
  const yearData = years.map((year) => ({
    year,
    count: completed.filter((book) => book.finishedYear === year).length,
  }));

  function exportJson() {
    const backup: LibraryBackup = {
      format: "alejandria-library-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      bookCount: books.length,
      books,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
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
      const message = error instanceof SyntaxError
        ? "El archivo no contiene JSON válido."
        : error instanceof Error
          ? error.message
          : "No se pudo restaurar la copia.";
      window.alert(message);
    }
  }

  return (
    <>
      <section className="page-heading stats-heading">
        <div><p className="eyebrow">La biblioteca en números</p><h1>Estadísticas</h1></div>
        <div className="export-actions">
          <button className="button secondary" onClick={exportJson}><Download size={15} />JSON</button>
          <label className="button secondary file-button"><Upload size={15} />Restaurar<input type="file" accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} /></label>
          <Link className="button secondary" href="/exportar"><FileText size={15} />PDF</Link>
        </div>
      </section>
      <section className="stat-grid">
        <article><span>Libros terminados</span><strong>{completed.length}</strong><small>en total</small></article>
        <article><span>Páginas leídas</span><strong>{pages.toLocaleString("es")}</strong><small>aproximadamente</small></article>
        <article><span>Puntuación media</span><strong>{average ? average.toFixed(1) : "—"}</strong><small>sobre 5</small></article>
        <article><span>Autor más leído</span><strong className="author-stat">{topAuthor?.[0] ?? "—"}</strong><small>{topAuthor ? `${topAuthor[1]} libros` : "sin datos"}</small></article>
      </section>
      <section className="stats-insights">
        <article className="status-overview">
          <div>
            <p className="eyebrow">Tu biblioteca hoy</p>
            <h2>Lecturas por estado</h2>
          </div>
          <LibraryStatusChart data={statusData} />
          <div className="status-legend">
            <span className="reading"><i />Leyendo<strong>{statusCounts.reading}</strong></span>
            <span className="to-read"><i />Quiero leer<strong>{statusCounts.toRead}</strong></span>
            <span className="read"><i />Leídos<strong>{statusCounts.read}</strong></span>
          </div>
        </article>
        <article className="rating-overview">
          <div>
            <p className="eyebrow">Valoraciones</p>
            <h2>Cómo puntúas</h2>
          </div>
          <RatingChart data={ratingCounts} />
        </article>
      </section>
      <section className="year-chart">
        <div className="section-title"><div><p className="eyebrow">Ritmo de lectura</p><h2>Libros por año</h2></div></div>
        {years.length
          ? <ReadingYearsChart data={yearData} />
          : <div className="big-empty compact"><p>Los años aparecerán cuando termines tus primeras lecturas.</p></div>}
      </section>
      <section className="backup-note"><div><h2>Tu biblioteca, siempre tuya</h2><p>JSON conserva o restaura todos los datos. PDF abre la vista de impresión para guardar un listado legible.</p></div><span>Una copia cuando tú quieras</span></section>
    </>
  );
}