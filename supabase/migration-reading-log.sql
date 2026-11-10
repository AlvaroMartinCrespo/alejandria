-- Calendario de lectura: historial de actividad por libro y día.
-- Aditiva e idempotente: se puede ejecutar más de una vez.
begin;

create table if not exists public.reading_log (
  id text primary key default gen_random_uuid()::text,
  book_id text not null references public.books(id) on delete cascade,
  day date not null,
  events text[] not null default '{}'
    check (events <@ array['started','progress','finished','status']::text[]),
  progress_from smallint check (progress_from between 0 and 100),
  progress_to   smallint check (progress_to   between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, day)
);

create index if not exists reading_log_day_idx on public.reading_log (day);

drop trigger if exists reading_log_set_updated_at on public.reading_log;
create trigger reading_log_set_updated_at before update on public.reading_log
for each row execute function public.set_updated_at();

alter table public.reading_log enable row level security;
revoke all on table public.reading_log from anon, authenticated;
grant all on table public.reading_log to service_role;

-- Inserta o fusiona la actividad de un libro en un día.
create or replace function public.log_reading_activity(
  p_book_id text, p_day date, p_event text,
  p_from smallint, p_to smallint
) returns void language sql set search_path = '' as $$
  insert into public.reading_log as l (book_id, day, events, progress_from, progress_to)
  values (p_book_id, p_day, array[p_event], p_from, p_to)
  on conflict (book_id, day) do update
  set events = (select array_agg(distinct e) from unnest(l.events || excluded.events) as e),
      progress_from = coalesce(l.progress_from, excluded.progress_from),
      progress_to   = coalesce(excluded.progress_to, l.progress_to);
$$;

revoke all on function public.log_reading_activity(text, date, text, smallint, smallint)
  from public, anon, authenticated;
grant execute on function public.log_reading_activity(text, date, text, smallint, smallint)
  to service_role;

commit;

notify pgrst, 'reload schema';
