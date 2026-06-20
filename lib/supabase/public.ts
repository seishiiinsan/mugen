import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Cookieless anon Supabase client for cached, user-agnostic global reads
 * (leaderboards). Unlike the per-request client in `server.ts`, this never
 * touches `cookies()`, so it is safe to use inside `unstable_cache` — which
 * forbids reading cookies. Only call when `isSupabaseConfigured()` is true.
 */
export function createPublicClient() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
