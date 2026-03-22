// =============================================================================
// System Account Mappings — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  SystemAccountMapping,
  SystemAccountMappingWithAccount,
  SystemAccountKey,
} from "./system-accounts-types";

const supabase = createClient();

export async function fetchSystemAccountMappings(
  entityId: string
): Promise<SystemAccountMappingWithAccount[]> {
  const { data, error } = await supabase
    .from("system_account_mappings")
    .select(
      `
      *,
      account:accounts (
        id,
        account_code,
        account_name,
        account_type
      )
    `
    )
    .eq("entity_id", entityId);

  if (error) throw error;
  return (data ?? []) as SystemAccountMappingWithAccount[];
}

export async function upsertSystemAccountMapping(
  entityId: string,
  mappingKey: SystemAccountKey,
  accountId: string
): Promise<SystemAccountMapping> {
  // Check if mapping already exists
  const { data: existing } = await supabase
    .from("system_account_mappings")
    .select("id")
    .eq("entity_id", entityId)
    .eq("mapping_key", mappingKey)
    .maybeSingle();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from("system_account_mappings")
      .update({
        account_id: accountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data as SystemAccountMapping;
  } else {
    // Insert
    const { data, error } = await supabase
      .from("system_account_mappings")
      .insert({
        entity_id: entityId,
        mapping_key: mappingKey,
        account_id: accountId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SystemAccountMapping;
  }
}

export async function removeSystemAccountMapping(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("system_account_mappings")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Resolve a system account mapping key to an account ID.
 * Used by transaction modules (sales, purchases, etc.) to find the correct GL account.
 */
export async function resolveSystemAccount(
  entityId: string,
  mappingKey: SystemAccountKey
): Promise<string> {
  const { data, error } = await supabase
    .from("system_account_mappings")
    .select("account_id")
    .eq("entity_id", entityId)
    .eq("mapping_key", mappingKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const labels: Record<string, string> = {
      default_cash: "Default Cash Account",
      accounts_receivable: "Accounts Receivable",
      accounts_payable: "Accounts Payable",
      output_vat: "Output VAT",
      input_vat: "Input VAT",
      creditable_withholding_tax: "Creditable Withholding Tax",
      ewt_payable: "EWT Payable",
    };
    throw new Error(
      `System account "${labels[mappingKey] ?? mappingKey}" is not configured. Go to Settings > System Accounts to set it up.`
    );
  }

  return data.account_id;
}
