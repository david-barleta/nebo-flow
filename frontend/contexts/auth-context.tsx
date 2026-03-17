// =============================================================================
// Auth Context
// =============================================================================
// This React context provides authentication state and actions to the entire app.
//
// How React Context works:
// - A "context" is like a global variable that any component can read without
//   passing props down through every level (called "prop drilling").
// - The AuthProvider wraps the app and provides: session state, user data,
//   and functions like signIn/signOut.
// - Any component can call useAuth() to access these values.
//
// What this context manages:
// 1. Supabase auth session (JWT token, refresh token)
// 2. User profile data from our users table (not Supabase's auth.users)
// 3. Entity and role data associated with the user
// 4. Loading states while checking/refreshing the session
// =============================================================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { AuthUser } from "@/types/database";

// -----------------------------------------------------------------------------
// Type definitions for the context
// -----------------------------------------------------------------------------

interface AuthContextType {
  // State
  session: Session | null;
  authUser: AuthUser | null;
  isLoading: boolean;

  // Actions
  signIn: (
    entityCode: string,
    username: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// Create the context with undefined as default — we'll check for this in useAuth()
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// -----------------------------------------------------------------------------
// Helper: Fetch user profile from our database tables
// -----------------------------------------------------------------------------
// After Supabase Auth confirms who the user is, we need to fetch their
// profile from our own users table (which has entity_id, role_id, etc.)
// along with the related entity and role records.
// -----------------------------------------------------------------------------

async function fetchAuthUser(authUserId: string): Promise<AuthUser | null> {
  const supabase = createClient();

  // Fetch user record that matches this Supabase auth ID
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (userError || !user) return null;

  // Fetch the entity and role in parallel for speed
  const [entityResult, roleResult] = await Promise.all([
    supabase.from("entities").select("*").eq("id", user.entity_id).single(),
    supabase.from("roles").select("*").eq("id", user.role_id).single(),
  ]);

  if (entityResult.error || roleResult.error) return null;

  // Convert snake_case database fields to camelCase TypeScript fields
  return {
    user: {
      id: user.id,
      authUserId: user.auth_user_id,
      entityId: user.entity_id,
      roleId: user.role_id,
      username: user.username,
      fullName: user.full_name,
      isActive: user.is_active,
      mustChangePassword: user.must_change_password,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    entity: {
      id: entityResult.data.id,
      entityCode: entityResult.data.entity_code,
      name: entityResult.data.name,
      address: entityResult.data.address,
      tin: entityResult.data.tin,
      phone: entityResult.data.phone,
      email: entityResult.data.email,
      businessType: entityResult.data.business_type,
      isSetupMode: entityResult.data.is_setup_mode,
      createdAt: entityResult.data.created_at,
      updatedAt: entityResult.data.updated_at,
    },
    role: {
      id: roleResult.data.id,
      entityId: roleResult.data.entity_id,
      name: roleResult.data.name,
      isSystemDefault: roleResult.data.is_system_default,
      canOverrideLockDates: roleResult.data.can_override_lock_dates,
      canApproveTransactions: roleResult.data.can_approve_transactions,
      canViewJournalEntries: roleResult.data.can_view_journal_entries,
      createdAt: roleResult.data.created_at,
      updatedAt: roleResult.data.updated_at,
    },
  };
}

// -----------------------------------------------------------------------------
// AuthProvider Component
// -----------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // On mount: check if there's an existing session (e.g., user refreshed the page)
  // Also listen for auth state changes (login, logout, token refresh)
  useEffect(() => {
    // Get the current session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          const authUser = await fetchAuthUser(session.user.id);
          setAuthUser(authUser);
        }
      })
      .catch((err) => {
        console.error("Failed to get session:", err);
      })
      .finally(() => {
        // ALWAYS set loading to false, even if something fails —
        // otherwise the app stays stuck on "Loading..." forever.
        setIsLoading(false);
      });

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        try {
          const authUser = await fetchAuthUser(session.user.id);
          setAuthUser(authUser);
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setAuthUser(null);
      }
    });

    // Cleanup: unsubscribe when the component unmounts
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // signIn: Authenticate with entity code + username + password
  // ---------------------------------------------------------------------------
  const signIn = useCallback(
    async (entityCode: string, username: string, password: string) => {
      // Construct the internal email Supabase Auth expects
      const email = `${username.toLowerCase()}@${entityCode.toUpperCase()}.neboflow.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: "Invalid credentials. Please try again." };
      }

      // Fetch the user's profile from our database
      const authUser = await fetchAuthUser(data.user.id);

      if (!authUser) {
        await supabase.auth.signOut();
        return { error: "Account not found. Please contact support." };
      }

      // Check if the account is deactivated
      if (!authUser.user.isActive) {
        await supabase.auth.signOut();
        return { error: "Your account has been deactivated. Please contact support." };
      }

      // Update last_login_at
      await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", authUser.user.id);

      setSession(data.session);
      setAuthUser(authUser);

      return { error: null };
    },
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // signOut: Log the user out and clear state
  // ---------------------------------------------------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ session, authUser, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// useAuth Hook
// -----------------------------------------------------------------------------
// Components call useAuth() to access the auth state and actions.
// Throws an error if used outside of AuthProvider (a common React pattern
// to catch mistakes early).
// -----------------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
