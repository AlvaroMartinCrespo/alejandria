begin;

create table if not exists public.collections (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 1 and 60),
  sort_order bigint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

alter table public.books
  add column if not exists collection_id text references public.collections(id) on delete set null;
create index if not exists books_collection_idx on public.books (collection_id, sort_order);

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

notify pgrst, 'reload schema';