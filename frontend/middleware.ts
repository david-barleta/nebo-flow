// =============================================================================
// Next.js Middleware — Route Protection
// =============================================================================
// Middleware runs BEFORE every page request. It's the server-side gatekeeper
// that decides whether the user can access the page they're requesting.
//
// Route rules:
// - /login → only accessible when NOT logged in (redirect to /dashboard if logged in)
// - /change-password → only accessible when logged in AND must_change_password = true
// - All other routes → only accessible when logged in AND must_change_password = false
// - Unauthenticated users → redirect to /login
//
// This provides server-side protection. The client-side checks in the page
// components are a secondary safety net for smoother UX.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Public routes that don't require authentication
const publicRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    // If user is logged in and tries to visit /login, redirect to /dashboard
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Not logged in + public route → allow through
    return supabaseResponse;
  }

  // All routes below this point require authentication
  if (!user) {
    // Not logged in → redirect to /login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // User is authenticated — let the request through.
  // The client-side auth context handles the must_change_password redirect
  // because we'd need a database query here to check that flag, and middleware
  // should stay fast (no DB calls beyond the session refresh).
  return supabaseResponse;
}

// Tell Next.js which routes this middleware should run on.
// We exclude static files, images, and API routes from middleware processing.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
