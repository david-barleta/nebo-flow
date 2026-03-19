// =============================================================================
// Bank Accounts — TypeScript Types
// =============================================================================

export interface BankAccount {
  id: string;
  entity_id: string;
  account_id: string;
  bank_name: string;
  account_number: string | null;
  branch: string | null;
  account_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountWithGLAccount extends BankAccount {
  account?: {
    id: string;
    account_code: string | null;
    account_name: string;
  } | null;
}

export const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
] as const;

export function getBankAccountDisplay(bank: BankAccount): string {
  if (bank.account_number) {
    return `${bank.bank_name} — ${bank.account_number}`;
  }
  return bank.bank_name;
}
