-- User settings: initial account size and default risk per trade.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  initial_capital double precision not null default 1000,
  risk_per_trade_percent double precision not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_own" on public.user_settings;
create policy "user_settings_own"
  on public.user_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at_user_settings() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at_user_settings();

