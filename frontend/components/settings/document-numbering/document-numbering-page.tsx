"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { DocumentSequence, NumberingMode } from "@/lib/settings/types";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_ORDER,
  previewDocumentNumber,
} from "@/lib/settings/types";
import {
  fetchDocumentSequences,
  updateDocumentSequence,
  logAuditEntry,
} from "@/lib/settings/queries";

interface EditState {
  numbering_mode: NumberingMode;
  prefix: string;
  include_year: boolean;
  next_number: string;
  padding_length: string;
}

export default function DocumentNumberingPage() {
  const { authUser } = useAuth();
  const [sequences, setSequences] = useState<DocumentSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadSequences = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchDocumentSequences(authUser.entity.id);
      setSequences(data);

      // Initialize edit states
      const states: Record<string, EditState> = {};
      for (const seq of data) {
        states[seq.id] = {
          numbering_mode: seq.numbering_mode ?? "auto",
          prefix: seq.prefix,
          include_year: seq.include_year,
          next_number: String(seq.next_number),
          padding_length: String(seq.padding_length),
        };
      }
      setEditStates(states);
    } catch {
      toast.error("Failed to load document sequences.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadSequences();
  }, [loadSequences]);

  const updateField = (id: string, field: keyof EditState, value: string | boolean) => {
    setEditStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const resetRow = (seq: DocumentSequence) => {
    setEditStates((prev) => ({
      ...prev,
      [seq.id]: {
        numbering_mode: seq.numbering_mode ?? "auto",
        prefix: seq.prefix,
        include_year: seq.include_year,
        next_number: String(seq.next_number),
        padding_length: String(seq.padding_length),
      },
    }));
  };

  const hasChanges = (seq: DocumentSequence): boolean => {
    const edit = editStates[seq.id];
    if (!edit) return false;
    return (
      edit.numbering_mode !== (seq.numbering_mode ?? "auto") ||
      edit.prefix !== seq.prefix ||
      edit.include_year !== seq.include_year ||
      edit.next_number !== String(seq.next_number) ||
      edit.padding_length !== String(seq.padding_length)
    );
  };

  const handleSave = async (seq: DocumentSequence) => {
    if (!authUser) return;
    const edit = editStates[seq.id];
    if (!edit) return;

    const nextNum = parseInt(edit.next_number, 10);
    const padLen = parseInt(edit.padding_length, 10);

    if (isNaN(nextNum) || nextNum < 1) {
      toast.error("Next number must be at least 1.");
      return;
    }
    if (isNaN(padLen) || padLen < 1 || padLen > 10) {
      toast.error("Padding length must be between 1 and 10.");
      return;
    }

    setSavingId(seq.id);
    try {
      const oldValues = {
        numbering_mode: seq.numbering_mode ?? "auto",
        prefix: seq.prefix,
        include_year: seq.include_year,
        next_number: seq.next_number,
        padding_length: seq.padding_length,
      };

      const newValues = {
        numbering_mode: edit.numbering_mode,
        prefix: edit.prefix.trim(),
        include_year: edit.include_year,
        next_number: nextNum,
        padding_length: padLen,
      };

      await updateDocumentSequence(seq.id, newValues);

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "edit",
        entity_type: "document_sequence",
        entity_record_id: seq.id,
        old_values: oldValues,
        new_values: newValues,
      });

      toast.success(
        `${DOCUMENT_TYPE_LABELS[seq.document_type]} numbering updated.`
      );
      await loadSequences();
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSavingId(null);
    }
  };

  // Build a preview for a given edit state
  const getPreview = (id: string): string => {
    const edit = editStates[id];
    if (!edit) return "";
    const yearPart = edit.include_year ? new Date().getFullYear().toString() : "";
    const num = parseInt(edit.next_number, 10) || 1;
    const pad = parseInt(edit.padding_length, 10) || 4;
    const numberPart = String(num).padStart(pad, "0");
    const parts = [edit.prefix.trim(), yearPart, numberPart].filter(Boolean);
    return parts.join("-");
  };

  // Order sequences by our defined order
  const orderedSequences = DOCUMENT_TYPE_ORDER.map((dt) =>
    sequences.find((s) => s.document_type === dt)
  ).filter(Boolean) as DocumentSequence[];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (orderedSequences.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white flex items-center justify-center py-20 px-6 text-center">
        <p className="text-gray-500 text-sm">
          No document sequences configured. These are created automatically when
          your entity is set up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Configure how document numbers are generated for each transaction type.
        Choose <strong>Auto</strong> to let the system generate numbers
        sequentially, or <strong>Manual</strong> to enter numbers yourself on
        each transaction.
      </p>

      <div className="space-y-4">
        {orderedSequences.map((seq) => {
          const edit = editStates[seq.id];
          if (!edit) return null;
          const changed = hasChanges(seq);
          const isSaving = savingId === seq.id;

          return (
            <div
              key={seq.id}
              className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
            >
              {/* Title row */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {DOCUMENT_TYPE_LABELS[seq.document_type]}
                </h3>
                <div className="flex items-center gap-2">
                  {changed && (
                    <>
                      <button
                        onClick={() => resetRow(seq)}
                        disabled={isSaving}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Reset
                      </button>
                      <button
                        onClick={() => handleSave(seq)}
                        disabled={isSaving}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-1"
                      >
                        <Save size={12} />
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Mode toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Numbering Mode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField(seq.id, "numbering_mode", "auto")}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      edit.numbering_mode === "auto"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField(seq.id, "numbering_mode", "manual")}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      edit.numbering_mode === "manual"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {/* Auto settings */}
              {edit.numbering_mode === "auto" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={edit.prefix}
                      onChange={(e) =>
                        updateField(seq.id, "prefix", e.target.value)
                      }
                      maxLength={20}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. SI"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Next Number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={edit.next_number}
                      onChange={(e) =>
                        updateField(seq.id, "next_number", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Padding
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={edit.padding_length}
                      onChange={(e) =>
                        updateField(seq.id, "padding_length", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Include Year
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateField(seq.id, "include_year", !edit.include_year)
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-medium w-full transition-colors ${
                        edit.include_year
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {edit.include_year ? "Yes" : "No"}
                    </button>
                  </div>
                </div>
              )}

              {/* Manual mode note */}
              {edit.numbering_mode === "manual" && (
                <p className="text-xs text-gray-500">
                  Users will enter the document number manually on each
                  transaction (e.g., from a BIR-registered booklet).
                </p>
              )}

              {/* Preview */}
              {edit.numbering_mode === "auto" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <span className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded">
                    {getPreview(seq.id)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
