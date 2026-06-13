-- ============================================================
-- Habbby — reset to real numbers + dedup'd vote RPC (2026-05-26)
-- 1) Wipe seeded/test counts so the site shows actual figures.
-- 2) cast_vote() with one-vote-per-fingerprint, toggle + swap.
-- 3) Tighten get_vote_tally() for anon callers.
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ---------- 1. RESET ----------
truncate table public.votes restart identity;
-- preregistrations stay; if you also want a clean slate, uncomment:
-- truncate table public.preregistrations restart identity cascade;

-- ---------- 2. VOTE TABLE: dedup index ----------
-- One row per (kind, fingerprint) so a user can't spam the same kind
create unique index if not exists votes_kind_fingerprint_uniq
  on public.votes (kind, fingerprint)
  where fingerprint is not null;

-- ---------- 3. cast_vote() RPC ----------
-- Returns the new tally so the client repaints in one round-trip.
-- Behaviour:
--   * no prior vote        → insert
--   * same kind, same fp   → undo (delete)
--   * other kind, same fp  → swap (delete old, insert new)
create or replace function public.cast_vote(
  p_kind        text,
  p_fingerprint text
)
returns table(up_count int, down_count int, action text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := 'insert';
begin
  if p_kind not in ('up','down') then
    raise exception 'invalid kind';
  end if;
  if p_fingerprint is null or length(p_fingerprint) = 0 then
    raise exception 'missing fingerprint';
  end if;

  if exists (select 1 from public.votes where fingerprint = p_fingerprint and kind = p_kind) then
    delete from public.votes where fingerprint = p_fingerprint and kind = p_kind;
    v_action := 'undo';
  else
    delete from public.votes where fingerprint = p_fingerprint;     -- swap if other kind
    insert into public.votes (kind, fingerprint) values (p_kind, p_fingerprint);
    v_action := case when found then 'insert' else 'insert' end;
  end if;

  return query
    select
      (select count(*)::int from public.votes where kind = 'up')   as up_count,
      (select count(*)::int from public.votes where kind = 'down') as down_count,
      v_action;
end;
$$;

revoke all on function public.cast_vote(text, text) from public;
grant execute on function public.cast_vote(text, text) to anon, authenticated;

-- ---------- 4. ensure get_vote_tally() exists (idempotent re-grant) ----------
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

commit;
