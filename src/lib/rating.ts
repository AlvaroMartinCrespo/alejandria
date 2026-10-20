/** Puntuación máxima (escala de 0 a 10 estrellas). */
export const MAX_RATING = 10;

/** 1..MAX_RATING, para pintar el selector de estrellas. */
export const RATING_VALUES: number[] = Array.from({ length: MAX_RATING }, (_, index) => index + 1);

/** MAX_RATING..1, para estadísticas y agrupaciones (de mejor a peor). */
export const RATING_VALUES_DESC: number[] = [...RATING_VALUES].reverse();
