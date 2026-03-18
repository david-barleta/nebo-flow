"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Item, ItemType } from "@/lib/items/types";
import {
  fetchItems,
  updateItem,
  deleteItem,
  countItemUsage,
  logAuditEntry,
} from "@/lib/items/queries";
import ItemSearch from "@/components/organization/items/item-search";
import ItemList from "@/components/organization/items/item-list";
import ItemFormDrawer from "@/components/organization/items/item-form-drawer";
import ItemEmptyState from "@/components/organization/items/item-empty-state";

type StatusFilter = "active" | "inactive" | "all";
type TypeFilter = "all" | ItemType;

const defaultBreadcrumbs = [
  { label: "Organization" },
  { label: "Items & Services" },
];

export default function ItemsPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { authUser } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Page title from entity_labels or default
  const [pageTitle, setPageTitle] = useState("Items & Services");

  // Fetch custom label
  useEffect(() => {
    if (!authUser) return;
    const supabase = createClient();
    supabase
      .from("entity_labels")
      .select("custom_label")
      .eq("entity_id", authUser.entity.id)
      .eq("entity_key", "items")
      .maybeSingle()
      .then(({ data }: { data: { custom_label: string } | null }) => {
        if (data?.custom_label) setPageTitle(data.custom_label);
      });
  }, [authUser]);

  useEffect(() => {
    setBreadcrumb(pageTitle, [
      { label: "Organization" },
      { label: pageTitle },
    ]);
  }, [setBreadcrumb, pageTitle]);

  const loadItems = useCallback(async () => {
    if (!authUser) return;
    try {
      // Always fetch all items; filtering is done client-side
      const data = await fetchItems(authUser.entity.id, true);
      setItems(data);
    } catch {
      toast.error("Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Open drawer for create
  const handleAdd = () => {
    setEditItem(null);
    setDrawerOpen(true);
  };

  // Open drawer for edit
  const handleEdit = (item: Item) => {
    setEditItem(item);
    setDrawerOpen(true);
  };

  // Toggle active/inactive
  const handleToggleActive = async (item: Item) => {
    if (!authUser) return;

    if (item.is_active) {
      // Check usage before deactivating
      try {
        const usageCount = await countItemUsage(item.id);
        const warningMsg =
          usageCount > 0
            ? `This item has been used in ${usageCount} transaction${usageCount === 1 ? "" : "s"}. It will no longer be available for new transactions.\n\nDeactivate "${item.name}"?`
            : `Deactivate "${item.name}"?`;

        setConfirmDialog({
          title: "Deactivate Item",
          message: warningMsg,
          onConfirm: async () => {
            setConfirmDialog(null);
            try {
              await updateItem(item.id, { is_active: false });
              await logAuditEntry({
                entity_id: authUser.entity.id,
                user_id: authUser.user.id,
                action: "deactivate",
                entity_type: "item",
                entity_record_id: item.id,
                old_values: { is_active: true },
                new_values: { is_active: false },
              });
              toast.success(`"${item.name}" deactivated.`);
              loadItems();
            } catch {
              toast.error("Failed to deactivate item.");
            }
          },
        });
      } catch {
        toast.error("Failed to check item usage.");
      }
    } else {
      // Reactivate
      setConfirmDialog({
        title: "Reactivate Item",
        message: `Reactivate "${item.name}"?`,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await updateItem(item.id, { is_active: true });
            await logAuditEntry({
              entity_id: authUser.entity.id,
              user_id: authUser.user.id,
              action: "reactivate",
              entity_type: "item",
              entity_record_id: item.id,
              old_values: { is_active: false },
              new_values: { is_active: true },
            });
            toast.success(`"${item.name}" reactivated.`);
            loadItems();
          } catch {
            toast.error("Failed to reactivate item.");
          }
        },
      });
    }
  };

  // Delete item (setup mode only, unused items)
  const handleDelete = async (item: Item) => {
    if (!authUser) return;

    try {
      const usageCount = await countItemUsage(item.id);
      if (usageCount > 0) {
        toast.error(
          `"${item.name}" has been used in ${usageCount} transaction${usageCount === 1 ? "" : "s"} and cannot be deleted. Deactivate it instead.`
        );
        return;
      }

      setConfirmDialog({
        title: "Delete Item",
        message: `Permanently delete "${item.name}"? This cannot be undone.`,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await deleteItem(item.id);
            await logAuditEntry({
              entity_id: authUser.entity.id,
              user_id: authUser.user.id,
              action: "delete",
              entity_type: "item",
              entity_record_id: item.id,
              old_values: {
                name: item.name,
                item_type: item.item_type,
                default_unit_price: item.default_unit_price,
                default_tax_treatment: item.default_tax_treatment,
              },
              new_values: null,
            });
            toast.success(`"${item.name}" deleted.`);
            loadItems();
          } catch {
            toast.error("Failed to delete item.");
          }
        },
      });
    } catch {
      toast.error("Failed to check item usage.");
    }
  };

  const isSetupMode = authUser?.entity.isSetupMode ?? false;

  const isEmpty = items.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          {pageTitle}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <ItemSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <button
            onClick={handleAdd}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Item
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
      {isEmpty && <ItemEmptyState onAdd={handleAdd} />}

      {/* List */}
      {!loading && !isEmpty && (
        <ItemList
          items={items}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          isSetupMode={isSetupMode}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}

      {/* Form drawer */}
      <ItemFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadItems}
        editItem={editItem}
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
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {confirmDialog.message}
              </p>
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
