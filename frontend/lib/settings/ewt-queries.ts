// =============================================================================
// Expanded Withholding Tax (EWT) Rates — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type { EwtRate } from "./ewt-types";

const supabase = createClient();

export async function fetchEwtRates(
  entityId: string,
  includeInactive = false
): Promise<EwtRate[]> {
  let query = supabase
    .from("withholding_tax_rates")
    .select("*")
    .eq("entity_id", entityId)
    .order("category_name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EwtRate[];
}

export async function createEwtRate(
  input: Omit<EwtRate, "id" | "created_at" | "updated_at">
): Promise<EwtRate> {
  const { data, error } = await supabase
    .from("withholding_tax_rates")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as EwtRate;
}

export async function updateEwtRate(
  id: string,
  updates: Partial<EwtRate>
): Promise<EwtRate> {
  const { data, error } = await supabase
    .from("withholding_tax_rates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as EwtRate;
}

export async function deleteEwtRate(id: string): Promise<void> {
  const { error } = await supabase
    .from("withholding_tax_rates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
