// =============================================================================
// Supabase Middleware Client
// =============================================================================
// Used in Next.js middleware (middleware.ts at the app root) to refresh the
// user's session on every request. Without this, the session cookie would
// expire and the user would be logged out unexpectedly.
//
// Middleware runs BEFORE every page load, so this is the perfect place to:
// 1. Refresh the auth session (extend expiry)
// 2. Read the session to decide if the user can access the requested page
// =============================================================================

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  // Start with a default response that continues to the requested page
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on both the request (for downstream middleware/pages)
          // and the response (so they get sent back to the browser)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this extends the cookie expiry so the user stays
  // logged in. IMPORTANT: don't remove this even if you don't need the user
  // object here, because getUser() triggers the session refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, supabaseResponse };
}
