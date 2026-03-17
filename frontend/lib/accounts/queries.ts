// =============================================================================
// Chart of Accounts — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type { Account } from "./types";

const supabase = createClient();

export async function fetchAccounts(entityId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("entity_id", entityId)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data as Account[];
}

export async function createAccount(
  account: Omit<Account, "id" | "created_at" | "updated_at">
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

export async function updateAccount(
  id: string,
  updates: Partial<Account>
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Account;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkInsertAccounts(
  accounts: Omit<Account, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  const { error } = await supabase.from("accounts").insert(accounts);
  if (error) throw error;
}

export async function logAuditEntry(entry: {
  entity_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}): Promise<void> {
  const { error } = await supabase.from("audit_log").insert(entry);
  if (error) console.error("Audit log error:", error);
}
