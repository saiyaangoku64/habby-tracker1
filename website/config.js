// ============================================================
// Habbby — runtime config
// Anon key is safe to ship to the browser. RLS protects rows.
// ============================================================

window.HABBBY_CONFIG = {
  SUPABASE_URL:      "https://lutetajlxnbuexvwgtqm.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dGV0YWpseG5idWV4dndndHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTM2MjUsImV4cCI6MjA5MzM2OTYyNX0.rv15ceAvQiEwUhk7e08qcZz0BfUsV8DAyHyCpTKIrSg",
};
window.HABBBY_CONFIG.ENABLED = Boolean(
  window.HABBBY_CONFIG.SUPABASE_URL && window.HABBBY_CONFIG.SUPABASE_ANON_KEY
);
