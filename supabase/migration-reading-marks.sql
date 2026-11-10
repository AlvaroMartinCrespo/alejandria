-- Días marcados a mano como «he leído» (sin libro asociado), p. ej. para igualar la racha de Kindle.
-- Aditiva e idempotente.
begin;

create table if not exists public.reading_marks (
  day date primary key,
  created_at timestamptz not null default now()
);

alter table public.reading_marks enable row level security;
revoke all on table public.reading_marks from anon, authenticated;
grant all on table public.reading_marks to service_role;

commit;

notify pgrst, 'reload schema';
