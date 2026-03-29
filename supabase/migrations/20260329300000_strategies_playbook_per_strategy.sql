-- Strategies: each user has named strategies; playbook rules are scoped by (user_id, strategy_id).

create table if not exists public.trading_strategies (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.trading_strategies enable row level security;

drop policy if exists "trading_strategies_own" on public.trading_strategies;
create policy "trading_strategies_own"
  on public.trading_strategies for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Playbook: composite primary key includes strategy_id (default 'default' for legacy rows)
alter table public.playbook_conditions
  add column if not exists strategy_id text not null default 'default';

alter table public.playbook_conditions drop constraint if exists playbook_conditions_pkey;
alter table public.playbook_conditions add primary key (user_id, strategy_id, id);

create index if not exists playbook_conditions_user_strategy_idx
  on public.playbook_conditions (user_id, strategy_id);

-- Trades: which strategy's playbook was used (slug matching trading_strategies.id)
alter table public.trades
  add column if not exists strategy_key text not null default 'default';
