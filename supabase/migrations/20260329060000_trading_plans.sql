-- Trading plan per user (sections stored as ordered JSON array)

create table if not exists public.trading_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Trading Plan',
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);

alter table public.trading_plans enable row level security;

drop policy if exists "trading_plans_own" on public.trading_plans;
create policy "trading_plans_own"
  on public.trading_plans for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh on writes
create or replace function public.set_updated_at_trading_plans()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trading_plans_set_updated_at on public.trading_plans;
create trigger trading_plans_set_updated_at
before update on public.trading_plans
for each row
execute function public.set_updated_at_trading_plans();

