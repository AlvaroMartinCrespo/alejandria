import { getDailyJapanesePhrase } from "@/lib/anime-utils";

/** Cabecera con la frase japonesa del día (una por día, como la cita de la portada). */
export function JapaneseHeading() {
  const phrase = getDailyJapanesePhrase();

  return (
    <section className="page-heading quote-heading japanese-heading">
      <blockquote>
        <p lang="ja" className="japanese-kanji">{phrase.japanese}</p>
        <small className="japanese-romaji">{phrase.romaji}</small>
        <cite>{phrase.translation}</cite>
      </blockquote>
    </section>
  );
}
