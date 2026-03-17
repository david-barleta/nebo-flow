// =============================================================================
// Chart of Accounts — TypeScript Types
// =============================================================================

export interface Account {
  id: string;
  entity_id: string;
  account_code: string | null;
  account_name: string;
  account_type: AccountType;
  account_sub_type: string | null;
  description: string | null;
  normal_balance: "debit" | "credit";
  is_header: boolean;
  is_contra: boolean;
  is_active: boolean;
  is_system_account: boolean;
  parent_account_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

// The fixed order for rendering account types
export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
];

// Display labels for account types
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

// Subtle background colors per account type (very light tints)
export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  asset: "bg-blue-50 text-blue-900",
  liability: "bg-red-50 text-red-900",
  equity: "bg-green-50 text-green-900",
  revenue: "bg-purple-50 text-purple-900",
  expense: "bg-orange-50 text-orange-900",
};

// Sub-type options per account type
export const ACCOUNT_SUB_TYPES: Record<AccountType, string[]> = {
  asset: ["Current Asset", "Non-Current Asset", "Fixed Asset", "Other Asset"],
  liability: ["Current Liability", "Non-Current Liability", "Other Liability"],
  equity: ["Owner's Equity", "Retained Earnings", "Drawing/Dividends", "Capital Stock", "Other Equity"],
  revenue: ["Operating Revenue", "Non-Operating Revenue", "Other Revenue"],
  expense: ["Cost of Sales", "Operating Expense", "Non-Operating Expense", "Other Expense"],
};

// Derive normal balance from type and contra flag
export function deriveNormalBalance(
  accountType: AccountType,
  isContra: boolean
): "debit" | "credit" {
  const defaultDebit = accountType === "asset" || accountType === "expense";
  if (isContra) return defaultDebit ? "credit" : "debit";
  return defaultDebit ? "debit" : "credit";
}

// ---------- Tree structures ----------

export interface AccountTreeNode {
  account: Account;
  children: AccountTreeNode[];
}

export interface SubTypeGroup {
  subType: string;
  headers: AccountTreeNode[];
  standaloneAccounts: Account[];
}

export interface TypeGroup {
  type: AccountType;
  subTypes: SubTypeGroup[];
}
