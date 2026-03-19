// =============================================================================
// Bank Accounts — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type { BankAccount, BankAccountWithGLAccount } from "./bank-accounts-types";

const supabase = createClient();

export async function fetchBankAccounts(
  entityId: string,
  includeInactive = false
): Promise<BankAccountWithGLAccount[]> {
  let query = supabase
    .from("bank_accounts")
    .select(
      `
      *,
      account:accounts (
        id,
        account_code,
        account_name
      )
    `
    )
    .eq("entity_id", entityId)
    .order("bank_name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BankAccountWithGLAccount[];
}

export async function createBankAccount(
  input: Omit<BankAccount, "id" | "created_at" | "updated_at">
): Promise<BankAccount> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as BankAccount;
}

export async function updateBankAccount(
  id: string,
  updates: Partial<BankAccount>
): Promise<BankAccount> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as BankAccount;
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
