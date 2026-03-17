// =============================================================================
// Supabase Server Client
// =============================================================================
// Used in server components, server actions, and route handlers.
// This client runs on the server (not in the browser) and needs access to
// cookies to read/write the user's session. Next.js provides a cookies()
// function for this, but it's async in the App Router.
//
// Why a server client? Server components can fetch data before sending HTML
// to the browser, which is faster and more secure (no loading spinners,
// no exposed API calls in the browser's network tab).
// =============================================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component where cookies can't
            // be set. This is safe to ignore — the middleware will refresh
            // the session on the next request.
          }
        },
      },
    }
  );
}
