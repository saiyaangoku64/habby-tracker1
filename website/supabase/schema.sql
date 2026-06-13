-- ============================================================
-- Habbby pre-registration schema
-- Run this once in Supabase SQL editor (Dashboard → SQL → New query)
-- ============================================================

-- 1. Table that stores every pre-registration
create table if not exists public.preregistrations (
  id           bigserial primary key,
  email        text not null unique,
  source       text default 'website',
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists preregistrations_created_at_idx
  on public.preregistrations (created_at desc);

-- 2. Row-Level Security
-- Anon users CANNOT read the email rows (privacy). They can only see the count.
alter table public.preregistrations enable row level security;

-- No anon SELECT policy on rows themselves -> emails stay private.
-- Inserts go through the edge function (uses service role), so we don't need
-- an anon insert policy either. Keep RLS strict.

-- 3. Public RPC: returns just the total count
create or replace function public.get_prereg_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.preregistrations;
$$;

revoke all on function public.get_prereg_count() from public;
grant execute on function public.get_prereg_count() to anon, authenticated;

-- 4. Optional: votes table for the up/down widget
create table if not exists public.votes (
  id           bigserial primary key,
  kind         text not null check (kind in ('up','down')),
  fingerprint  text,
  created_at   timestamptz not null default now()
);

create or replace function public.get_vote_tally()
returns table(up_count int, down_count int)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.votes where kind = 'up')   as up_count,
    (select count(*)::int from public.votes where kind = 'down') as down_count;
$$;

grant execute on function public.get_vote_tally() to anon, authenticated;
