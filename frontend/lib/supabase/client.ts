// =============================================================================
// Supabase Browser Client
// =============================================================================
// Used in client components ("use client") to talk to Supabase from the browser.
// This client runs in the user's browser and uses the ANON key, which is safe
// to expose publicly — Row Level Security (RLS) on the database ensures users
// can only access their own entity's data.
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
