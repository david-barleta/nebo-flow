// =============================================================================
// Login Page — /login
// =============================================================================
// Public page (no auth required). Shows the Nebo Flow branding on the left
// and the login form on the right, inspired by the UI reference image.
//
// This is a client component because it uses the auth context to check if
// the user is already logged in (and redirect them to /dashboard if so).
// =============================================================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const { session, authUser, isLoading } = useAuth();

  // If user is already logged in, redirect them away from the login page
  useEffect(() => {
    if (!isLoading && session && authUser) {
      router.push("/dashboard");
    }
  }, [isLoading, session, authUser, router]);

  // Show nothing while checking auth state (prevents flash of login form)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Don't render the login page if user is already authenticated
  if (session && authUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-gray-900 to-blue-950 flex-col justify-between p-12 text-white">
        {/* Logo */}
        <div>
          <h2 className="text-2xl font-bold tracking-wider">NEBO FLOW</h2>
        </div>

        {/* Tagline */}
        <div>
          <h1 className="text-4xl font-light leading-tight">
            Welcome.
            <br />
            Your accounting,
            <br />
            simplified.
          </h1>
        </div>

        {/* Spacer to push tagline to center-bottom area */}
        <div />
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <LoginForm />
      </div>
    </div>
  );
}
