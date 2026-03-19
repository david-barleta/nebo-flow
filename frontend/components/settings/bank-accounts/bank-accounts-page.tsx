"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { fetchAccounts } from "@/lib/accounts/queries";
import type { Account } from "@/lib/accounts/types";
import type { BankAccountWithGLAccount } from "@/lib/settings/bank-accounts-types";
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  getBankAccountDisplay,
} from "@/lib/settings/bank-accounts-types";
import {
  fetchBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "@/lib/settings/bank-accounts-queries";
import { logAuditEntry } from "@/lib/settings/queries";

export default function BankAccountsPage() {
  const { authUser } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithGLAccount[]>(
    []
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!authUser) return;
    try {
      const [banks, accts] = await Promise.all([
        fetchBankAccounts(authUser.entity.id, true),
        fetchAccounts(authUser.entity.id),
      ]);
      setBankAccounts(banks);
      setAccounts(accts);
    } catch {
      toast.error("Failed to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (bank: BankAccountWithGLAccount) => {
    if (!authUser) return;
    if (!confirm(`Delete "${getBankAccountDisplay(bank)}"?`)) return;

    try {
      await deleteBankAccount(bank.id);
      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "delete",
        entity_type: "bank_account",
        entity_record_id: bank.id,
        old_values: { bank_name: bank.bank_name, account_number: bank.account_number },
        new_values: null,
      });
      toast.success("Bank account deleted.");
      loadData();
    } catch {
      toast.error("Failed to delete bank account.");
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingId(null);
    loadData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const editingBank =
    editingId ? bankAccounts.find((b) => b.id === editingId) ?? null : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Manage bank accounts used for check and bank transfer payments. Each
          bank account is linked to a general ledger account from your chart of
          accounts.
        </p>
        {!showForm && (
          <button
            onClick={handleAdd}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} />
            Add Bank Account
          </button>
        )}
      </div>

      {showForm && (
        <BankAccountForm
          accounts={accounts}
          editingBank={editingBank}
          entityId={authUser?.entity.id ?? ""}
          userId={authUser?.user.id ?? ""}
          onSaved={handleFormSaved}
          onCancel={handleFormCancel}
        />
      )}

      {bankAccounts.length === 0 && !showForm ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-500">
            No bank accounts configured yet.
          </p>
          <button
            onClick={handleAdd}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add your first bank account
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Bank Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Account Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  GL Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bankAccounts.map((bank) => (
                <tr key={bank.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {bank.bank_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {bank.account_number || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {bank.branch || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                    {bank.account_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {bank.account
                      ? `${bank.account.account_code ? bank.account.account_code + " — " : ""}${bank.account.account_name}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        bank.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {bank.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(bank.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(bank)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BankAccountForm
// ---------------------------------------------------------------------------

interface BankAccountFormProps {
  accounts: Account[];
  editingBank: BankAccountWithGLAccount | null;
  entityId: string;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}

function BankAccountForm({
  accounts,
  editingBank,
  entityId,
  userId,
  onSaved,
  onCancel,
}: BankAccountFormProps) {
  const [bankName, setBankName] = useState(editingBank?.bank_name ?? "");
  const [accountNumber, setAccountNumber] = useState(
    editingBank?.account_number ?? ""
  );
  const [branch, setBranch] = useState(editingBank?.branch ?? "");
  const [accountType, setAccountType] = useState(
    editingBank?.account_type ?? "checking"
  );
  const [accountId, setAccountId] = useState(editingBank?.account_id ?? "");
  const [isActive, setIsActive] = useState(editingBank?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Account search
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(e.target as Node)
      ) {
        setAccountDropdownOpen(false);
        setAccountSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [accountDropdownOpen]);

  // Only show asset accounts (bank/cash accounts)
  const assetAccounts = useMemo(() => {
    const base = accounts.filter(
      (a) => a.is_active && !a.is_header && a.account_type === "asset"
    );
    if (!accountSearch.trim()) return base;
    const q = accountSearch.toLowerCase();
    return base.filter(
      (a) =>
        a.account_name.toLowerCase().includes(q) ||
        (a.account_code && a.account_code.toLowerCase().includes(q))
    );
  }, [accounts, accountSearch]);

  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!bankName.trim()) errs.bank_name = "Bank name is required.";
    if (!accountId) errs.account_id = "GL account is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      if (editingBank) {
        await updateBankAccount(editingBank.id, {
          bank_name: bankName.trim(),
          account_number: accountNumber.trim() || null,
          branch: branch.trim() || null,
          account_type: accountType,
          account_id: accountId,
          is_active: isActive,
        });
        await logAuditEntry({
          entity_id: entityId,
          user_id: userId,
          action: "edit",
          entity_type: "bank_account",
          entity_record_id: editingBank.id,
          old_values: {
            bank_name: editingBank.bank_name,
            account_number: editingBank.account_number,
          },
          new_values: {
            bank_name: bankName.trim(),
            account_number: accountNumber.trim() || null,
          },
        });
        toast.success("Bank account updated.");
      } else {
        const created = await createBankAccount({
          entity_id: entityId,
          bank_name: bankName.trim(),
          account_number: accountNumber.trim() || null,
          branch: branch.trim() || null,
          account_type: accountType,
          account_id: accountId,
          is_active: isActive,
        });
        await logAuditEntry({
          entity_id: entityId,
          user_id: userId,
          action: "create",
          entity_type: "bank_account",
          entity_record_id: created.id,
          old_values: null,
          new_values: {
            bank_name: bankName.trim(),
            account_number: accountNumber.trim() || null,
          },
        });
        toast.success("Bank account created.");
      }
      onSaved();
    } catch {
      toast.error("Failed to save bank account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editingBank ? "Edit Bank Account" : "New Bank Account"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bank Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => {
              setBankName(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.bank_name;
                return next;
              });
            }}
            placeholder="e.g., BDO, BPI, Metrobank"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              errors.bank_name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {errors.bank_name && (
            <p className="mt-1 text-xs text-red-600">{errors.bank_name}</p>
          )}
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="e.g., 1234-5678-90"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Branch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="e.g., Makati Main Branch"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {BANK_ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* GL Account */}
        <div ref={accountDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GL Account <span className="text-red-500">*</span>
          </label>
          {selectedAccount && !accountDropdownOpen ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {selectedAccount.account_code
                  ? `${selectedAccount.account_code} — ${selectedAccount.account_name}`
                  : selectedAccount.account_name}
              </div>
              <button
                onClick={() => setAccountDropdownOpen(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountDropdownOpen(true);
                }}
                onFocus={() => setAccountDropdownOpen(true)}
                placeholder="Search asset accounts..."
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 ${
                  errors.account_id
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {accountDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {assetAccounts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No matching accounts found.
                    </div>
                  ) : (
                    assetAccounts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setAccountId(a.id);
                          setAccountDropdownOpen(false);
                          setAccountSearch("");
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.account_id;
                            return next;
                          });
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        {a.account_code && (
                          <span className="font-mono text-xs text-gray-500">
                            {a.account_code}
                          </span>
                        )}
                        <span className="text-gray-900">
                          {a.account_name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {errors.account_id && (
            <p className="mt-1 text-xs text-red-600">{errors.account_id}</p>
          )}
        </div>

        {/* Active toggle (only for edit) */}
        {editingBank && (
          <div className="flex items-center gap-3 pt-6">
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
            </label>
            <span className="text-sm text-gray-700">Active</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : editingBank ? "Update" : "Create"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
