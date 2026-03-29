-- Trade Mastermind: user-scoped trades and playbook (requires Auth > Anonymous enabled for passwordless sessions)
-- Run this in Supabase SQL Editor or via `supabase db push` if you use the CLI.

create table if not exists public.playbook_conditions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  label text not null,
  description text,
  primary key (user_id, id)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  instrument text not null,
  trade_date date not null,
  trade_time text not null,
  session text not null,
  direction text not null,
  entry_price double precision not null,
  stop_loss double precision not null,
  take_profit double precision not null,
  result double precision not null,
  risk_amount double precision not null,
  risk_percent double precision not null,
  rr_ratio double precision not null,
  strategy text not null,
  reason text not null,
  emotion_before text not null,
  emotion_during text not null,
  emotion_after text not null,
  playbook_checks jsonb not null default '[]'::jsonb,
  is_valid boolean not null,
  images_before jsonb,
  images_after jsonb,
  created_at timestamptz not null default now(),
  constraint trades_session_check check (session in ('London', 'New York', 'Asian')),
  constraint trades_direction_check check (direction in ('long', 'short')),
  constraint trades_emotion_before_check check (emotion_before in ('calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral')),
  constraint trades_emotion_during_check check (emotion_during in ('calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral')),
  constraint trades_emotion_after_check check (emotion_after in ('calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral'))
);

create index if not exists trades_user_date_idx on public.trades (user_id, trade_date desc);

alter table public.playbook_conditions enable row level security;
alter table public.trades enable row level security;

drop policy if exists "playbook_conditions_own" on public.playbook_conditions;
create policy "playbook_conditions_own"
  on public.playbook_conditions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "trades_own" on public.trades;
create policy "trades_own"
  on public.trades for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
