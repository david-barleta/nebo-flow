// =============================================================================
// Settings — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type { DocumentSequence } from "./types";

const supabase = createClient();

export async function fetchDocumentSequences(
  entityId: string
): Promise<DocumentSequence[]> {
  const { data, error } = await supabase
    .from("document_sequences")
    .select("*")
    .eq("entity_id", entityId)
    .order("document_type", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DocumentSequence[];
}

export async function updateDocumentSequence(
  id: string,
  updates: Partial<DocumentSequence>
): Promise<DocumentSequence> {
  const { data, error } = await supabase
    .from("document_sequences")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentSequence;
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
