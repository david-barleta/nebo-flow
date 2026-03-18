"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Stakeholder } from "@/lib/stakeholders/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import {
  fetchStakeholders,
  updateStakeholder,
  deleteStakeholder,
  logAuditEntry,
} from "@/lib/stakeholders/queries";
import StakeholderSearch from "@/components/organization/stakeholders/stakeholder-search";
import StakeholderList from "@/components/organization/stakeholders/stakeholder-list";
import StakeholderFormDrawer from "@/components/organization/stakeholders/stakeholder-form-drawer";
import StakeholderEmptyState from "@/components/organization/stakeholders/stakeholder-empty-state";

const defaultBreadcrumbs = [{ label: "Organization" }, { label: "Clients" }];

export default function ClientsPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { authUser } = useAuth();

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editStakeholder, setEditStakeholder] = useState<Stakeholder | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Page title from entity_labels or default
  const [pageTitle, setPageTitle] = useState("Clients");

  // Fetch custom label
  useEffect(() => {
    if (!authUser) return;
    const supabase = createClient();
    supabase
      .from("entity_labels")
      .select("custom_label")
      .eq("entity_id", authUser.entity.id)
      .eq("entity_key", "clients")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.custom_label) setPageTitle(data.custom_label);
      });
  }, [authUser]);

  useEffect(() => {
    setBreadcrumb(pageTitle, [
      { label: "Organization" },
      { label: pageTitle },
    ]);
  }, [setBreadcrumb, pageTitle]);

  const loadStakeholders = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchStakeholders(
        authUser.entity.id,
        "client",
        showInactive
      );
      setStakeholders(data);
    } catch {
      toast.error("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, [authUser, showInactive]);

  useEffect(() => {
    loadStakeholders();
  }, [loadStakeholders]);

  // Open drawer for create
  const handleAdd = () => {
    setEditStakeholder(null);
    setDrawerOpen(true);
  };

  // Open drawer for edit
  const handleEdit = (s: Stakeholder) => {
    setEditStakeholder(s);
    setDrawerOpen(true);
  };

  // Toggle active/inactive
  const handleToggleActive = (s: Stakeholder) => {
    if (!authUser) return;

    if (s.is_active) {
      // Deactivate
      // TODO: Check for outstanding receivables and show warning
      setConfirmDialog({
        title: "Deactivate Client",
        message: `Deactivate "${getStakeholderDisplayName(s)}"?`,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await updateStakeholder(s.id, { is_active: false });
            await logAuditEntry({
              entity_id: authUser.entity.id,
              user_id: authUser.user.id,
              action: "deactivate",
              entity_type: "stakeholder",
              entity_record_id: s.id,
              old_values: { is_active: true },
              new_values: { is_active: false },
            });
            toast.success(`"${getStakeholderDisplayName(s)}" deactivated.`);
            loadStakeholders();
          } catch {
            toast.error("Failed to deactivate client.");
          }
        },
      });
    } else {
      // Reactivate
      setConfirmDialog({
        title: "Reactivate Client",
        message: `Reactivate "${getStakeholderDisplayName(s)}"?`,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await updateStakeholder(s.id, { is_active: true });
            await logAuditEntry({
              entity_id: authUser.entity.id,
              user_id: authUser.user.id,
              action: "reactivate",
              entity_type: "stakeholder",
              entity_record_id: s.id,
              old_values: { is_active: false },
              new_values: { is_active: true },
            });
            toast.success(`"${getStakeholderDisplayName(s)}" reactivated.`);
            loadStakeholders();
          } catch {
            toast.error("Failed to reactivate client.");
          }
        },
      });
    }
  };

  // Delete stakeholder
  const handleDelete = (s: Stakeholder) => {
    if (!authUser) return;

    // TODO: In production mode (is_setup_mode = false), check sales.stakeholder_id,
    // purchases.stakeholder_id, receipts.stakeholder_id, disbursements.stakeholder_id
    // for references before allowing delete.

    setConfirmDialog({
      title: "Delete Client",
      message: `Permanently delete "${getStakeholderDisplayName(s)}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteStakeholder(s.id);
          await logAuditEntry({
            entity_id: authUser.entity.id,
            user_id: authUser.user.id,
            action: "delete",
            entity_type: "stakeholder",
            entity_record_id: s.id,
            old_values: {
              stakeholder_type: s.stakeholder_type,
              last_name: s.last_name,
              first_name: s.first_name,
              registered_name: s.registered_name,
              is_client: s.is_client,
              is_supplier: s.is_supplier,
            },
            new_values: null,
          });
          toast.success(`"${getStakeholderDisplayName(s)}" deleted.`);
          loadStakeholders();
        } catch {
          toast.error("Failed to delete client.");
        }
      },
    });
  };

  const isEmpty = stakeholders.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          {pageTitle}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <StakeholderSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            showInactive={showInactive}
            onShowInactiveChange={setShowInactive}
            placeholder="Search clients..."
          />

          <button
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && <StakeholderEmptyState mode="client" onAdd={handleAdd} />}

      {/* List */}
      {!loading && !isEmpty && (
        <StakeholderList
          stakeholders={stakeholders}
          mode="client"
          searchQuery={searchQuery}
          showInactive={showInactive}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}

      {/* Form drawer */}
      <StakeholderFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadStakeholders}
        editStakeholder={editStakeholder}
        mode="client"
      />

      {/* Confirmation dialog */}
      {confirmDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {confirmDialog.title}
              </h3>
              <p className="text-sm text-gray-600">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
