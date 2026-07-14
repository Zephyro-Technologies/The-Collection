import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the dashboard. Credentials come from the
// environment (see .env.example) — Vite inlines `VITE_`-prefixed vars at build.
// Only the anon/public key is used in the browser; data is protected by RLS.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Fail loud in dev rather than producing confusing "fetch failed" errors later.
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in your project credentials.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");

/** True when the client has real credentials configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);
