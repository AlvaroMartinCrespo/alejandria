-- Cambia la puntuación de 0-5 a 0-10 en `books` y `anime`.
--
-- 1. Sustituye el check de la columna `rating` por `between 0 and 10`.
-- 2. Multiplica por 2 las valoraciones existentes (4 -> 8, 5 -> 10) para
--    conservar su equivalencia.
--
-- Es seguro ejecutarlo más de una vez: si el check ya admite hasta 10, esa
-- tabla se omite y las valoraciones NO se vuelven a multiplicar.
-- Ejecútalo una vez en Supabase -> SQL Editor justo antes de desplegar el código nuevo.

do $$
declare
  t text;
  v_name text;
  v_def text;
begin
  foreach t in array array['books', 'anime'] loop
    select conname, pg_get_constraintdef(oid)
      into v_name, v_def
      from pg_constraint
     where conrelid = ('public.' || t)::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%rating%'
     limit 1;

    if v_def like '%<= 10)%' then
      raise notice 'public.%: ya usa la escala 0-10, se omite.', t;
    else
      if v_name is not null then
        execute format('alter table public.%I drop constraint %I', t, v_name);
      end if;
      execute format('update public.%I set rating = rating * 2 where rating is not null', t);
      execute format('alter table public.%I add constraint %I check (rating between 0 and 10)', t, t || '_rating_check');
      raise notice 'public.%: migrada a la escala 0-10.', t;
    end if;
  end loop;
end $$;
