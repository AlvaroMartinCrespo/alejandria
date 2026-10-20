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

commit;

notify pgrst, 'reload schema';
