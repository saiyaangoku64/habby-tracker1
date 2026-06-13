// ============================================================
// Habbby — register Edge Function
// Inserts a pre-registration row, then sends a confirmation email via Resend.
//
// Deploy:
//   supabase functions deploy register --no-verify-jwt
//
// Required env vars (Supabase Dashboard → Edge Functions → register → Secrets):
//   SUPABASE_URL              (auto-injected)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   RESEND_API_KEY            (from resend.com)
//   RESEND_FROM               e.g.  "Habbby <hello@yourdomain.com>"
//                              or fallback "onboarding@resend.dev" while testing
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_KEY  = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM")    ?? "onboarding@resend.dev";

async function sendConfirmation(email: string, position: number) {
  if (!RESEND_KEY) return; // skip silently if Resend not configured yet
  const html = `
  <div style="font-family:Inter,system-ui,sans-serif;background:#faf7f2;padding:32px;color:#0e0e10">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #ecebe7">
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:800">You're in.</h1>
      <p style="margin:0 0 16px;color:#555">You're <b>#${position}</b> on the Habbby pre-registration list.</p>
      <p style="margin:0 0 16px">When your TestFlight wave opens we'll send the invite to this address. That's the only email you'll get from us until then.</p>
      <p style="margin:0 0 24px">First 1,000 pre-registrants also unlock the <b>Founder's Card</b> on day one.</p>
      <p style="margin:0;font-size:13px;color:#888">— the habbby team</p>
    </div>
  </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    RESEND_FROM,
      to:      [email],
      subject: "You're in — Habbby pre-registration confirmed",
      html,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")   return new Response("method not allowed", { status: 405, headers: CORS });

  let payload: { email?: string; source?: string } = {};
  try { payload = await req.json(); } catch { /* fallthrough */ }

  const email  = (payload.email ?? "").trim().toLowerCase();
  const source = (payload.source ?? "website").slice(0, 32);
  const ua     = req.headers.get("user-agent")?.slice(0, 256) ?? null;

  if (!email || !isEmail(email)) {
    return new Response(JSON.stringify({ error: "invalid_email" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Insert or no-op on duplicate
  const { error } = await supabase
    .from("preregistrations")
    .insert({ email, source, user_agent: ua });

  // unique-violation 23505 means already registered — treat as success
  const isDuplicate = error?.code === "23505";
  if (error && !isDuplicate) {
    return new Response(JSON.stringify({ error: "db_error", detail: error.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Get position (count) for the response + email body
  const { data: countData } = await supabase.rpc("get_prereg_count");
  const position = (countData as number | null) ?? 0;

  if (!isDuplicate) {
    // fire-and-forget; don't block the response on Resend latency
    sendConfirmation(email, position).catch(() => { /* logged in Resend dashboard */ });
  }

  return new Response(JSON.stringify({ ok: true, position, duplicate: isDuplicate }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
});
