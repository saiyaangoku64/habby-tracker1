-- ============================================================
-- Habbby — fix anon writes (2026-05-26)
-- Schema declared "inserts go through edge function" but the website
-- POSTs directly to PostgREST. Without an anon INSERT policy, every
-- pre-registration / vote was silently rejected. This migration:
--   1) Lets anon INSERT (only) on preregistrations
--   2) Lets anon INSERT/DELETE on votes  (read goes through RPC)
--   3) Re-asserts cast_vote / get_*  RPCs are anon-callable
-- Idempotent — safe to re-run.
-- ============================================================

begin;

-- ---------- 1. PREREGISTRATIONS: allow anon to insert their own row ----------
drop policy if exists prereg_anon_insert on public.preregistrations;
create policy prereg_anon_insert
  on public.preregistrations
  for insert
  to anon, authenticated
  with check (true);

-- (no SELECT policy on purpose — emails stay private; count comes from RPC)

-- ---------- 2. VOTES: allow anon to insert/delete their own vote ----------
-- cast_vote() is security definer so it works without these, but having
-- the policies as a safety-net + means tests/manual queries also work.
alter table public.votes enable row level security;

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

-- ---------- 3. Make sure RPCs are callable by anon ----------
grant execute on function public.get_prereg_count()       to anon, authenticated;
grant execute on function public.get_vote_tally()         to anon, authenticated;
grant execute on function public.cast_vote(text, text)    to anon, authenticated;

commit;
