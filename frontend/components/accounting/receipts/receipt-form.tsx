"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, X, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { fetchAccounts } from "@/lib/accounts/queries";
import { fetchStakeholders } from "@/lib/stakeholders/queries";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Account } from "@/lib/accounts/types";
import type { Stakeholder } from "@/lib/stakeholders/types";
import type { PaymentMethod, OutstandingSale } from "@/lib/receipts/types";
import { formatCurrency } from "@/lib/receipts/types";
import {
  createReceipt,
  fetchOutstandingSales,
  fetchNumberingMode,
  checkLockDates,
  logAuditEntry,
} from "@/lib/receipts/queries";
import { fetchBankAccounts } from "@/lib/settings/bank-accounts-queries";
import type { BankAccountWithGLAccount } from "@/lib/settings/bank-accounts-types";

// ---------------------------------------------------------------------------
// Allocation form row
// ---------------------------------------------------------------------------

interface AllocationRow {
  sale_id: string;
  amount_applied: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReceiptFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReceiptForm({ onSaved, onCancel }: ReceiptFormProps) {
  const { authUser } = useAuth();

  // --- Reference data ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Stakeholder[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountWithGLAccount[]>(
    []
  );

  // --- OR numbering mode ---
  const [orMode, setOrMode] = useState<"manual" | "auto">("auto");
  const [orPreview, setOrPreview] = useState<string | null>(null);
  const [orNumber, setOrNumber] = useState("");

  // --- Receipt type ---
  const [isStandalone, setIsStandalone] = useState(false);

  // --- Header fields ---
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [stakeholderId, setStakeholderId] = useState("");
  const [noCustomer, setNoCustomer] = useState(false);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");

  // --- Standalone account ---
  const [standaloneAccountId, setStandaloneAccountId] = useState("");

  // --- Payment details ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  // --- Allocations (applied receipts) ---
  const [outstandingSales, setOutstandingSales] = useState<OutstandingSale[]>(
    []
  );
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // --- Override justification ---
  const [overrideJustification, setOverrideJustification] = useState("");
  const [requiresJustification, setRequiresJustification] = useState(false);

  // --- UI state ---
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Stakeholder search ---
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // --- Standalone account search ---
  const [accountSearch, setAccountSearch] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // --- Load reference data ---
  useEffect(() => {
    if (!authUser) return;
    const entityId = authUser.entity.id;

    Promise.all([
      fetchAccounts(entityId),
      fetchStakeholders(entityId, "client", false),
      fetchBankAccounts(entityId),
      fetchNumberingMode(entityId, "official_receipt"),
    ])
      .then(([accts, stk, banks, numMode]) => {
        setAccounts(accts);
        setClients(stk);
        setBankAccounts(banks);
        setOrMode(numMode.mode);
        setOrPreview(numMode.preview);
      })
      .catch(() => toast.error("Failed to load reference data."));
  }, [authUser]);

  // --- Load outstanding sales when client changes (applied mode) ---
  useEffect(() => {
    if (isStandalone || !stakeholderId || !authUser) {
      setOutstandingSales([]);
      setAllocations([]);
      return;
    }

    setLoadingSales(true);
    fetchOutstandingSales(authUser.entity.id, stakeholderId)
      .then((sales) => {
        setOutstandingSales(sales);
        // Pre-populate allocation rows for each outstanding sale
        setAllocations(
          sales.map((s) => ({ sale_id: s.id, amount_applied: "" }))
        );
      })
      .catch(() => toast.error("Failed to load outstanding sales."))
      .finally(() => setLoadingSales(false));
  }, [authUser, stakeholderId, isStandalone]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!clientDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(e.target as Node)
      ) {
        setClientDropdownOpen(false);
        setClientSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clientDropdownOpen]);

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

  // --- Revenue / income accounts for standalone receipt ---
  const incomeAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.is_active &&
          !a.is_header &&
          a.account_type === "revenue"
      ),
    [accounts]
  );

  // --- Filtered clients ---
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) =>
      getStakeholderDisplayName(c).toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // --- Filtered accounts for standalone ---
  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return incomeAccounts;
    const q = accountSearch.toLowerCase();
    return incomeAccounts.filter(
      (a) =>
        a.account_name.toLowerCase().includes(q) ||
        (a.account_code && a.account_code.toLowerCase().includes(q))
    );
  }, [incomeAccounts, accountSearch]);

  // --- Selected client display ---
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === stakeholderId) ?? null,
    [clients, stakeholderId]
  );

  // --- Account display helper ---
  const getAccountDisplay = useCallback(
    (id: string) => {
      const acct = accounts.find((a) => a.id === id);
      if (!acct) return "";
      return acct.account_code
        ? `${acct.account_code} — ${acct.account_name}`
        : acct.account_name;
    },
    [accounts]
  );

  // --- Compute total from allocations (applied mode) ---
  const allocationTotal = useMemo(() => {
    return allocations.reduce((sum, a) => {
      const val = parseFloat(a.amount_applied) || 0;
      return sum + val;
    }, 0);
  }, [allocations]);

  // --- Effective amount ---
  const effectiveAmount = isStandalone
    ? parseFloat(amount) || 0
    : allocationTotal;

  // --- Check lock dates when date changes ---
  useEffect(() => {
    if (!authUser || !transactionDate) return;
    checkLockDates(
      authUser.entity.id,
      transactionDate,
      authUser.role.canOverrideLockDates
    ).then((result) => {
      if (result.blocked) {
        setErrors((prev) => ({ ...prev, transaction_date: result.reason }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.transaction_date;
          return next;
        });
      }
      setRequiresJustification(result.requiresJustification);
    });
  }, [authUser, transactionDate]);

  // --- Update allocation amount ---
  const updateAllocation = (saleId: string, value: string) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.sale_id === saleId ? { ...a, amount_applied: value } : a
      )
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`alloc_${saleId}`];
      delete next.allocations;
      return next;
    });
  };

  // --- Validate ---
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!transactionDate)
      errs.transaction_date = "Transaction date is required.";

    if (orMode === "manual" && !orNumber.trim())
      errs.or_number = "Receipt number is required.";

    if (isStandalone) {
      // Standalone: amount and account required
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) errs.amount = "Amount must be greater than 0.";
      if (!standaloneAccountId)
        errs.standalone_account_id = "Income account is required.";
    } else {
      // Applied: client required, at least one allocation
      if (!stakeholderId) errs.stakeholder_id = "Client is required.";

      const activeAllocations = allocations.filter(
        (a) => parseFloat(a.amount_applied) > 0
      );
      if (activeAllocations.length === 0)
        errs.allocations = "At least one invoice must have an amount applied.";

      // Validate each allocation
      for (const alloc of allocations) {
        const val = parseFloat(alloc.amount_applied);
        if (val && val > 0) {
          const sale = outstandingSales.find((s) => s.id === alloc.sale_id);
          if (sale && val > sale.outstanding_balance) {
            errs[`alloc_${alloc.sale_id}`] = `Cannot exceed ${formatCurrency(
              sale.outstanding_balance
            )}`;
          }
        }
      }
    }

    // Payment method validation
    if (paymentMethod === "check") {
      if (!checkNumber.trim()) errs.check_number = "Check number is required.";
      if (!checkDate) errs.check_date = "Check date is required.";
      if (!bankAccountId)
        errs.bank_account_id = "Bank account is required.";
    }
    if (paymentMethod === "bank_transfer") {
      if (!bankAccountId)
        errs.bank_account_id = "Bank account is required.";
    }

    if (requiresJustification && !overrideJustification.trim()) {
      errs.override_justification = "Override justification is required.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- Save ---
  const handleSave = async () => {
    if (!authUser) return;
    if (saving) return;
    if (!validate()) {
      toast.error("Please fix the errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const lockCheck = await checkLockDates(
        authUser.entity.id,
        transactionDate,
        authUser.role.canOverrideLockDates
      );
      if (lockCheck.blocked) {
        toast.error(lockCheck.reason);
        return;
      }

      const activeAllocations = isStandalone
        ? []
        : allocations
            .filter((a) => {
              const val = parseFloat(a.amount_applied);
              return val && val > 0;
            })
            .map((a) => ({
              sale_id: a.sale_id,
              amount_applied: Math.round(parseFloat(a.amount_applied) * 100) / 100,
            }));

      const receiptAmount = isStandalone
        ? Math.round((parseFloat(amount) || 0) * 100) / 100
        : Math.round(allocationTotal * 100) / 100;

      const receipt = await createReceipt({
        entity_id: authUser.entity.id,
        transaction_date: transactionDate,
        description: description.trim() || null,
        stakeholder_id: stakeholderId || null,
        is_standalone: isStandalone,
        standalone_account_id: isStandalone ? standaloneAccountId : null,
        amount: receiptAmount,
        payment_method: paymentMethod,
        check_number:
          paymentMethod === "check" ? checkNumber.trim() : null,
        check_date: paymentMethod === "check" ? checkDate : null,
        bank_account_id:
          paymentMethod !== "cash" ? bankAccountId : null,
        notes: notes.trim() || null,
        override_justification: requiresJustification
          ? overrideJustification.trim()
          : null,
        allocations: activeAllocations,
        created_by: authUser.user.id,
      });

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "create",
        entity_type: "receipt",
        entity_record_id: receipt.id,
        old_values: null,
        new_values: {
          document_number: receipt.document_number,
          is_standalone: isStandalone,
          amount: receipt.amount,
          payment_method: paymentMethod,
          status: receipt.status,
        },
      });

      toast.success(`Receipt ${receipt.document_number} created.`);
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to create receipt.";
      console.error("Receipt creation error:", err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Collapse / title bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          New Receipt
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"
        >
          <ChevronUp size={14} />
          Collapse
        </button>
      </div>

      {/* Receipt type toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Receipt Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsStandalone(false);
                setStandaloneAccountId("");
                setAmount("");
              }}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                !isStandalone
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Applied to Invoice
            </button>
            <button
              type="button"
              onClick={() => {
                setIsStandalone(true);
                setAllocations([]);
                setOutstandingSales([]);
              }}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                isStandalone
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Standalone
            </button>
          </div>
        </div>

        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* OR Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt No.{" "}
              {orMode === "manual" && <span className="text-red-500">*</span>}
            </label>
            {orMode === "manual" ? (
              <>
                <input
                  type="text"
                  value={orNumber}
                  onChange={(e) => {
                    setOrNumber(e.target.value);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.or_number;
                      return next;
                    });
                  }}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    errors.or_number
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  placeholder="Enter receipt number"
                />
                {errors.or_number && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.or_number}
                  </p>
                )}
              </>
            ) : (
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 font-mono">
                {orPreview || "Auto-generated on save"}
              </div>
            )}
          </div>

          {/* Transaction Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => {
                setTransactionDate(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.transaction_date;
                  return next;
                });
              }}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                errors.transaction_date
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            {errors.transaction_date && (
              <p className="text-xs text-red-500 mt-1">
                {errors.transaction_date}
              </p>
            )}
          </div>

          {/* Client */}
          <div ref={clientDropdownRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Client{" "}
                {!isStandalone && <span className="text-red-500">*</span>}
              </label>
              {isStandalone && (
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noCustomer}
                    onChange={(e) => {
                      setNoCustomer(e.target.checked);
                      if (e.target.checked) {
                        setStakeholderId("");
                        setClientDropdownOpen(false);
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.stakeholder_id;
                          return next;
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  No customer
                </label>
              )}
            </div>
            <div
              className={`w-full rounded-lg border px-4 py-2.5 text-sm ${
                noCustomer && isStandalone
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                  : "cursor-pointer"
              } ${
                errors.stakeholder_id
                  ? "border-red-400"
                  : "border-gray-300 focus-within:border-blue-500"
              }`}
              onClick={() =>
                !(noCustomer && isStandalone) &&
                setClientDropdownOpen(!clientDropdownOpen)
              }
            >
              {noCustomer && isStandalone ? (
                <span className="text-gray-400">No customer</span>
              ) : selectedClient ? (
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {getStakeholderDisplayName(selectedClient)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStakeholderId("");
                      setClientDropdownOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">Select client...</span>
              )}
            </div>
            {errors.stakeholder_id && (
              <p className="text-xs text-red-500 mt-1">
                {errors.stakeholder_id}
              </p>
            )}

            {clientDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-gray-400 px-3 py-2">
                      No clients found
                    </p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStakeholderId(c.id);
                          setClientDropdownOpen(false);
                          setClientSearch("");
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.stakeholder_id;
                            return next;
                          });
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                          c.id === stakeholderId
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {getStakeholderDisplayName(c)}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Brief description..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </div>

      {/* Standalone: Amount + Account */}
      {isStandalone && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Standalone Receipt Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.amount;
                    return next;
                  });
                }}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 text-right focus:outline-none focus:ring-1 ${
                  errors.amount
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>

            {/* Income Account */}
            <div ref={accountDropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Account <span className="text-red-500">*</span>
              </label>
              <div
                className={`w-full rounded-lg border px-4 py-2.5 text-sm cursor-pointer truncate ${
                  errors.standalone_account_id
                    ? "border-red-400"
                    : "border-gray-300"
                }`}
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              >
                {standaloneAccountId ? (
                  <span className="truncate">
                    {getAccountDisplay(standaloneAccountId)}
                  </span>
                ) : (
                  <span className="text-gray-400">Select account...</span>
                )}
              </div>
              {errors.standalone_account_id && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.standalone_account_id}
                </p>
              )}

              {accountDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={accountSearch}
                        onChange={(e) => setAccountSearch(e.target.value)}
                        placeholder="Search accounts..."
                        className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {filteredAccounts.length === 0 ? (
                      <p className="text-sm text-gray-400 px-3 py-2">
                        No accounts
                      </p>
                    ) : (
                      filteredAccounts.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setStandaloneAccountId(a.id);
                            setAccountDropdownOpen(false);
                            setAccountSearch("");
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.standalone_account_id;
                              return next;
                            });
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                            a.id === standaloneAccountId
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          {a.account_code && (
                            <span className="font-mono text-gray-500 mr-2">
                              {a.account_code}
                            </span>
                          )}
                          {a.account_name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Allocations (applied receipts) */}
      {!isStandalone && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Apply to Outstanding Invoices
          </h3>

          {errors.allocations && (
            <p className="text-xs text-red-500">{errors.allocations}</p>
          )}

          {!stakeholderId ? (
            <p className="text-sm text-gray-500 py-4">
              Select a client above to see their outstanding invoices.
            </p>
          ) : loadingSales ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : outstandingSales.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No outstanding invoices for this client.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                        Invoice #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                        Total
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                        Balance
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                        Amount to Apply
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstandingSales.map((sale) => {
                      const alloc = allocations.find(
                        (a) => a.sale_id === sale.id
                      );
                      return (
                        <tr
                          key={sale.id}
                          className="border-b border-gray-100"
                        >
                          <td className="px-4 py-2.5 text-sm font-medium text-blue-600">
                            {sale.sales_invoice_number || sale.document_number}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">
                            {sale.transaction_date}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-mono">
                            {formatCurrency(
                              sale.total_amount_due > 0
                                ? sale.total_amount_due
                                : sale.total_amount
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-orange-700 text-right font-mono font-medium">
                            {formatCurrency(sale.outstanding_balance)}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={alloc?.amount_applied ?? ""}
                              onChange={(e) =>
                                updateAllocation(sale.id, e.target.value)
                              }
                              className={`w-32 ml-auto block rounded-lg border px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-1 ${
                                errors[`alloc_${sale.id}`]
                                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              }`}
                              placeholder="0.00"
                            />
                            {errors[`alloc_${sale.id}`] && (
                              <p className="text-xs text-red-500 mt-1 text-right">
                                {errors[`alloc_${sale.id}`]}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Allocation total */}
              <div className="flex justify-end border-t border-gray-200 pt-3">
                <div className="text-sm font-semibold text-gray-900">
                  Total Applied:{" "}
                  <span className="font-mono">
                    {formatCurrency(allocationTotal)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-900">
          Payment Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value as PaymentMethod);
                setBankAccountId("");
                setCheckNumber("");
                setCheckDate("");
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {paymentMethod === "check" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => {
                    setCheckNumber(e.target.value);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.check_number;
                      return next;
                    });
                  }}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    errors.check_number
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  placeholder="Check number"
                />
                {errors.check_number && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.check_number}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => {
                    setCheckDate(e.target.value);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.check_date;
                      return next;
                    });
                  }}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    errors.check_date
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                {errors.check_date && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.check_date}
                  </p>
                )}
              </div>
            </>
          )}

          {(paymentMethod === "check" ||
            paymentMethod === "bank_transfer") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account <span className="text-red-500">*</span>
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => {
                  setBankAccountId(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.bank_account_id;
                    return next;
                  });
                }}
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                  errors.bank_account_id
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              >
                <option value="">Select bank account...</option>
                {bankAccounts.map((ba) => (
                  <option key={ba.id} value={ba.id}>
                    {ba.bank_name}
                    {ba.account_number ? ` — ${ba.account_number}` : ""}
                  </option>
                ))}
              </select>
              {errors.bank_account_id && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.bank_account_id}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex justify-end">
          <div className="md:w-1/2 md:max-w-xs space-y-2">
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Total Amount</span>
              <span className="font-mono text-gray-900">
                {formatCurrency(effectiveAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Override justification */}
      {requiresJustification && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-yellow-800">
            Lock Date Override Required
          </h3>
          <p className="text-sm text-yellow-700">
            The transaction date falls within a locked period. Please provide a
            justification to proceed.
          </p>
          <textarea
            value={overrideJustification}
            onChange={(e) => {
              setOverrideJustification(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.override_justification;
                return next;
              });
            }}
            rows={2}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 resize-none ${
              errors.override_justification
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500"
            }`}
            placeholder="Justification..."
          />
          {errors.override_justification && (
            <p className="text-xs text-red-500">
              {errors.override_justification}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
        >
          {saving ? "Saving..." : "Save & Post"}
        </button>
      </div>
    </div>
  );
}
