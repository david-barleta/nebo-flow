// =============================================================================
// Items / Products & Services — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type { Item } from "./types";

const supabase = createClient();

export async function fetchItems(
  entityId: string,
  includeInactive: boolean
): Promise<Item[]> {
  let query = supabase
    .from("items")
    .select("*")
    .eq("entity_id", entityId)
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Item[];
}

export async function createItem(
  item: Omit<Item, "id" | "created_at" | "updated_at">
): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function updateItem(
  id: string,
  updates: Partial<Item>
): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

/**
 * Count how many transaction lines reference this item.
 * Used to show a warning before deactivation.
 */
export async function countItemUsage(itemId: string): Promise<number> {
  const [sales, purchases, recurring] = await Promise.all([
    supabase
      .from("sale_lines")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId),
    supabase
      .from("purchase_lines")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId),
    supabase
      .from("recurring_template_lines")
      .select("id", { count: "exact", head: true })
      .eq("item_id", itemId),
  ]);

  return (sales.count ?? 0) + (purchases.count ?? 0) + (recurring.count ?? 0);
}

/**
 * Check if an item name already exists for this entity (case-insensitive).
 * Optionally exclude a specific item ID (for edit mode).
 */
export async function isItemNameTaken(
  entityId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from("items")
    .select("id")
    .eq("entity_id", entityId)
    .ilike("name", name.trim());

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
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
