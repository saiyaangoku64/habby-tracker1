# App ↔ Website integration

How the React Native app talks to the same Supabase project as the website. Everything below assumes the existing Clerk JWT setup in `constants/clerkSupabase.ts` (`useClerkSupabase` hook).

## What's already wired

| Where | What it does |
|-------|-------------|
| Website | Anon visitors POST to `preregistrations` (email + UA), fire `pageview` / `vote` / `prereg_submit` events to `events` |
| Database | `profiles.founder_number` (1-100), `profiles.plan` (`free`/`premium`), `profiles.is_premium` (auto-synced), `profiles.onboarding_done`, `profiles.preregistered_at` |
| RPCs | `claim_founder(email)`, `log_event(name, payload, anon_id, source)`, `get_prereg_count()` |
| RLS | Owner-only: a Clerk user can only read/write their own profile, habits, logs, streaks |

The migration converted every `user_id` column from `uuid` → `text` so Clerk IDs (`user_2abc...`) fit. It also replaced `auth.uid()` with `auth.jwt() ->> 'sub'`, which works for both Clerk and Supabase Auth.

---

## 1. Founder claim — call once after signup

Drop this into your post-signup flow (right after `useProfileSync` succeeds, e.g. in `app/_layout.tsx` or a dedicated post-signup screen).

```ts
// constants/founderClaim.ts
import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useClerkSupabase } from './clerkSupabase';

export type FounderClaimResult =
  | { ok: true;  founder_number: number; already_claimed?: boolean }
  | { ok: false; reason: 'not_authenticated' | 'no_email' | 'not_preregistered' | 'sold_out' };

export function useFounderClaim(): void {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || ranOnce.current) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    ranOnce.current = true;

    supabase
      .rpc('claim_founder', { p_email: email })
      .then(({ data, error }) => {
        if (error || !data) return;
        const r = data as FounderClaimResult;
        if (r.ok && !r.already_claimed) {
          // first time we're seeing them — show a one-time celebration
          // (route to a new screen, fire confetti, whatever you like)
          console.log(`Welcome, founder #${r.founder_number}`);
        }
      });
  }, [isLoaded, isSignedIn, user, supabase]);
}
```

Then call `useFounderClaim()` at the top of `_layout.tsx` next to `useProfileSync()`.

The function is **idempotent** — safe to call on every app open. It only awards a number once, and silently no-ops for users who weren't pre-registered.

---

## 2. Events — fire one line whenever something interesting happens

```ts
// constants/analytics.ts
import { useCallback } from 'react';
import { useClerkSupabase } from './clerkSupabase';

export function useTrack() {
  const supabase = useClerkSupabase();
  return useCallback((name: string, payload: Record<string, unknown> = {}) => {
    // fire-and-forget — never block UI
    supabase.rpc('log_event', {
      p_name:    name,
      p_payload: payload,
      p_anon_id: null,
      p_source:  'app',
    }).then(() => {}, () => {});
  }, [supabase]);
}
```

Then sprinkle it where it matters. Keep names short and stable so you can filter later:

```ts
const track = useTrack();

// Onboarding
track('onboarding_started');
track('onboarding_step', { step: 'pick_jar' });
track('onboarding_completed');

// Activation
track('first_habit_created', { jar_color: 'blue' });
track('first_log');

// Monetization
track('paywall_shown',     { trigger: 'streak_5' });
track('paywall_dismissed', { trigger: 'streak_5' });
track('paywall_purchased', { plan: 'premium', period: 'monthly' });

// Engagement
track('app_open');
track('habit_logged', { habit_id: id, count: 1 });
```

**Don't** put PII in payloads (no emails, no full names). Domain-only is fine if needed.

When `onboarding_completed` fires, also flip the column so `conversion_view` picks it up:

```ts
await supabase.from('profiles')
  .update({ onboarding_done: true })
  .eq('id', user.id);
```

---

## 3. Plan / subscription status

To check if a user has premium:

```ts
const { data } = await supabase.from('profiles')
  .select('plan, plan_started_at, plan_expires_at, is_premium')
  .eq('id', user.id)
  .single();
// data.is_premium is the trigger-maintained boolean — use this for gating
```

To upgrade (after a successful purchase):

```ts
await supabase.from('profiles').update({
  plan: 'premium',
  plan_started_at: new Date().toISOString(),
  plan_expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(), // +30 days
}).eq('id', user.id);
```

The `sync_is_premium` trigger keeps `is_premium` aligned automatically — you never set it directly.

To downgrade (refund or expiry):

```ts
await supabase.from('profiles').update({
  plan: 'free',
  plan_expires_at: null,
}).eq('id', user.id);
```

> **No Stripe/RevenueCat yet.** When you add payments, the webhook handler (or RevenueCat → Supabase function) writes these columns. Don't trust the client to set `plan` directly in production.

---

## 4. Reading analytics (your dashboard for now: SQL editor)

Open Supabase Dashboard → SQL Editor → run any of these.

**Funnel summary**
```sql
select * from public.conversion_view;
```

**Recent signups (with founder status)**
```sql
select id, username, founder_number, plan, onboarding_done, created_at
from public.profiles
order by created_at desc
limit 50;
```

**All pre-registration emails (your list)**
```sql
select email, source, claimed_at, created_at
from public.preregistrations
order by created_at desc;
```

**Onboarding drop-off** — how many users hit each step
```sql
select payload->>'step' as step, count(distinct user_id) as users
from public.events
where name = 'onboarding_step'
  and created_at > now() - interval '30 days'
group by 1 order by 2 desc;
```

**Daily signups**
```sql
select date_trunc('day', created_at)::date as day, count(*) as new_users
from public.profiles
group by 1 order by 1 desc;
```

**Paywall conversion rate by trigger**
```sql
select
  payload->>'trigger' as trigger,
  count(*) filter (where name='paywall_shown')     as shown,
  count(*) filter (where name='paywall_purchased') as purchased,
  round(100.0 *
    count(*) filter (where name='paywall_purchased') /
    nullif(count(*) filter (where name='paywall_shown'), 0), 1) as conversion_pct
from public.events
where name in ('paywall_shown','paywall_purchased')
group by 1
order by shown desc;
```

**Website visitors today**
```sql
select count(distinct anon_id) as unique_visitors
from public.events
where name = 'pageview'
  and source = 'website'
  and created_at > current_date;
```

---

## 5. The events table — keep it clean

`events` will be the biggest table over time. Free tier is 500 MB, you have ~498 MB headroom right now. To stay safe:

**Auto-prune after 90 days** (run this once):
```sql
-- a daily cron via pg_cron extension (Supabase has it on the free tier)
create extension if not exists pg_cron;
select cron.schedule('prune-events', '0 4 * * *',
  $$delete from public.events where created_at < now() - interval '90 days'$$);
```

If you'd rather do this manually for now, just remember to run:
```sql
delete from public.events where created_at < now() - interval '90 days';
```
once a month.

---

## 6. Quick smoke test — confirm it all works end-to-end

After you wire `useFounderClaim` + `useTrack` into the app:

1. Pre-register `your-real@email.com` on the website
2. Sign into the app with that same email (Clerk)
3. Open Supabase → Table Editor → `profiles` — your row should have `founder_number = 1` and `preregistered_at` set
4. Open `preregistrations` — your row should have `claimed_at` and `claimed_by_user_id` filled in
5. Run any event in the app, then `select * from events order by created_at desc limit 10`

If founder_number is null after signup, the most common cause is the email in Clerk doesn't match the email you used on the site (case sensitivity is handled — it's a literal mismatch).

---

## 7. What's not built yet

I deliberately stopped short of:

- **A dashboard UI** — SQL editor is enough until you have 100+ signups. When you want a chart, Supabase has a free dashboards/charts feature in the SDK or use Metabase-cloud free tier.
- **Stripe / RevenueCat** — `plan` columns are ready, but the webhook is your decision when revenue is on the table.
- **Email sending** — Resend wiring is in `supabase/functions/register/` if you ever need it. Not used right now.

When any of those become real, ping me with the trigger ("I'm shipping payments next week") and I'll build the next piece.
