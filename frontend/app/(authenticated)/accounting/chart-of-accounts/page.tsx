"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useAuth } from "@/contexts/auth-context";
import type { Account } from "@/lib/accounts/types";
import { buildAccountTree } from "@/lib/accounts/tree-builder";
import { filterAccountTree } from "@/lib/accounts/tree-builder";
import { fetchAccounts, updateAccount, deleteAccount, logAuditEntry } from "@/lib/accounts/queries";
import AccountsTree from "@/components/accounting/chart-of-accounts/accounts-tree";
import AccountSearch from "@/components/accounting/chart-of-accounts/account-search";
import AccountFormDrawer from "@/components/accounting/chart-of-accounts/account-form-drawer";
import DefaultTemplateLoader from "@/components/accounting/chart-of-accounts/default-template-loader";

const breadcrumbs = [{ label: "Accounting" }, { label: "Chart of Accounts" }];

export default function ChartOfAccountsPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const { authUser } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [defaultIsHeader, setDefaultIsHeader] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    setBreadcrumb("Chart of Accounts", breadcrumbs);
  }, [setBreadcrumb]);

  const loadAccounts = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchAccounts(authUser.entity.id);
      setAccounts(data);
    } catch {
      toast.error("Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Build and filter tree
  const fullTree = buildAccountTree(accounts);
  const filteredTree = filterAccountTree(fullTree, searchQuery);

  // Open drawer for create
  const handleAddAccount = () => {
    setEditAccount(null);
    setDefaultIsHeader(false);
    setDrawerOpen(true);
  };

  const handleAddGroup = () => {
    setEditAccount(null);
    setDefaultIsHeader(true);
    setDrawerOpen(true);
  };

  // Open drawer for edit
  const handleEdit = (account: Account) => {
    setEditAccount(account);
    setDefaultIsHeader(account.is_header);
    setDrawerOpen(true);
  };

  // Toggle active/inactive
  const handleToggleActive = (account: Account) => {
    if (!authUser) return;

    if (account.is_active) {
      // Deactivating
      // TODO: Check for non-zero balance and block if so
      const childAccounts = accounts.filter(
        (a) => a.parent_account_id === account.id && a.is_active
      );
      const hasActiveChildren = account.is_header && childAccounts.length > 0;

      const message = hasActiveChildren
        ? `This group has ${childAccounts.length} active account${childAccounts.length > 1 ? "s" : ""} under it. Deactivating the group will also deactivate all child accounts. Continue?`
        : `Deactivate "${account.account_code ? account.account_code + " - " : ""}${account.account_name}"?`;

      setConfirmDialog({
        title: "Deactivate Account",
        message,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await updateAccount(account.id, { is_active: false });
            if (hasActiveChildren) {
              for (const child of childAccounts) {
                await updateAccount(child.id, { is_active: false });
              }
            }
            await logAuditEntry({
              entity_id: authUser.entity.id,
              user_id: authUser.user.id,
              action: "deactivate",
              entity_type: "account",
              entity_record_id: account.id,
              old_values: { is_active: true },
              new_values: { is_active: false },
            });
            toast.success(`"${account.account_name}" deactivated.`);
            loadAccounts();
          } catch {
            toast.error("Failed to deactivate account.");
          }
        },
      });
    } else {
      // Reactivating
      const parentHeader =
        account.parent_account_id
          ? accounts.find((a) => a.id === account.parent_account_id)
          : null;
      const parentInactive = parentHeader && !parentHeader.is_active;

      const message = parentInactive
        ? `The parent group "${parentHeader.account_name}" is also inactive. Reactivate it too?`
        : `Reactivate "${account.account_name}"?`;

      setConfirmDialog({
        title: "Reactivate Account",
        message,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await updateAccount(account.id, { is_active: true });
            if (parentInactive && parentHeader) {
              await updateAccount(parentHeader.id, { is_active: true });
            }
            await logAuditEntry({
              entity_id: authUser.entity.id,
              user_id: authUser.user.id,
              action: "reactivate",
              entity_type: "account",
              entity_record_id: account.id,
              old_values: { is_active: false },
              new_values: { is_active: true },
            });
            toast.success(`"${account.account_name}" reactivated.`);
            loadAccounts();
          } catch {
            toast.error("Failed to reactivate account.");
          }
        },
      });
    }
  };

  // Delete account
  const handleDelete = (account: Account) => {
    if (!authUser) return;

    // Block header deletion if it has children
    if (account.is_header) {
      const children = accounts.filter(
        (a) => a.parent_account_id === account.id
      );
      if (children.length > 0) {
        toast.error(
          "Remove or move child accounts before deleting this group."
        );
        return;
      }
    }

    // TODO: Check journal_entry_lines for references before allowing delete
    // TODO: When entity.is_setup_mode = true, deletion is always allowed

    setConfirmDialog({
      title: "Delete Account",
      message: `Permanently delete "${account.account_code ? account.account_code + " - " : ""}${account.account_name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteAccount(account.id);
          await logAuditEntry({
            entity_id: authUser.entity.id,
            user_id: authUser.user.id,
            action: "delete",
            entity_type: "account",
            entity_record_id: account.id,
            old_values: {
              account_code: account.account_code,
              account_name: account.account_name,
              account_type: account.account_type,
            },
            new_values: null,
          });
          toast.success(`"${account.account_name}" deleted.`);
          loadAccounts();
        } catch {
          toast.error("Failed to delete account.");
        }
      },
    });
  };

  const isEmpty = accounts.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          Chart of Accounts
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <AccountSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            showInactive={showInactive}
            onShowInactiveChange={setShowInactive}
          />

          {isEmpty && (
            <DefaultTemplateLoader onLoaded={loadAccounts} />
          )}

          <button
            onClick={handleAddGroup}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <FolderPlus size={16} />
            Add Group
          </button>

          <button
            onClick={handleAddAccount}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Account
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
      {isEmpty && (
        <div className="rounded-xl border border-gray-200 bg-white flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-gray-500 text-sm mb-4">
            No accounts yet. Load the default Philippine chart of accounts to
            get started.
          </p>
          <DefaultTemplateLoader onLoaded={loadAccounts} prominent />
        </div>
      )}

      {/* Tree view */}
      {!loading && !isEmpty && (
        <>
          {filteredTree.length === 0 && searchQuery ? (
            <div className="rounded-xl border border-gray-200 bg-white flex items-center justify-center py-16">
              <p className="text-gray-400 text-sm">
                No accounts match &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          ) : (
            <AccountsTree
              tree={filteredTree}
              showInactive={showInactive}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      {/* Form drawer */}
      <AccountFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadAccounts}
        editAccount={editAccount}
        allAccounts={accounts}
        defaultIsHeader={defaultIsHeader}
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
