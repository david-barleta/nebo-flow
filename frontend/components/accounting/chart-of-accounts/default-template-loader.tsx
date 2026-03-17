"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { buildDefaultChartRows } from "@/lib/accounts/default-chart";
import { logAuditEntry } from "@/lib/accounts/queries";

interface DefaultTemplateLoaderProps {
  onLoaded: () => void;
  prominent?: boolean; // true for empty-state large button
}

export default function DefaultTemplateLoader({
  onLoaded,
  prominent = false,
}: DefaultTemplateLoaderProps) {
  const { authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLoad = async () => {
    if (!authUser) return;
    setShowConfirm(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const entityId = authUser.entity.id;
      const { headers, details } = buildDefaultChartRows(entityId);

      // Step 1: Insert headers (strip internal _ref field)
      const headerInserts = headers.map(({ _ref, ...rest }) => rest);
      const { data: insertedHeaders, error: hErr } = await supabase
        .from("accounts")
        .insert(headerInserts)
        .select("id, account_name");

      if (hErr) throw hErr;

      // Build ref → id map from inserted headers
      const refToId: Record<string, string> = {};
      if (insertedHeaders) {
        // Match by name since insertion order is preserved
        headers.forEach((h, i) => {
          refToId[h._ref] = insertedHeaders[i].id;
        });
      }

      // Step 2: Insert details with parent_account_id resolved
      const detailInserts = details.map(({ _ref, _parentRef, ...rest }) => ({
        ...rest,
        parent_account_id: _parentRef ? refToId[_parentRef] || null : null,
      }));

      const { error: dErr } = await supabase
        .from("accounts")
        .insert(detailInserts);

      if (dErr) throw dErr;

      await logAuditEntry({
        entity_id: entityId,
        user_id: authUser.user.id,
        action: "create",
        entity_type: "account",
        entity_record_id: null,
        old_values: null,
        new_values: { action: "load_default_template", count: headers.length + details.length },
      });

      toast.success("Default Philippine chart of accounts loaded successfully.");
      onLoaded();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={
          prominent
            ? "rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 flex items-center gap-2"
            : "rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        }
      >
        <Download size={16} />
        {loading ? "Loading..." : "Load Default Template"}
      </button>

      {/* Confirmation dialog */}
      {showConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setShowConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Load Default Template
              </h3>
              <p className="text-sm text-gray-600">
                This will create the standard Philippine chart of accounts. You
                can customize it afterwards. Continue?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLoad}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
