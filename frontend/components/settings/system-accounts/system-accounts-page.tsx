"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Search, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { fetchAccounts } from "@/lib/accounts/queries";
import type { Account } from "@/lib/accounts/types";
import {
  SYSTEM_ACCOUNT_LABELS,
  SYSTEM_ACCOUNT_DESCRIPTIONS,
  SYSTEM_ACCOUNT_ORDER,
  SYSTEM_ACCOUNT_EXPECTED_TYPE,
} from "@/lib/settings/system-accounts-types";
import type {
  SystemAccountKey,
  SystemAccountMappingWithAccount,
} from "@/lib/settings/system-accounts-types";
import {
  fetchSystemAccountMappings,
  upsertSystemAccountMapping,
  removeSystemAccountMapping,
} from "@/lib/settings/system-accounts-queries";
import { logAuditEntry } from "@/lib/settings/queries";

export default function SystemAccountsPage() {
  const { authUser } = useAuth();
  const [mappings, setMappings] = useState<SystemAccountMappingWithAccount[]>(
    []
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<SystemAccountKey | null>(null);

  const loadData = useCallback(async () => {
    if (!authUser) return;
    try {
      const [m, a] = await Promise.all([
        fetchSystemAccountMappings(authUser.entity.id),
        fetchAccounts(authUser.entity.id),
      ]);
      setMappings(m);
      setAccounts(a);
    } catch {
      toast.error("Failed to load system account mappings.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getMappingForKey = (key: SystemAccountKey) =>
    mappings.find((m) => m.mapping_key === key) ?? null;

  const handleSelect = async (key: SystemAccountKey, accountId: string) => {
    if (!authUser) return;
    setSavingKey(key);
    try {
      const oldMapping = getMappingForKey(key);
      await upsertSystemAccountMapping(authUser.entity.id, key, accountId);

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: oldMapping ? "edit" : "create",
        entity_type: "system_account_mapping",
        entity_record_id: null,
        old_values: oldMapping
          ? { mapping_key: key, account_id: oldMapping.account_id }
          : null,
        new_values: { mapping_key: key, account_id: accountId },
      });

      toast.success(`${SYSTEM_ACCOUNT_LABELS[key]} mapped successfully.`);
      await loadData();
    } catch {
      toast.error("Failed to save mapping.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleClear = async (key: SystemAccountKey) => {
    if (!authUser) return;
    const mapping = getMappingForKey(key);
    if (!mapping) return;

    setSavingKey(key);
    try {
      await removeSystemAccountMapping(mapping.id);

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "delete",
        entity_type: "system_account_mapping",
        entity_record_id: mapping.id,
        old_values: { mapping_key: key, account_id: mapping.account_id },
        new_values: null,
      });

      toast.success(`${SYSTEM_ACCOUNT_LABELS[key]} mapping removed.`);
      await loadData();
    } catch {
      toast.error("Failed to remove mapping.");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Check for unmapped accounts
  const unmappedKeys = SYSTEM_ACCOUNT_ORDER.filter(
    (key) => !getMappingForKey(key)
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">
          Map system roles to specific accounts from your chart of accounts.
          These mappings are used by the Sales, Purchases, Receipts, and
          Disbursements modules to automatically create journal entries.
        </p>
      </div>

      {unmappedKeys.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">
              {unmappedKeys.length} system{" "}
              {unmappedKeys.length === 1 ? "account is" : "accounts are"} not
              configured.
            </p>
            <p className="mt-1 text-amber-700">
              Transactions that depend on these accounts will fail until they are
              mapped.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {SYSTEM_ACCOUNT_ORDER.map((key) => (
          <MappingCard
            key={key}
            mappingKey={key}
            mapping={getMappingForKey(key)}
            accounts={accounts}
            saving={savingKey === key}
            onSelect={(accountId) => handleSelect(key, accountId)}
            onClear={() => handleClear(key)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MappingCard — one row for a system account mapping
// ---------------------------------------------------------------------------

interface MappingCardProps {
  mappingKey: SystemAccountKey;
  mapping: SystemAccountMappingWithAccount | null;
  accounts: Account[];
  saving: boolean;
  onSelect: (accountId: string) => void;
  onClear: () => void;
}

function MappingCard({
  mappingKey,
  mapping,
  accounts,
  saving,
  onSelect,
  onClear,
}: MappingCardProps) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const expectedType = SYSTEM_ACCOUNT_EXPECTED_TYPE[mappingKey];

  // Filter accounts to the expected type, active, non-header
  const filteredAccounts = useMemo(() => {
    const base = accounts.filter(
      (a) =>
        a.is_active &&
        !a.is_header &&
        a.account_type === expectedType
    );
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (a) =>
        a.account_name.toLowerCase().includes(q) ||
        (a.account_code && a.account_code.toLowerCase().includes(q))
    );
  }, [accounts, expectedType, search]);

  const mappedAccount = mapping?.account ?? null;
  const isMapped = !!mapping;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            {SYSTEM_ACCOUNT_LABELS[mappingKey]}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {SYSTEM_ACCOUNT_DESCRIPTIONS[mappingKey]}
          </p>
        </div>

        <div className="sm:w-80 shrink-0" ref={ref}>
          {isMapped && !dropdownOpen ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {mappedAccount
                  ? `${mappedAccount.account_code ? mappedAccount.account_code + " — " : ""}${mappedAccount.account_name}`
                  : "Mapped (account details unavailable)"}
              </div>
              <button
                onClick={() => setDropdownOpen(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                disabled={saving}
              >
                Change
              </button>
              <button
                onClick={onClear}
                className="rounded-lg border border-gray-300 p-2 text-gray-400 hover:text-red-500 hover:border-red-300"
                disabled={saving}
                title="Remove mapping"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder={`Search ${expectedType} accounts...`}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredAccounts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No matching accounts found.
                    </div>
                  ) : (
                    filteredAccounts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          onSelect(a.id);
                          setDropdownOpen(false);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors"
                      >
                        {a.account_code && (
                          <span className="font-mono text-xs text-gray-500">
                            {a.account_code}
                          </span>
                        )}
                        <span className="text-gray-900">{a.account_name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
