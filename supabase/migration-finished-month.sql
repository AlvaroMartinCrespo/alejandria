-- Añade el mes de finalización (`finished_month`, 1-12) a `books` y `anime`.
--
-- Se usa junto a `finished_year`. Es opcional (null = sin mes): los libros y
-- anime que ya existen se quedan con el mes vacío y se pueden rellenar a mano.
--
-- Es aditiva e idempotente: se puede ejecutar más de una vez sin efectos
-- secundarios y no modifica ningún dato existente.
-- Ejecútalo una vez en Supabase -> SQL Editor.

begin;

alter table public.books
  add column if not exists finished_month smallint
  check (finished_month between 1 and 12);

alter table public.anime
  add column if not exists finished_month smallint
  check (finished_month between 1 and 12);

commit;

notify pgrst, 'reload schema';
