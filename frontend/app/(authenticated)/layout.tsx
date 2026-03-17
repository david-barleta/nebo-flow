// =============================================================================
// Authenticated Layout
// =============================================================================
// This layout wraps all pages that require authentication (dashboard, etc.).
//
// Next.js "route groups" use parentheses in folder names — (authenticated) —
// which means the folder name does NOT appear in the URL. So:
//   app/(authenticated)/dashboard/page.tsx → URL is just /dashboard
//
// This layout wraps those pages with the AppShell (sidebar + top nav)
// and checks that the user is logged in before rendering.
// =============================================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import AppShell from "@/components/layout/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, authUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!session || !authUser)) {
      router.push("/login");
    }
  }, [isLoading, session, authUser, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session || !authUser) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
