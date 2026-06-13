-- ============================================================
-- Habbby — full vote + prereg fix (2026-05-27)
-- One self-healing script. Run this ONCE in Supabase SQL Editor.
-- Replaces the two earlier 2026-05-26 migrations (safe to run again).
--
-- Does:
--   1) Ensures preregistrations + votes tables exist
--   2) Resets vote counts to 0
--   3) Creates cast_vote() and get_vote_tally() RPCs
--   4) Opens anon INSERT on preregistrations + votes
--   5) Grants RPC EXECUTE to anon
-- ============================================================

begin;

-- ---------- 1. TABLES (create if missing) ----------
create table if not exists public.preregistrations (
  id           bigserial primary key,
  email        text not null unique,
  source       text default 'website',
  user_agent   text,
  claimed_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.votes (
  id           bigserial primary key,
  kind         text not null check (kind in ('up','down')),
  fingerprint  text,
  created_at   timestamptz not null default now()
);

-- ---------- 2. RESET VOTE COUNTS ----------
truncate table public.votes restart identity;

-- one row per (kind, fingerprint)
create unique index if not exists votes_kind_fingerprint_uniq
  on public.votes (kind, fingerprint)
  where fingerprint is not null;

-- ---------- 3. RPCs ----------
-- read tally
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

-- prereg count (idempotent re-create so a re-run wipes any drift)
create or replace function public.get_prereg_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.preregistrations;
$$;

-- cast a vote: insert / undo / swap
-- drop old signatures first so re-runs don't leave duplicates
drop function if exists public.cast_vote(text, text);

create function public.cast_vote(
  p_kind        text,
  p_fingerprint text
)
returns table(up_count int, down_count int, action text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if p_kind not in ('up','down') then
    raise exception 'invalid kind: %', p_kind;
  end if;
  if p_fingerprint is null or length(p_fingerprint) = 0 then
    raise exception 'missing fingerprint';
  end if;

  if exists (select 1 from public.votes
              where fingerprint = p_fingerprint and kind = p_kind) then
    -- same kind = undo
    delete from public.votes
      where fingerprint = p_fingerprint and kind = p_kind;
    v_action := 'undo';
  else
    -- swap: kill any opposite-kind vote, then insert this one
    delete from public.votes where fingerprint = p_fingerprint;
    insert into public.votes (kind, fingerprint) values (p_kind, p_fingerprint);
    v_action := 'insert';
  end if;

  return query
    select
      (select count(*)::int from public.votes where kind = 'up'),
      (select count(*)::int from public.votes where kind = 'down'),
      v_action;
end;
$$;

-- ---------- 4. RLS + anon INSERT policies ----------
alter table public.preregistrations enable row level security;
alter table public.votes            enable row level security;

drop policy if exists prereg_anon_insert on public.preregistrations;
create policy prereg_anon_insert
  on public.preregistrations
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists votes_anon_insert on public.votes;
create policy votes_anon_insert
  on public.votes
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists votes_anon_delete on public.votes;
create policy votes_anon_delete
  on public.votes
  for delete
  to anon, authenticated
  using (true);

-- ---------- 5. GRANTS ----------
revoke all on function public.get_prereg_count()        from public;
revoke all on function public.get_vote_tally()          from public;
revoke all on function public.cast_vote(text, text)     from public;

grant execute on function public.get_prereg_count()     to anon, authenticated;
grant execute on function public.get_vote_tally()       to anon, authenticated;
grant execute on function public.cast_vote(text, text)  to anon, authenticated;

commit;

-- ============================================================
-- Smoke test (run AFTER the commit above succeeds)
-- ============================================================
-- select * from public.cast_vote('up', 'test_fp_123');     -- expect up_count=1, action=insert
-- select * from public.cast_vote('up', 'test_fp_123');     -- expect up_count=0, action=undo
-- select * from public.cast_vote('down', 'test_fp_123');   -- expect down_count=1, action=insert
-- select * from public.cast_vote('up',  'test_fp_123');    -- expect up=1, down=0, action=insert (swap)
-- delete from public.votes where fingerprint = 'test_fp_123';
