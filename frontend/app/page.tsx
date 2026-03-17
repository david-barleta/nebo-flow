// =============================================================================
// Root Page — /
// =============================================================================
// The root URL (/) just redirects to /login. The middleware will then redirect
// to /dashboard if the user is already logged in.
//
// We use Next.js's built-in redirect() function, which performs a server-side
// redirect (HTTP 307) before the page even renders.
// =============================================================================

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
