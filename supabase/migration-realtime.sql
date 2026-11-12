begin;

-- Realtime (sincronización entre dispositivos). Aditiva e idempotente.
-- 1. Publica las tablas en Supabase Realtime.
-- 2. Da a `anon` SOLO lectura (SELECT): es lo que necesita el navegador para recibir
--    los eventos. Las escrituras siguen cerradas: solo `service_role` (servidor) escribe.
-- `backup_log` NO se publica ni se abre a `anon`.
do $$
declare
  t text;
begin
  foreach t in array array['books', 'collections', 'anime', 'reading_log', 'reading_marks'] loop
    if to_regclass('public.' || t) is null then
      continue; -- migración opcional todavía sin aplicar (p. ej. reading_marks)
    end if;

    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
         select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;

    execute format('grant select on table public.%I to anon', t);
    execute format('drop policy if exists %I on public.%I', 'realtime read ' || t, t);
    execute format(
      'create policy %I on public.%I for select to anon using (true)',
      'realtime read ' || t, t
    );
  end loop;
end
$$;

commit;

notify pgrst, 'reload schema';
