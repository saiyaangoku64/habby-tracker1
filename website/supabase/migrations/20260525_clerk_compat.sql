-- ============================================================
-- Habbby — Clerk-compatible auth migration v2 (2026-05-25)
-- Replaces 20260525_clerk_compat.sql (which rolled back).
-- 0 rows in every affected table — safe.
-- ============================================================

begin;

-- 1) Drop view + policies that pin column types
drop view if exists public.leaderboard_view;

drop policy if exists logs_own           on public.habit_logs;
drop policy if exists habits_own         on public.habits;
drop policy if exists lb_own             on public.leaderboard_weekly;
drop policy if exists lb_read_all        on public.leaderboard_weekly;
drop policy if exists profiles_own       on public.profiles;
drop policy if exists profiles_read_all  on public.profiles;
drop policy if exists streaks_own        on public.streaks;
drop policy if exists streaks_read_all   on public.streaks;

-- 2) Drop ALL FKs that involve user-id columns (recreate intra-public ones later)
alter table public.profiles            drop constraint if exists profiles_id_fkey;
alter table public.habits              drop constraint if exists habits_user_id_fkey;
alter table public.habit_logs          drop constraint if exists habit_logs_user_id_fkey;
alter table public.streaks             drop constraint if exists streaks_user_id_fkey;
alter table public.leaderboard_weekly  drop constraint if exists leaderboard_weekly_user_id_fkey;
alter table public.events              drop constraint if exists events_user_id_fkey;
alter table public.preregistrations    drop constraint if exists preregistrations_claimed_by_user_id_fkey;

-- 3) Convert uuid -> text
alter table public.profiles            alter column id      type text using id::text;
alter table public.habits              alter column user_id type text using user_id::text;
alter table public.habit_logs          alter column user_id type text using user_id::text;
alter table public.streaks             alter column user_id type text using user_id::text;
alter table public.leaderboard_weekly  alter column user_id type text using user_id::text;
alter table public.events              alter column user_id type text using user_id::text;
alter table public.preregistrations
  alter column claimed_by_user_id type text using claimed_by_user_id::text;

-- 4) Recreate intra-public FKs (now both sides are text)
alter table public.habits
  add constraint habits_user_id_fkey foreign key (user_id)
  references public.profiles(id) on delete cascade;
alter table public.habit_logs
  add constraint habit_logs_user_id_fkey foreign key (user_id)
  references public.profiles(id) on delete cascade;
alter table public.streaks
  add constraint streaks_user_id_fkey foreign key (user_id)
  references public.profiles(id) on delete cascade;
alter table public.leaderboard_weekly
  add constraint leaderboard_weekly_user_id_fkey foreign key (user_id)
  references public.profiles(id) on delete cascade;

-- (events.user_id and preregistrations.claimed_by_user_id intentionally have no FK
--  — Clerk users live outside Postgres; we just store their string id.)

-- 5) Helper for both Supabase Auth & Clerk JWTs
create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'sub', '')
$$;

-- 6) Recreate policies using current_user_id()
create policy profiles_own
  on public.profiles for all to authenticated
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

create policy profiles_read_all
  on public.profiles for select to anon, authenticated
  using (true);

create policy habits_own
  on public.habits for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy logs_own
  on public.habit_logs for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy streaks_own
  on public.streaks for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy streaks_read_all
  on public.streaks for select to anon, authenticated
  using (true);

create policy lb_own
  on public.leaderboard_weekly for all to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy lb_read_all
  on public.leaderboard_weekly for select to anon, authenticated
  using (true);

-- 7) Leaderboard view
create or replace view public.leaderboard_view as
select
  lw.rank, lw.score, lw.total_logs, lw.total_streak, lw.week_start,
  p.id as user_id, p.username, p.display_name, p.avatar_color, p.level, p.xp
from public.leaderboard_weekly lw
join public.profiles p on p.id = lw.user_id
where lw.week_start = date_trunc('week', now())::date
order by lw.score desc;

-- 8) claim_founder() — now takes email, uses Clerk-compatible JWT sub
drop function if exists public.claim_founder();
drop function if exists public.claim_founder(text);

create function public.claim_founder(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   text := public.current_user_id();
  v_email     text := lower(trim(coalesce(p_email, '')));
  v_existing  int;
  v_prereg_at timestamptz;
  v_next      int;
begin
  if v_user_id = '' then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;
  if v_email = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_email');
  end if;

  select founder_number into v_existing from public.profiles where id = v_user_id;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'founder_number', v_existing, 'already_claimed', true);
  end if;

  select created_at into v_prereg_at
    from public.preregistrations where lower(email) = v_email;
  if v_prereg_at is null then
    return jsonb_build_object('ok', false, 'reason', 'not_preregistered');
  end if;

  select coalesce(max(founder_number), 0) + 1 into v_next from public.profiles;
  if v_next > 100 then
    update public.profiles set preregistered_at = v_prereg_at where id = v_user_id;
    return jsonb_build_object('ok', false, 'reason', 'sold_out', 'preregistered_at', v_prereg_at);
  end if;

  update public.profiles
     set founder_number = v_next, preregistered_at = v_prereg_at
   where id = v_user_id;

  update public.preregistrations
     set claimed_at = now(), claimed_by_user_id = v_user_id
   where lower(email) = v_email;

  return jsonb_build_object('ok', true, 'founder_number', v_next, 'preregistered_at', v_prereg_at);
end;
$$;

revoke all on function public.claim_founder(text) from public;
grant execute on function public.claim_founder(text) to authenticated;

-- 9) log_event() — Clerk-compatible
drop function if exists public.log_event(text, jsonb, text, text);

create function public.log_event(
  p_name text, p_payload jsonb default '{}'::jsonb,
  p_anon_id text default null, p_source text default 'app'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid text := nullif(public.current_user_id(), '');
begin
  if p_name is null or length(p_name) > 64 then return; end if;
  if octet_length(coalesce(p_payload, '{}'::jsonb)::text) > 4096 then
    p_payload := jsonb_build_object('truncated', true);
  end if;
  insert into public.events (user_id, anon_id, name, payload, source)
  values (v_uid, nullif(p_anon_id, ''), p_name,
          coalesce(p_payload, '{}'::jsonb),
          coalesce(nullif(p_source, ''), 'app'));
end;
$$;

revoke all on function public.log_event(text, jsonb, text, text) from public;
grant execute on function public.log_event(text, jsonb, text, text) to anon, authenticated;

commit;
