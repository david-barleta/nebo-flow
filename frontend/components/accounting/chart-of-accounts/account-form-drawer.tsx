"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import type { Account, AccountType } from "@/lib/accounts/types";
import { ACCOUNT_SUB_TYPES, deriveNormalBalance } from "@/lib/accounts/types";
import { createAccount, updateAccount, logAuditEntry } from "@/lib/accounts/queries";

interface AccountFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  editAccount: Account | null; // null = create mode
  allAccounts: Account[];
  defaultIsHeader?: boolean;
}

export default function AccountFormDrawer({
  open,
  onClose,
  onSaved,
  editAccount,
  allAccounts,
  defaultIsHeader = false,
}: AccountFormDrawerProps) {
  const { authUser } = useAuth();
  const isEditMode = editAccount !== null;

  // Form state
  const [accountType, setAccountType] = useState<AccountType>("asset");
  const [isHeader, setIsHeader] = useState(defaultIsHeader);
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [subType, setSubType] = useState("");
  const [parentAccountId, setParentAccountId] = useState<string>("");
  const [isContra, setIsContra] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState("");

  // Reset form when opening
  useEffect(() => {
    if (!open) return;

    setSaving(false);

    if (editAccount) {
      setAccountType(editAccount.account_type);
      setIsHeader(editAccount.is_header);
      setAccountCode(editAccount.account_code || "");
      setAccountName(editAccount.account_name);
      setSubType(editAccount.account_sub_type || "");
      setParentAccountId(editAccount.parent_account_id || "");
      setIsContra(editAccount.is_contra);
      setDescription(editAccount.description || "");
    } else {
      setAccountType("asset");
      setIsHeader(defaultIsHeader);
      setAccountCode("");
      setAccountName("");
      setSubType("");
      setParentAccountId("");
      setIsContra(false);
      setDescription("");
    }
    setCodeError("");
  }, [open, editAccount, defaultIsHeader]);

  // Available parent headers: same type + sub-type, only headers
  const availableParents = allAccounts.filter(
    (a) =>
      a.is_header &&
      a.is_active &&
      a.account_type === accountType &&
      (!subType || a.account_sub_type === subType) &&
      a.id !== editAccount?.id
  );

  // Suggest next account code
  const suggestNextCode = (): string => {
    const codesInType = allAccounts
      .filter((a) => a.account_type === accountType && a.account_code)
      .map((a) => parseInt(a.account_code!, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    if (codesInType.length === 0) {
      const prefixes: Record<AccountType, number> = {
        asset: 100,
        liability: 200,
        equity: 300,
        revenue: 400,
        expense: 500,
      };
      return String(prefixes[accountType] + 1);
    }
    return String(codesInType[codesInType.length - 1] + 1);
  };

  // Auto-suggest code when type changes (create mode only, detail accounts)
  useEffect(() => {
    if (!isEditMode && !isHeader && open) {
      setAccountCode(suggestNextCode());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, isHeader, open]);

  const normalBalance = deriveNormalBalance(accountType, isContra);

  const handleSave = async () => {
    if (!authUser) return;

    // Validate
    if (!accountName.trim()) {
      toast.error("Account name is required.");
      return;
    }

    if (!isHeader && !accountCode.trim()) {
      toast.error("Account code is required for detail accounts.");
      return;
    }

    // Check code uniqueness (detail accounts only, create or if code somehow differs)
    if (!isHeader) {
      const duplicate = allAccounts.find(
        (a) =>
          a.account_code === accountCode.trim() &&
          a.id !== editAccount?.id
      );
      if (duplicate) {
        setCodeError(`Account code ${accountCode} already exists.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const oldValues = {
          account_name: editAccount!.account_name,
          account_sub_type: editAccount!.account_sub_type,
          parent_account_id: editAccount!.parent_account_id,
          description: editAccount!.description,
        };

        await updateAccount(editAccount!.id, {
          account_name: accountName.trim(),
          account_sub_type: subType || null,
          parent_account_id: parentAccountId || null,
          description: description.trim() || null,
        });

        await logAuditEntry({
          entity_id: authUser.entity.id,
          user_id: authUser.user.id,
          action: "edit",
          entity_type: "account",
          entity_record_id: editAccount!.id,
          old_values: oldValues,
          new_values: {
            account_name: accountName.trim(),
            account_sub_type: subType || null,
            parent_account_id: parentAccountId || null,
            description: description.trim() || null,
          },
        });

        toast.success(`Account "${accountName.trim()}" updated.`);
      } else {
        const newAccount = await createAccount({
          entity_id: authUser.entity.id,
          account_code: isHeader ? null : accountCode.trim(),
          account_name: accountName.trim(),
          account_type: accountType,
          account_sub_type: subType || null,
          description: description.trim() || null,
          normal_balance: normalBalance,
          is_header: isHeader,
          is_contra: isContra,
          is_active: true,
          is_system_account: false,
          parent_account_id: parentAccountId || null,
          display_order: 0,
        });

        const label = isHeader
          ? accountName.trim()
          : `${accountCode.trim()} - ${accountName.trim()}`;

        await logAuditEntry({
          entity_id: authUser.entity.id,
          user_id: authUser.user.id,
          action: "create",
          entity_type: "account",
          entity_record_id: newAccount.id,
          old_values: null,
          new_values: {
            account_code: isHeader ? null : accountCode.trim(),
            account_name: accountName.trim(),
            account_type: accountType,
            account_sub_type: subType || null,
            is_header: isHeader,
            is_contra: isContra,
          },
        });

        toast.success(`Account "${label}" created.`);
      }

      await onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? "Edit Account" : isHeader ? "Add Group" : "Add Account"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as AccountType);
                setSubType("");
                setParentAccountId("");
              }}
              disabled={isEditMode}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
            {isEditMode && (
              <p className="text-xs text-gray-400 mt-1">
                Account type cannot be changed after creation.
              </p>
            )}
          </div>

          {/* Is Grouping Header */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Is Grouping Header
              </label>
              <p className="text-xs text-gray-400">
                Group headers organize accounts but cannot be posted to.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isHeader}
              disabled={isEditMode}
              onClick={() => setIsHeader(!isHeader)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                isHeader ? "bg-blue-600" : "bg-gray-200"
              } ${isEditMode ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isHeader ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Account Code (detail only) */}
          {!isHeader && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Code
              </label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => {
                  setAccountCode(e.target.value);
                  setCodeError("");
                }}
                disabled={isEditMode}
                maxLength={20}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500 ${
                  codeError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="e.g., 101"
              />
              {codeError && (
                <p className="text-xs text-red-500 mt-1">{codeError}</p>
              )}
              {isEditMode && (
                <p className="text-xs text-gray-400 mt-1">
                  Account codes cannot be changed after creation.
                </p>
              )}
            </div>
          )}

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Cash on Hand"
            />
          </div>

          {/* Sub-Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-Type
            </label>
            <select
              value={subType}
              onChange={(e) => {
                setSubType(e.target.value);
                setParentAccountId("");
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              {ACCOUNT_SUB_TYPES[accountType].map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Parent Account (detail accounts only, when sub-type is selected) */}
          {!isHeader && availableParents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Group
              </label>
              <select
                value={parentAccountId}
                onChange={(e) => setParentAccountId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— No parent group —</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.account_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Is Contra-Account */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Is Contra-Account
              </label>
              <p className="text-xs text-gray-400">
                Contra-accounts have the opposite normal balance (e.g.,
                Accumulated Depreciation is an asset with a credit balance).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isContra}
              disabled={isEditMode}
              onClick={() => setIsContra(!isContra)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                isContra ? "bg-blue-600" : "bg-gray-200"
              } ${isEditMode ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  isContra ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Normal Balance (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Normal Balance
            </label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 capitalize">
              {normalBalance}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Optional notes about this account's purpose"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
          >
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </>
  );
}
