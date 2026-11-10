"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { Hanko } from "@/components/hanko";
import { useLibrary } from "@/components/library-provider";
import {
  addDays,
  daysInMonth,
  formatDay,
  groupByDay,
  parseDay,
  progressDelta,
  streaks,
  todayInZone,
  weekdayMonday,
} from "@/lib/reading-activity";
import { MONTH_NAMES, plural } from "@/lib/recap";
import type { ReadingLogEntry } from "@/types/activity";
import type { Book } from "@/types/book";

const WEEKDAYS = [
  { short: "L", long: "Lunes" },
  { short: "M", long: "Martes" },
  { short: "X", long: "Miércoles" },
  { short: "J", long: "Jueves" },
  { short: "V", long: "Viernes" },
  { short: "S", long: "Sábado" },
  { short: "D", long: "Domingo" },
];

/** «12 de noviembre» */
function dayLabel(day: string) {
  const { month, date } = parseDay(day);
  return `${date} de ${MONTH_NAMES[month - 1].toLowerCase()}`;
}

/** Avance positivo del día sumando todos los libros. */
function gainOf(entries: ReadingLogEntry[]) {
  return entries.reduce((sum, entry) => sum + Math.max(0, progressDelta(entry)), 0);
}

function levelOf(entries: ReadingLogEntry[]) {
  const gain = gainOf(entries);
  if (entries.length >= 3 || gain >= 40) return 3;
  if (entries.length >= 2 || gain >= 15) return 2;
  return 1;
}

function summaryLabel(entries: ReadingLogEntry[]) {
  const gain = gainOf(entries);
  return `${plural(entries.length, "libro", "libros")}${gain > 0 ? `, +${gain} %` : ""}`;
}

export function ReadingCalendar({ books, activity }: { books: Book[]; activity: ReadingLogEntry[] }) {
  const { refreshActivity } = useLibrary();
  const today = useMemo(() => todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const [cursor, setCursor] = useState(() => {
    const { year, month } = parseDay(today);
    return { year, month };
  });
  const [selected, setSelected] = useState(today);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef(false);

  // Con Supabase, el servidor es la fuente de verdad (su zona horaria decide el día).
  useEffect(() => {
    void refreshActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const booksById = useMemo(() => new Map(books.map((book) => [book.$id, book])), [books]);
  // Solo actividad de libros que existen (por si un libro se borró en otra pestaña).
  const visible = useMemo(() => activity.filter((entry) => booksById.has(entry.bookId)), [activity, booksById]);
  const byDay = useMemo(() => groupByDay(visible), [visible]);

  const monthStart = formatDay(cursor.year, cursor.month, 1);
  const total = daysInMonth(cursor.year, cursor.month);
  const offset = weekdayMonday(monthStart);
  const cells: Array<string | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, index) => formatDay(cursor.year, cursor.month, index + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));

  const monthDays = cells.filter((day): day is string => day !== null && byDay.has(day));
  const monthEntries = monthDays.flatMap((day) => byDay.get(day) ?? []);
  const monthBooks = new Set(monthEntries.map((entry) => entry.bookId)).size;
  const monthGain = gainOf(monthEntries);
  const { current, longest } = useMemo(() => streaks(Array.from(byDay.keys()), today), [byDay, today]);

  function goToMonth(delta: number) {
    setCursor((value) => {
      const index = value.year * 12 + (value.month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  }

  function goToToday() {
    const { year, month } = parseDay(today);
    setCursor({ year, month });
    setSelected(today);
  }

  function select(day: string) {
    setSelected(day);
    const { year, month } = parseDay(day);
    if (year !== cursor.year || month !== cursor.month) setCursor({ year, month });
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[event.key];
    if (step === undefined) return;
    event.preventDefault();
    focusAfterRender.current = true;
    select(addDays(selected, step));
  }

  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
  }, [selected, cursor]);

  const selectedEntries = (byDay.get(selected) ?? []).slice().sort((a, b) => {
    const left = booksById.get(a.bookId)?.title ?? "";
    return left.localeCompare(booksById.get(b.bookId)?.title ?? "", "es");
  });
  // Si el día seleccionado no está en el mes visible, el roving tabindex cae en el primer día.
  const focusable = cells.includes(selected) ? selected : monthStart;

  return (
    <section className="reading-calendar" aria-label="Calendario de lectura">
      <div className="section-title">
        <div><p className="eyebrow">Día a día</p><h2>Calendario de lectura</h2></div>
      </div>

      <div className="calendar-head">
        <button type="button" className="calendar-nav" onClick={() => goToMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
        <h3 aria-live="polite">{MONTH_NAMES[cursor.month - 1]} {cursor.year}</h3>
        <button type="button" className="calendar-nav" onClick={() => goToMonth(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        <button type="button" className="button secondary calendar-today" onClick={goToToday}>Hoy</button>
      </div>

      <div className="calendar-grid" role="grid" aria-label={`${MONTH_NAMES[cursor.month - 1]} ${cursor.year}`} ref={gridRef} onKeyDown={onGridKeyDown}>
        <div role="row" className="calendar-row calendar-weekdays">
          {WEEKDAYS.map((weekday) => (
            <div role="columnheader" key={weekday.long} aria-label={weekday.long}><span aria-hidden="true">{weekday.short}</span></div>
          ))}
        </div>
        {rows.map((row, rowIndex) => (
          <div role="row" className="calendar-row" key={rowIndex}>
            {row.map((day, columnIndex) => {
              if (!day) return <div role="gridcell" className="calendar-cell empty" key={columnIndex} aria-hidden="true" />;
              const entries = byDay.get(day) ?? [];
              const finished = entries.some((entry) => entry.events.includes("finished"));
              const isSelected = day === selected;
              const label = entries.length
                ? `${dayLabel(day)}, ${summaryLabel(entries)}${finished ? ", libro terminado" : ""}`
                : `${dayLabel(day)}, sin lecturas`;
              return (
                <div role="gridcell" className="calendar-cell" key={day}>
                  <button
                    type="button"
                    className="calendar-day"
                    data-level={entries.length ? levelOf(entries) : 0}
                    data-today={day === today || undefined}
                    data-future={day > today || undefined}
                    aria-pressed={isSelected}
                    aria-current={day === today ? "date" : undefined}
                    aria-label={label}
                    tabIndex={day === focusable ? 0 : -1}
                    onClick={() => select(day)}
                  >
                    <span className="calendar-date">{parseDay(day).date}</span>
                    {finished && <span className="calendar-seal" aria-hidden="true"><Hanko kind="read" size="sm" /></span>}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <dl className="calendar-summary" aria-label={`Resumen de ${MONTH_NAMES[cursor.month - 1].toLowerCase()}`}>
        <div><dt>Días leídos</dt><dd>{monthDays.length}</dd></div>
        <div><dt>Libros distintos</dt><dd>{monthBooks}</dd></div>
        <div><dt>Avance en el mes</dt><dd>{monthGain > 0 ? `+${monthGain.toLocaleString("es")} %` : "—"}</dd></div>
        <div><dt>Racha actual</dt><dd>{plural(current, "día", "días")}</dd></div>
        <div><dt>Racha máxima</dt><dd>{plural(longest, "día", "días")}</dd></div>
      </dl>

      <section className="calendar-detail" aria-live="polite" aria-labelledby="calendar-detail-title">
        <h3 id="calendar-detail-title">{selected === today ? "Hoy" : dayLabel(selected)}{selected === today && <span> · {dayLabel(selected)}</span>}</h3>
        {selectedEntries.length ? (
          <ul>
            {selectedEntries.map((entry) => {
              const book = booksById.get(entry.bookId);
              if (!book) return null;
              const delta = progressDelta(entry);
              const touchedProgress = entry.events.includes("progress");
              const started = entry.events.includes("started");
              const finished = entry.events.includes("finished");
              const onlyStatus = !started && !finished && entry.events.includes("status");
              return (
                <li className="calendar-book" key={entry.$id}>
                  <Link href={`/libro/${book.$id}`} className="row-cover" aria-label={`Abrir ${book.title}`}>
                    <BookCover title={book.title} url={book.coverUrl} />
                  </Link>
                  <div className="calendar-book-copy">
                    <Link href={`/libro/${book.$id}`} className="book-title-link">{book.title}</Link>
                    <div className="calendar-badges">
                      {touchedProgress && delta > 0 && (
                        <strong className="calendar-gain">+{delta} %<small> de {entry.progressFrom} % a {entry.progressTo} %</small></strong>
                      )}
                      {touchedProgress && delta <= 0 && <span className="calendar-badge">Progreso ajustado</span>}
                      {started && <span className="calendar-badge">Empezado</span>}
                      {finished && <span className="calendar-badge finished">Terminado</span>}
                      {onlyStatus && <span className="calendar-badge">Cambio de estado</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="calendar-empty">{selected > today ? "Este día todavía no ha llegado." : "Ese día no registraste lecturas."}</p>
        )}
      </section>

      <p className="recap-note">El calendario empieza a registrar desde que se activó; las lecturas anteriores no tienen fecha exacta.</p>
    </section>
  );
}
