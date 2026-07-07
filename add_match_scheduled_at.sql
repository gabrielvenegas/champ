alter table public.matches
  add column if not exists scheduled_at timestamp with time zone;
