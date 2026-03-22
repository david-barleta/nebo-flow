"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Trash2, Search, X, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { fetchAccounts } from "@/lib/accounts/queries";
import { fetchStakeholders } from "@/lib/stakeholders/queries";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Account } from "@/lib/accounts/types";
import type { Stakeholder } from "@/lib/stakeholders/types";
import type { TaxTreatment, PriceEntryMode, PurchaseCategory } from "@/lib/items/types";
import { TAX_TREATMENT_LABELS, PRICE_ENTRY_MODE_LABELS, PURCHASE_CATEGORY_LABELS, deriveVatRate } from "@/lib/items/types";
import type { PurchaseLineForm, PurchaseLineType } from "@/lib/purchases/types";
import { computeLineAmounts, formatCurrency } from "@/lib/purchases/types";
import {
  createPurchase,
  fetchNumberingMode,
  checkLockDates,
  logAuditEntry,
} from "@/lib/purchases/queries";
import ItemSelect from "@/components/organization/items/item-select";
import type { ItemSelectionResult } from "@/components/organization/items/item-select";
import { fetchEwtRates } from "@/lib/settings/ewt-queries";
import type { EwtRate } from "@/lib/settings/ewt-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newEmptyLine(lineType: PurchaseLineType = "item"): PurchaseLineForm {
  return {
    key: crypto.randomUUID(),
    line_type: lineType,
    item_id: null,
    item_type: lineType === "service" ? "service" : null,
    description: "",
    account_id: "",
    quantity: lineType === "service" ? "1" : "1",
    unit_price: "",
    discount_amount: "0",
    price_entry_mode: "vat_exclusive",
    tax_treatment: "vatable",
    purchase_category: lineType === "service" ? "services" : null,
    vat_rate: 12.0,
    vat_amount: 0,
    line_total: 0,
    ewt_rate_id: null,
    ewt_rate: 0,
    ewt_amount: 0,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PurchaseFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PurchaseForm({ onSaved, onCancel }: PurchaseFormProps) {
  const { authUser } = useAuth();

  // --- Reference data ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Stakeholder[]>([]);
  const [ewtRates, setEwtRates] = useState<EwtRate[]>([]);

  // --- PV numbering mode ---
  const [pvMode, setPvMode] = useState<"manual" | "auto">("auto");
  const [pvPreview, setPvPreview] = useState<string | null>(null);

  // --- Header fields ---
  const [purchaseVoucherNumber, setPurchaseVoucherNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [stakeholderId, setStakeholderId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // --- Header discount ---
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(
    "fixed"
  );
  const [discountValue, setDiscountValue] = useState("");

  // --- Line items ---
  const [lines, setLines] = useState<PurchaseLineForm[]>([newEmptyLine()]);

  // --- Override justification ---
  const [overrideJustification, setOverrideJustification] = useState("");
  const [requiresJustification, setRequiresJustification] = useState(false);

  // --- UI state ---
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Stakeholder search ---
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // --- Load reference data ---
  useEffect(() => {
    if (!authUser) return;
    const entityId = authUser.entity.id;

    Promise.all([
      fetchAccounts(entityId),
      fetchStakeholders(entityId, "supplier", false),
      fetchNumberingMode(entityId, "purchase_voucher"),
      fetchEwtRates(entityId),
    ])
      .then(([accts, stk, numMode, rates]) => {
        setAccounts(accts);
        setSuppliers(stk);
        setPvMode(numMode.mode);
        setPvPreview(numMode.preview);
        setEwtRates(rates);
      })
      .catch(() => toast.error("Failed to load reference data."));
  }, [authUser]);

  // Close supplier dropdown on outside click
  useEffect(() => {
    if (!supplierDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(e.target as Node)
      ) {
        setSupplierDropdownOpen(false);
        setSupplierSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [supplierDropdownOpen]);

  // --- Expense/asset accounts for line item account selector ---
  const expenseAssetAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.is_active &&
          !a.is_header &&
          (a.account_type === "expense" || a.account_type === "asset")
      ),
    [accounts]
  );

  // --- Filtered suppliers ---
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter((c) =>
      getStakeholderDisplayName(c).toLowerCase().includes(q)
    );
  }, [suppliers, supplierSearch]);

  // --- Selected supplier display ---
  const selectedSupplier = useMemo(
    () => suppliers.find((c) => c.id === stakeholderId) ?? null,
    [suppliers, stakeholderId]
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

  // --- Recalculate line amounts ---
  const recalcLines = useCallback(
    (updatedLines: PurchaseLineForm[]): PurchaseLineForm[] => {
      return updatedLines.map((line) => {
        const { vat_amount, line_total, ewt_amount } = computeLineAmounts(line);
        return { ...line, vat_amount, line_total, ewt_amount };
      });
    },
    []
  );

  // --- Update a single line field ---
  const updateLine = (
    key: string,
    field: string,
    value: string | number | null
  ) => {
    setLines((prev) => {
      const updated = prev.map((l) =>
        l.key === key ? { ...l, [field]: value } : l
      );
      return recalcLines(updated);
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`line_${key}_${field}`];
      return next;
    });
  };

  // --- Item selection handler ---
  const getEwtRatePercent = useCallback(
    (rateId: string | null): number => {
      if (!rateId) return 0;
      const found = ewtRates.find((r) => r.id === rateId);
      return found ? found.rate : 0;
    },
    [ewtRates]
  );

  const handleItemSelect = (key: string, result: ItemSelectionResult) => {
    setLines((prev) => {
      const updated = prev.map((l) => {
        if (l.key !== key) return l;
        const ewtRateId = result.ewt_rate_id || null;
        const isService = result.item_type === "service";
        return {
          ...l,
          item_id: result.item_id,
          item_type: result.item_type ?? l.item_type,
          quantity: isService ? "1" : l.quantity,
          description: result.description || "",
          account_id: result.account_id ?? l.account_id,
          unit_price:
            result.unit_price !== null
              ? String(result.unit_price)
              : l.unit_price,
          tax_treatment:
            (result.tax_treatment as TaxTreatment) ?? l.tax_treatment,
          vat_rate: result.vat_rate ?? l.vat_rate,
          price_entry_mode:
            (result.price_entry_mode as PriceEntryMode) ?? l.price_entry_mode,
          purchase_category:
            (result.purchase_category as PurchaseCategory) ?? l.purchase_category,
          ewt_rate_id: ewtRateId,
          ewt_rate: getEwtRatePercent(ewtRateId),
        };
      });
      return recalcLines(updated);
    });
  };

  // --- Change line type (resets line fields) ---
  const changeLineType = (key: string, newType: PurchaseLineType) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        return {
          ...newEmptyLine(newType),
          key: l.key, // preserve key for React
        };
      })
    );
  };

  // --- Add / remove lines ---
  const addLine = () => setLines((prev) => [...prev, newEmptyLine()]);

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  // --- Computed totals ---
  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const { net_amount } = computeLineAmounts(l);
      return sum + net_amount;
    }, 0);
  }, [lines]);

  const headerDiscountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (val === 0) return 0;
    if (discountType === "fixed") return val;
    return subtotal * (val / 100);
  }, [subtotal, discountType, discountValue]);

  const totalVat = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.vat_amount, 0);
  }, [lines]);

  const totalAmount = useMemo(() => {
    return subtotal - headerDiscountAmount + totalVat;
  }, [subtotal, headerDiscountAmount, totalVat]);

  const totalEwt = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.ewt_amount, 0);
  }, [lines]);

  const totalAmountDue = useMemo(() => {
    return totalAmount - totalEwt;
  }, [totalAmount, totalEwt]);

  // --- BIR fields ---
  const birFields = useMemo(() => {
    let exempt_purchases = 0;
    let zero_rated_purchases = 0;
    let taxable_purchases = 0;
    let input_tax = 0;

    for (const l of lines) {
      const { net_amount } = computeLineAmounts(l);

      if (l.tax_treatment === "vat_exempt") {
        exempt_purchases += net_amount;
      } else if (l.tax_treatment === "zero_rated") {
        zero_rated_purchases += net_amount;
      } else {
        taxable_purchases += net_amount;
        input_tax += l.vat_amount;
      }
    }

    const gross_purchases = exempt_purchases + zero_rated_purchases + taxable_purchases;
    const gross_taxable_purchases = taxable_purchases + input_tax;

    return {
      exempt_purchases,
      zero_rated_purchases,
      taxable_purchases,
      input_tax,
      gross_purchases,
      gross_taxable_purchases,
    };
  }, [lines]);

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

  // --- Validate ---
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!transactionDate)
      errs.transaction_date = "Transaction date is required.";
    if (pvMode === "manual" && !purchaseVoucherNumber.trim())
      errs.purchase_voucher_number = "Purchase voucher number is required.";
    if (!stakeholderId) {
      errs.stakeholder_id = "Supplier is required.";
    }
    if (lines.length === 0) errs.lines = "At least one line item is required.";

    for (const l of lines) {
      if (!l.description.trim())
        errs[`line_${l.key}_description`] = "Required";
      if (!l.account_id) errs[`line_${l.key}_account_id`] = "Required";
      if (l.line_type === "item") {
        const qty = parseFloat(l.quantity);
        if (!qty || qty <= 0) errs[`line_${l.key}_quantity`] = "Must be > 0";
      }
      const price = parseFloat(l.unit_price);
      if (isNaN(price) || price <= 0)
        errs[`line_${l.key}_unit_price`] = l.line_type === "service" ? "Amount required" : "Invalid";
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
      const purchaseLines = lines.map((l, idx) => {
        const { vat_amount, line_total, ewt_amount } = computeLineAmounts(l);
        return {
          item_id: l.item_id,
          account_id: l.account_id,
          description: l.description.trim(),
          quantity: parseFloat(l.quantity) || 0,
          unit_price: parseFloat(l.unit_price) || 0,
          discount_amount: parseFloat(l.discount_amount) || 0,
          price_entry_mode: l.price_entry_mode,
          tax_treatment: l.tax_treatment,
          purchase_category: l.purchase_category,
          vat_rate: l.vat_rate,
          vat_amount: Math.round(vat_amount * 100) / 100,
          line_total: Math.round(line_total * 100) / 100,
          ewt_rate_id: l.ewt_rate_id,
          ewt_rate: l.ewt_rate,
          ewt_amount: Math.round(ewt_amount * 100) / 100,
          line_order: idx + 1,
        };
      });

      const purchase = await createPurchase({
        entity_id: authUser.entity.id,
        transaction_date: transactionDate,
        description: description.trim() || null,
        stakeholder_id: stakeholderId,
        notes: notes.trim() || null,
        override_justification: requiresJustification
          ? overrideJustification.trim()
          : null,
        purchase_voucher_number:
          pvMode === "manual" ? purchaseVoucherNumber.trim() : null,
        discount_type: parseFloat(discountValue) ? discountType : null,
        discount_value: parseFloat(discountValue) || null,
        lines: purchaseLines,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: Math.round(headerDiscountAmount * 100) / 100,
        vat_amount: Math.round(totalVat * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        ewt_amount: Math.round(totalEwt * 100) / 100,
        total_amount_due: Math.round(totalAmountDue * 100) / 100,
        ...(Object.fromEntries(
          Object.entries(birFields).map(([k, v]) => [
            k,
            Math.round(v * 100) / 100,
          ])
        ) as typeof birFields),
        created_by: authUser.user.id,
      });

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "create",
        entity_type: "purchase",
        entity_record_id: purchase.id,
        old_values: null,
        new_values: {
          document_number: purchase.document_number,
          purchase_voucher_number: purchase.purchase_voucher_number,
          total_amount: purchase.total_amount,
          status: purchase.status,
        },
      });

      toast.success(
        `Purchase voucher ${purchase.purchase_voucher_number || purchase.document_number} created.`
      );
      onSaved();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to create purchase.";
      console.error("Purchase creation error:", err);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // --- Inline account select for line items ---
  const AccountSelect = ({
    value,
    onChange,
    lineKey,
  }: {
    value: string;
    onChange: (id: string) => void;
    lineKey: string;
  }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setOpen(false);
          setSearch("");
        }
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const filtered = useMemo(() => {
      if (!search.trim()) return expenseAssetAccounts;
      const q = search.toLowerCase();
      return expenseAssetAccounts.filter(
        (a) =>
          a.account_name.toLowerCase().includes(q) ||
          (a.account_code && a.account_code.toLowerCase().includes(q))
      );
    }, [search]);

    const hasError = !!errors[`line_${lineKey}_account_id`];

    return (
      <div ref={ref} className="relative">
        <div
          className={`w-full rounded border px-2 py-1.5 text-sm cursor-pointer truncate ${
            hasError ? "border-red-400" : "border-gray-300"
          }`}
          onClick={() => setOpen(!open)}
        >
          {value ? (
            <span className="truncate">{getAccountDisplay(value)}</span>
          ) : (
            <span className="text-gray-400">Account...</span>
          )}
        </div>
        {open && (
          <div className="fixed z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden"
            style={{
              top: ref.current
                ? ref.current.getBoundingClientRect().bottom + 4
                : 0,
              left: ref.current
                ? ref.current.getBoundingClientRect().left
                : 0,
            }}
          >
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search accounts..."
                  className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-2">No accounts</p>
              ) : (
                filtered.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onChange(a.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                      a.id === value
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Collapse / title bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          New Purchase Voucher
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

      {/* Header section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Purchase Voucher Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Voucher No.{" "}
              {pvMode === "manual" && <span className="text-red-500">*</span>}
            </label>
            {pvMode === "manual" ? (
              <>
                <input
                  type="text"
                  value={purchaseVoucherNumber}
                  onChange={(e) => {
                    setPurchaseVoucherNumber(e.target.value);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.purchase_voucher_number;
                      return next;
                    });
                  }}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    errors.purchase_voucher_number
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  placeholder="Enter PV number"
                />
                {errors.purchase_voucher_number && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.purchase_voucher_number}
                  </p>
                )}
              </>
            ) : (
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 font-mono">
                {pvPreview || "Auto-generated on save"}
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

          {/* Supplier */}
          <div ref={supplierDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <div
              className={`w-full rounded-lg border px-4 py-2.5 text-sm cursor-pointer ${
                errors.stakeholder_id
                  ? "border-red-400"
                  : "border-gray-300 focus-within:border-blue-500"
              }`}
              onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
            >
              {selectedSupplier ? (
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {getStakeholderDisplayName(selectedSupplier)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStakeholderId("");
                      setSupplierDropdownOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">Select supplier...</span>
              )}
            </div>
            {errors.stakeholder_id && (
              <p className="text-xs text-red-500 mt-1">
                {errors.stakeholder_id}
              </p>
            )}

            {supplierDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder="Search suppliers..."
                      className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredSuppliers.length === 0 ? (
                    <p className="text-sm text-gray-400 px-3 py-2">
                      No suppliers found
                    </p>
                  ) : (
                    filteredSuppliers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStakeholderId(c.id);
                          setSupplierDropdownOpen(false);
                          setSupplierSearch("");
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

      {/* Line items */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1"
          >
            <Plus size={14} />
            Add Line
          </button>
        </div>

        {errors.lines && (
          <p className="text-xs text-red-500">{errors.lines}</p>
        )}

        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500">
                    Line {idx + 1}
                  </span>
                  <select
                    value={line.line_type}
                    onChange={(e) =>
                      changeLineType(line.key, e.target.value as PurchaseLineType)
                    }
                    className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="item">Item</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length <= 1}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {line.line_type === "item" ? (
                  <>
                    {/* Item selector — only for item lines */}
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Item
                      </label>
                      <ItemSelect
                        value={line.item_id}
                        onSelect={(result) =>
                          handleItemSelect(line.key, result)
                        }
                        context="purchase"
                        placeholder="Select item..."
                      />
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(line.key, "description", e.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          errors[`line_${line.key}_description`]
                            ? "border-red-400"
                            : "border-gray-300"
                        } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                        placeholder="Description"
                      />
                    </div>

                    {/* Account */}
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Account <span className="text-red-500">*</span>
                      </label>
                      <AccountSelect
                        value={line.account_id}
                        onChange={(id) => updateLine(line.key, "account_id", id)}
                        lineKey={line.key}
                      />
                    </div>

                    {/* Qty */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Qty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, "quantity", e.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm text-right ${
                          errors[`line_${line.key}_quantity`]
                            ? "border-red-400"
                            : "border-gray-300"
                        } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Unit Price <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(line.key, "unit_price", e.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm text-right ${
                          errors[`line_${line.key}_unit_price`]
                            ? "border-red-400"
                            : "border-gray-300"
                        } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                        placeholder="0.00"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Service line: Account first, then description, then amount */}
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Account <span className="text-red-500">*</span>
                      </label>
                      <AccountSelect
                        value={line.account_id}
                        onChange={(id) => updateLine(line.key, "account_id", id)}
                        lineKey={line.key}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) =>
                          updateLine(line.key, "description", e.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          errors[`line_${line.key}_description`]
                            ? "border-red-400"
                            : "border-gray-300"
                        } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                        placeholder="e.g. Legal fees, Consulting, Rent..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(line.key, "unit_price", e.target.value)
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm text-right ${
                          errors[`line_${line.key}_unit_price`]
                            ? "border-red-400"
                            : "border-gray-300"
                        } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}

                {/* Discount */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Discount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.discount_amount}
                    onChange={(e) =>
                      updateLine(line.key, "discount_amount", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Tax Treatment */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Tax
                  </label>
                  <select
                    value={line.tax_treatment}
                    onChange={(e) => {
                      const tt = e.target.value as TaxTreatment;
                      updateLine(line.key, "tax_treatment", tt);
                      updateLine(line.key, "vat_rate", deriveVatRate(tt));
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {(
                      Object.entries(TAX_TREATMENT_LABELS) as [
                        TaxTreatment,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Entry Mode */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Price Mode
                  </label>
                  <select
                    value={line.price_entry_mode}
                    onChange={(e) =>
                      updateLine(line.key, "price_entry_mode", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {(
                      Object.entries(PRICE_ENTRY_MODE_LABELS) as [
                        PriceEntryMode,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Purchase Category */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Category
                  </label>
                  <select
                    value={line.purchase_category ?? ""}
                    onChange={(e) =>
                      updateLine(
                        line.key,
                        "purchase_category",
                        e.target.value || null
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">—</option>
                    {(
                      Object.entries(PURCHASE_CATEGORY_LABELS) as [
                        PurchaseCategory,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* EWT Rate */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    EWT
                  </label>
                  <select
                    value={line.ewt_rate_id ?? ""}
                    onChange={(e) => {
                      const rateId = e.target.value || null;
                      updateLine(line.key, "ewt_rate_id", rateId);
                      updateLine(
                        line.key,
                        "ewt_rate",
                        getEwtRatePercent(rateId)
                      );
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {ewtRates.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.category_name} ({r.rate}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* VAT (read-only) */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    VAT
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-right font-mono text-gray-600">
                    {formatCurrency(line.vat_amount)}
                  </div>
                </div>

                {/* EWT Amount (read-only) */}
                {line.ewt_amount > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      EWT Amt
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-right font-mono text-red-600">
                      ({formatCurrency(line.ewt_amount)})
                    </div>
                  </div>
                )}

                {/* Line Total (read-only) */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Total
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-right font-mono font-medium text-gray-900">
                    {formatCurrency(line.line_total)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Header discount + Totals */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          {/* Header discount */}
          <div className="space-y-3 md:w-1/2">
            <h3 className="text-sm font-medium text-gray-700">
              Header Discount
            </h3>
            <div className="flex gap-3">
              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "fixed" | "percentage")
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </select>
              <input
                type="text"
                inputMode="decimal"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-4 py-2 text-sm text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={discountType === "percentage" ? "%" : "0.00"}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="md:w-1/2 md:max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-mono text-gray-900">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {headerDiscountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-mono text-red-600">
                  ({formatCurrency(headerDiscountAmount)})
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT</span>
              <span className="font-mono text-gray-900">
                {formatCurrency(totalVat)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Total</span>
              <span className="font-mono text-gray-900">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            {totalEwt > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Less: Withholding Tax</span>
                <span className="font-mono text-red-600">
                  ({formatCurrency(totalEwt)})
                </span>
              </div>
            )}
            {totalEwt > 0 && (
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total Amount Due</span>
                <span className="font-mono text-gray-900">
                  {formatCurrency(totalAmountDue)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm text-orange-700">
              <span>Outstanding Balance</span>
              <span className="font-mono">
                {formatCurrency(totalEwt > 0 ? totalAmountDue : totalAmount)}
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
