// =============================================================================
// Stakeholders — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type { Stakeholder } from "./types";

const supabase = createClient();

export async function fetchStakeholders(
  entityId: string,
  filter: "client" | "supplier",
  includeInactive: boolean
): Promise<Stakeholder[]> {
  let query = supabase
    .from("stakeholders")
    .select("*")
    .eq("entity_id", entityId)
    .eq(filter === "client" ? "is_client" : "is_supplier", true)
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("registered_name", { ascending: true, nullsFirst: false });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Stakeholder[];
}

export async function createStakeholder(
  stakeholder: Omit<Stakeholder, "id" | "created_at" | "updated_at">
): Promise<Stakeholder> {
  const { data, error } = await supabase
    .from("stakeholders")
    .insert(stakeholder)
    .select()
    .single();

  if (error) throw error;
  return data as Stakeholder;
}

export async function updateStakeholder(
  id: string,
  updates: Partial<Stakeholder>
): Promise<Stakeholder> {
  const { data, error } = await supabase
    .from("stakeholders")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Stakeholder;
}

export async function deleteStakeholder(id: string): Promise<void> {
  const { error } = await supabase.from("stakeholders").delete().eq("id", id);
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
