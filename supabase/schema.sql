begin;

create table if not exists public.books (
  id text primary key default gen_random_uuid()::text,
  google_books_id text not null default '',
  title text not null check (char_length(title) between 1 and 500),
  authors text[] not null default '{}',
  cover_url text check (cover_url is null or cover_url like 'https://%'),
  published_year integer check (published_year between 0 and 3000),
  page_count integer check (page_count between 0 and 100000),
  synopsis text not null default '' check (char_length(synopsis) <= 20000),
  status text not null default 'to_read' check (status in ('to_read', 'reading', 'read')),
  favorite boolean not null default false,
  sort_order bigint check (sort_order >= 0),
  rating smallint check (rating between 0 and 10),
  finished_year integer check (finished_year between 1900 and 2100),
  finished_month smallint check (finished_month between 1 and 12),
  added_at timestamptz not null default now(),
  progress smallint not null default 0 check (progress between 0 and 100),
  notes text not null default '' check (char_length(notes) <= 50000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(authors) <= 20)
);

create unique index if not exists books_google_books_id_unique
  on public.books (google_books_id)
  where google_books_id <> '';
create index if not exists books_status_idx on public.books (status);
create index if not exists books_finished_year_idx on public.books (finished_year);
create index if not exists books_sort_order_idx on public.books (sort_order);

create table if not exists public.collections (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 1 and 60),
  sort_order bigint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

alter table public.books
  add column if not exists collection_id text references public.collections(id) on delete set null;
create index if not exists books_collection_idx on public.books (collection_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

alter table public.books enable row level security;
revoke all on table public.books from anon, authenticated;
grant all on table public.books to service_role;

alter table public.collections enable row level security;
revoke all on table public.collections from anon, authenticated;
grant all on table public.collections to service_role;

create or replace function public.reorder_books(moves jsonb)
returns void
language sql
set search_path = ''
as $$
  update public.books b
  set collection_id = nullif(m.collection_id, ''),
      sort_order = m.sort_order
  from jsonb_to_recordset(moves) as m(id text, collection_id text, sort_order bigint)
  where b.id = m.id;
$$;

revoke all on function public.reorder_books(jsonb) from public, anon, authenticated;
grant execute on function public.reorder_books(jsonb) to service_role;

commit;

begin;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.anime (
  id text primary key default gen_random_uuid()::text,
  source_id text not null default '',
  title text not null check (char_length(title) between 1 and 500),
  title_japanese text not null default '' check (char_length(title_japanese) <= 500),
  cover_url text check (cover_url is null or cover_url like 'https://%'),
  release_year integer check (release_year between 1900 and 2100),
  media_format text not null default '' check (char_length(media_format) <= 30),
  genres text[] not null default '{}' check (cardinality(genres) <= 30),
  synopsis text not null default '' check (char_length(synopsis) <= 20000),
  status text not null default 'to_watch'
    check (status in ('to_watch','watching','on_hold','watched','dropped')),
  favorite boolean not null default false,
  rating smallint check (rating between 0 and 10),
  current_season integer not null default 1 check (current_season between 1 and 100),
  current_episode integer not null default 0 check (current_episode between 0 and 100000),
  total_episodes integer check (total_episodes between 0 and 100000),
  total_seasons integer check (total_seasons between 1 and 100),
  finished_year integer check (finished_year between 1900 and 2100),
  finished_month smallint check (finished_month between 1 and 12),
  last_watched_at timestamptz,
  sort_order bigint check (sort_order >= 0),
  notes text not null default '' check (char_length(notes) <= 50000),
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists anime_source_id_unique on public.anime (source_id) where source_id <> '';
create index if not exists anime_status_idx on public.anime (status);
create index if not exists anime_finished_year_idx on public.anime (finished_year);
create index if not exists anime_sort_order_idx on public.anime (sort_order);

drop trigger if exists anime_set_updated_at on public.anime;
create trigger anime_set_updated_at before update on public.anime
for each row execute function public.set_updated_at();

alter table public.anime enable row level security;
revoke all on table public.anime from anon, authenticated;
grant all on table public.anime to service_role;

create or replace function public.reorder_anime(moves jsonb)
returns void language sql set search_path = '' as $$
  update public.anime a set sort_order = m.sort_order
  from jsonb_to_recordset(moves) as m(id text, sort_order bigint)
  where a.id = m.id;
$$;
revoke all on function public.reorder_anime(jsonb) from public, anon, authenticated;
grant execute on function public.reorder_anime(jsonb) to service_role;


-- ===== Calendario de lectura (migration-reading-log.sql) =====

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


-- ===== Días marcados a mano (migration-reading-marks.sql) =====

create table if not exists public.reading_marks (
  day date primary key,
  created_at timestamptz not null default now()
);

alter table public.reading_marks enable row level security;
revoke all on table public.reading_marks from anon, authenticated;
grant all on table public.reading_marks to service_role;


-- ===== Registro de copias por correo (migration-backup-log.sql) =====

create table if not exists public.backup_log (
  id text primary key default gen_random_uuid()::text,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('success', 'error')),
  trigger text not null default 'cron' check (trigger in ('cron', 'manual')),
  book_count integer not null default 0 check (book_count >= 0),
  anime_count integer not null default 0 check (anime_count >= 0),
  json_bytes integer check (json_bytes >= 0),
  error_message text check (error_message is null or char_length(error_message) <= 2000)
);

create index if not exists backup_log_status_sent_at_idx
  on public.backup_log (status, sent_at desc);

alter table public.backup_log enable row level security;
revoke all on table public.backup_log from anon, authenticated;
grant all on table public.backup_log to service_role;

/* ===== REALTIME ===== */

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
