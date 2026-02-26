import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side admin client — uses service role key.
 * No RLS, no auth. Used for all DB operations in this app.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createSupabaseClient(url, key);
}
