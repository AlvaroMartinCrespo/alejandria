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
  rating smallint check (rating between 0 and 5),
  finished_year integer check (finished_year between 1900 and 2100),
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

commit;