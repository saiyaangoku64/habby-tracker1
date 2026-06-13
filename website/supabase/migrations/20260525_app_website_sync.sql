-- ============================================================
-- Habbby — app + website integration migration (2026-05-25)
-- A) Founder claim flow
-- B) Events table for funnel/onboarding analytics
-- C) Subscription columns + conversion view
-- ============================================================

-- ============================================================
-- A) FOUNDER CLAIM FLOW
-- ============================================================

-- Track who claimed a pre-registration in the app
alter table public.preregistrations
  add column if not exists claimed_at         timestamptz,
  add column if not exists claimed_by_user_id uuid references auth.users(id) on delete set null;

-- Founder number on profiles (1..100). Null = not a founder.
alter table public.profiles
  add column if not exists founder_number   int unique
    check (founder_number is null or founder_number between 1 and 100),
  add column if not exists preregistered_at timestamptz;

create index if not exists profiles_founder_number_idx
  on public.profiles (founder_number) where founder_number is not null;

-- The app calls this once after signup. Idempotent.
create or replace function public.claim_founder()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_email     text;
  v_existing  int;
  v_prereg_at timestamptz;
  v_next      int;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  -- already claimed?
  select founder_number into v_existing
    from public.profiles where id = v_user_id;
  if v_existing is not null then
    return jsonb_build_object('ok', true, 'founder_number', v_existing, 'already_claimed', true);
  end if;

  -- pull email from auth
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'no_email');
  end if;

  -- pre-registered?
  select created_at into v_prereg_at
    from public.preregistrations where lower(email) = lower(v_email);
  if v_prereg_at is null then
    return jsonb_build_object('ok', false, 'reason', 'not_preregistered');
  end if;

  -- next slot (1..100)
  select coalesce(max(founder_number), 0) + 1 into v_next from public.profiles;
  if v_next > 100 then
    -- still mark them as preregistered, just not a founder
    update public.profiles
       set preregistered_at = v_prereg_at
     where id = v_user_id;
    return jsonb_build_object('ok', false, 'reason', 'sold_out');
  end if;

  update public.profiles
     set founder_number = v_next,
         preregistered_at = v_prereg_at
   where id = v_user_id;

  update public.preregistrations
     set claimed_at = now(),
         claimed_by_user_id = v_user_id
   where lower(email) = lower(v_email);

  return jsonb_build_object('ok', true, 'founder_number', v_next, 'preregistered_at', v_prereg_at);
end;
$$;

revoke all on function public.claim_founder() from public;
grant execute on function public.claim_founder() to authenticated;


-- ============================================================
-- B) EVENTS TABLE
-- ============================================================
create table if not exists public.events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  anon_id     text,
  name        text not null,
  payload     jsonb default '{}'::jsonb,
  source      text default 'app',  -- 'app' or 'website'
  created_at  timestamptz not null default now()
);

create index if not exists events_user_id_idx     on public.events (user_id, created_at desc);
create index if not exists events_anon_id_idx     on public.events (anon_id, created_at desc);
create index if not exists events_name_idx        on public.events (name, created_at desc);
create index if not exists events_created_at_idx  on public.events (created_at desc);

alter table public.events enable row level security;

-- nobody can read raw events (privacy). owner reads via dashboard.
-- writes go through log_event() which is security definer, so no insert policy needed.

-- One safe writer for both anon (website) and authenticated (app)
create or replace function public.log_event(
  p_name    text,
  p_payload jsonb default '{}'::jsonb,
  p_anon_id text default null,
  p_source  text default 'app'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- name guard rails
  if p_name is null or length(p_name) > 64 then
    return;
  end if;
  -- payload size guard (~4KB)
  if octet_length(p_payload::text) > 4096 then
    p_payload := jsonb_build_object('truncated', true);
  end if;

  insert into public.events (user_id, anon_id, name, payload, source)
  values (auth.uid(), nullif(p_anon_id, ''), p_name, coalesce(p_payload, '{}'::jsonb),
          coalesce(nullif(p_source, ''), 'app'));
end;
$$;

revoke all on function public.log_event(text, jsonb, text, text) from public;
grant execute on function public.log_event(text, jsonb, text, text) to anon, authenticated;


-- ============================================================
-- C) SUBSCRIPTION COLUMNS + CONVERSION VIEW
-- ============================================================
alter table public.profiles
  add column if not exists plan              text not null default 'free'
    check (plan in ('free', 'premium')),
  add column if not exists plan_started_at   timestamptz,
  add column if not exists plan_expires_at   timestamptz,
  add column if not exists onboarding_done   boolean not null default false;

-- Keep is_premium boolean in sync with plan (your app already reads is_premium)
create or replace function public.sync_is_premium()
returns trigger
language plpgsql
as $$
begin
  new.is_premium := (new.plan = 'premium')
                    and (new.plan_expires_at is null or new.plan_expires_at > now());
  return new;
end;
$$;

drop trigger if exists profiles_sync_is_premium on public.profiles;
create trigger profiles_sync_is_premium
before insert or update of plan, plan_expires_at on public.profiles
for each row execute function public.sync_is_premium();

-- Conversion / funnel summary (owner-only via dashboard; not exposed to anon)
create or replace view public.conversion_view as
with funnel as (
  select
    (select count(*) from public.preregistrations)                              as preregistrations,
    (select count(*) from public.preregistrations where claimed_at is not null) as preregs_claimed,
    (select count(*) from auth.users)                                           as signups,
    (select count(*) from public.profiles where onboarding_done)                as onboarded,
    (select count(*) from public.profiles where founder_number is not null)     as founders_minted,
    (select count(*) from public.profiles where plan = 'premium')               as premium,
    (select count(*) from public.profiles where is_premium)                     as premium_active
)
select
  preregistrations,
  preregs_claimed,
  signups,
  onboarded,
  founders_minted,
  premium,
  premium_active,
  case when preregistrations > 0
       then round(100.0 * preregs_claimed / preregistrations, 1) end as prereg_to_signup_pct,
  case when signups > 0
       then round(100.0 * onboarded / signups, 1)                end as signup_to_onboarded_pct,
  case when onboarded > 0
       then round(100.0 * premium_active / onboarded, 1)         end as onboarded_to_premium_pct
from funnel;

-- Lock down: only project owner / service_role can read this view
revoke all on public.conversion_view from public, anon, authenticated;
