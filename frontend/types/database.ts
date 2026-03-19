// =============================================================================
// Database Types
// =============================================================================
// TypeScript interfaces that mirror the database tables.
// These use camelCase (TypeScript convention) — the Supabase client
// automatically converts from the database's snake_case.
//
// We only define the fields we actually use in the frontend.
// The full schema lives in CLAUDE.md at the project root.
// =============================================================================

export interface Entity {
  id: string;
  entityCode: string;
  registeredName: string;
  tradeName: string | null;
  address: string | null;
  tin: string | null;
  phone: string | null;
  email: string | null;
  businessType: "sole_proprietor" | "partnership" | "corporation";
  isSetupMode: boolean;
  defaultCashSaleNoCustomer: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  entityId: string;
  name: string;
  isSystemDefault: boolean;
  canOverrideLockDates: boolean;
  canApproveTransactions: boolean;
  canViewJournalEntries: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  authUserId: string | null;
  entityId: string;
  roleId: string;
  username: string;
  fullName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// The combined user data we load after login — includes the related entity and role
export interface AuthUser {
  user: User;
  entity: Entity;
  role: Role;
}
