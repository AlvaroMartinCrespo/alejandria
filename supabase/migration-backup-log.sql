-- Registro de copias de seguridad enviadas por correo (cron y envío manual).
-- Aditiva e idempotente.
begin;

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

-- Consulta frecuente: último envío correcto.
create index if not exists backup_log_status_sent_at_idx
  on public.backup_log (status, sent_at desc);

alter table public.backup_log enable row level security;
revoke all on table public.backup_log from anon, authenticated;
grant all on table public.backup_log to service_role;

commit;

notify pgrst, 'reload schema';
