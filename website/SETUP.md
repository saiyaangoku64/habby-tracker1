# Habbby website — setup guide

This site is a static landing page that uses Supabase (database + edge function) and Resend (email) for pre-registration. Total setup time: ~15 minutes. Total cost: $0.

---

## 1. Create a Supabase project

1. Go to https://supabase.com → **Start your project** (free tier)
2. Pick a name (e.g. `habbby`), generate a strong DB password, choose the closest region
3. Wait for the project to spin up (~1 minute)

### Run the schema

1. In the Supabase dashboard, open **SQL Editor → New query**
2. Paste the contents of `supabase/schema.sql` and click **Run**
3. You should see "Success. No rows returned"

### Grab your keys

In **Project Settings → API**, copy:
- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **anon / public key** (the long JWT — safe for the browser)
- **service_role key** (keep this secret — only used by the edge function)

---

## 2. Create a Resend account

1. Go to https://resend.com → sign up (free 3,000 emails/month, 100/day)
2. **API Keys → Create API Key** → copy it
3. While testing, you can send from `onboarding@resend.dev` with no domain verification.
4. When ready for production, add and verify a domain in **Domains** so emails come from `hello@yourdomain.com`

---

## 3. Deploy the edge function

You need the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
brew install supabase/tap/supabase
cd "/Users/devadiga/Documents/habbit tracker/website"
supabase login
supabase link --project-ref <your-project-ref>   # the ref is in the dashboard URL
supabase functions deploy register --no-verify-jwt
```

Then set the function secrets (Dashboard → **Edge Functions → register → Secrets**):

| Key              | Value                                                      |
|------------------|------------------------------------------------------------|
| `RESEND_API_KEY` | (from Resend)                                              |
| `RESEND_FROM`    | `onboarding@resend.dev` while testing, custom domain later |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — don't set them manually.

---

## 4. Wire the frontend

Open `website/config.js` and fill in:

```js
window.HABBBY_CONFIG = {
  SUPABASE_URL:      "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",          // anon/public key
  REGISTER_FN_URL:   null,                     // leave null — auto-derived
};
```

Until you fill these in, the site falls back to localStorage and still works for previews.

---

## 5. Deploy to Vercel

1. Push this repo to GitHub
2. Go to https://vercel.com → **Add New → Project** → import the repo
3. Set **Root Directory** to `website`
4. Click **Deploy**

You'll get a free `*.vercel.app` URL (e.g. `habbby.vercel.app`) — share that.

You don't need a custom domain. Buy one only after you have ~50 signups.

---

## 6. Verify everything works

1. Open the deployed site
2. Submit your own email in the pre-register form
3. Check Resend dashboard → you should see the email sent
4. Check Supabase → **Table Editor → preregistrations** → row exists
5. Reload the site — the live counter (`X people already pre-registered`) should reflect the new total

---

## How user data is structured

| Field         | Notes                                                   |
|---------------|---------------------------------------------------------|
| `email`       | Unique. Re-submissions are silently treated as success. |
| `source`      | `website` for now — set differently for other channels. |
| `user_agent`  | First 256 chars, helps you debug weird signups.         |
| `created_at`  | Timestamp.                                              |

**Privacy:** Row-Level Security is on. The anon key cannot read individual emails — only the count via the `get_prereg_count()` RPC. Your email list stays private; only you (with the service_role key or the dashboard) can see who signed up.

---

## How to see who signed up

- **Dashboard:** Supabase → **Table Editor → preregistrations**
- **CSV export:** click the table → ⋯ → **Export as CSV**
- **SQL:**
  ```sql
  select email, source, created_at
  from preregistrations
  order by created_at desc;
  ```

---

## When you're ready for a custom domain

1. Buy a domain (Namecheap / Porkbun, ~$10/yr)
2. Vercel → Project → **Domains** → add it (DNS instructions appear)
3. Resend → **Domains** → add and verify the same domain (so `hello@yourdomain.com` works)
4. Update `RESEND_FROM` in Supabase secrets to `Habbby <hello@yourdomain.com>`

---

## Costs

- Supabase free tier: 500 MB DB, 50K monthly active users, 500K edge function invocations
- Resend free tier: 3,000 emails/month, 100/day
- Vercel free tier: 100 GB bandwidth/month

You won't hit any of these until you're past 10K signups. Worry about scaling when you get there.
