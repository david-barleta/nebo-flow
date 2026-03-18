"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import type { Item, ItemType, TaxTreatment, PurchaseCategory } from "@/lib/items/types";
import { TAX_TREATMENT_LABELS, PURCHASE_CATEGORY_LABELS } from "@/lib/items/types";
import {
  createItem,
  updateItem,
  isItemNameTaken,
  logAuditEntry,
} from "@/lib/items/queries";
import { fetchAccounts } from "@/lib/accounts/queries";
import type { Account } from "@/lib/accounts/types";

interface ItemFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem: Item | null;
}

export default function ItemFormDrawer({
  open,
  onClose,
  onSaved,
  editItem,
}: ItemFormDrawerProps) {
  const { authUser } = useAuth();
  const isEditMode = editItem !== null;

  // Form state
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<ItemType>("product");
  const [description, setDescription] = useState("");
  const [defaultUnitPrice, setDefaultUnitPrice] = useState("");
  const [defaultSalesAccountId, setDefaultSalesAccountId] = useState("");
  const [defaultPurchaseAccountId, setDefaultPurchaseAccountId] = useState("");
  const [defaultTaxTreatment, setDefaultTaxTreatment] = useState<TaxTreatment>("vatable");
  const [defaultPurchaseCategory, setDefaultPurchaseCategory] = useState("");
  const [saving, setSaving] = useState(false);

  // Account search state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [purchaseDropdownOpen, setPurchaseDropdownOpen] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [priceError, setPriceError] = useState("");

  // Load accounts
  useEffect(() => {
    if (!open || !authUser) return;
    fetchAccounts(authUser.entity.id)
      .then(setAccounts)
      .catch(() => toast.error("Failed to load accounts."));
  }, [open, authUser]);

  // Revenue accounts for sales (detail accounts only)
  const revenueAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.is_active &&
          !a.is_header &&
          a.account_type === "revenue"
      ),
    [accounts]
  );

  // Expense + asset accounts for purchases (detail accounts only)
  const purchaseAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.is_active &&
          !a.is_header &&
          (a.account_type === "expense" || a.account_type === "asset")
      ),
    [accounts]
  );

  // Filtered dropdown lists
  const filteredSalesAccounts = useMemo(() => {
    if (!salesSearch.trim()) return revenueAccounts;
    const q = salesSearch.toLowerCase();
    return revenueAccounts.filter(
      (a) =>
        a.account_name.toLowerCase().includes(q) ||
        (a.account_code && a.account_code.toLowerCase().includes(q))
    );
  }, [revenueAccounts, salesSearch]);

  const filteredPurchaseAccounts = useMemo(() => {
    if (!purchaseSearch.trim()) return purchaseAccounts;
    const q = purchaseSearch.toLowerCase();
    return purchaseAccounts.filter(
      (a) =>
        a.account_name.toLowerCase().includes(q) ||
        (a.account_code && a.account_code.toLowerCase().includes(q))
    );
  }, [purchaseAccounts, purchaseSearch]);

  // Get account display name by ID
  const getAccountDisplay = (id: string) => {
    const acct = accounts.find((a) => a.id === id);
    if (!acct) return "";
    return acct.account_code
      ? `${acct.account_code} — ${acct.account_name}`
      : acct.account_name;
  };

  // Reset form when opening
  useEffect(() => {
    if (!open) return;

    if (editItem) {
      setName(editItem.name);
      setItemType(editItem.item_type);
      setDescription(editItem.description || "");
      setDefaultUnitPrice(
        editItem.default_unit_price !== null
          ? String(editItem.default_unit_price)
          : ""
      );
      setDefaultSalesAccountId(editItem.default_sales_account_id || "");
      setDefaultPurchaseAccountId(editItem.default_purchase_account_id || "");
      setDefaultTaxTreatment(editItem.default_tax_treatment);
      setDefaultPurchaseCategory(editItem.default_purchase_category || "");
    } else {
      setName("");
      setItemType("product");
      setDescription("");
      setDefaultUnitPrice("");
      setDefaultSalesAccountId("");
      setDefaultPurchaseAccountId("");
      setDefaultTaxTreatment("vatable");
      setDefaultPurchaseCategory("");
    }
    setNameError("");
    setPriceError("");
    setSalesSearch("");
    setPurchaseSearch("");
    setSalesDropdownOpen(false);
    setPurchaseDropdownOpen(false);
  }, [open, editItem]);

  const handleSave = async () => {
    if (!authUser) return;

    // Validate
    setNameError("");
    setPriceError("");
    let hasError = false;

    if (!name.trim()) {
      setNameError("Item name is required.");
      hasError = true;
    }

    const priceNum = defaultUnitPrice.trim()
      ? parseFloat(defaultUnitPrice.trim())
      : null;
    if (defaultUnitPrice.trim()) {
      if (isNaN(priceNum!)) {
        setPriceError("Please enter a valid number.");
        hasError = true;
      } else if (priceNum! < 0) {
        setPriceError("Price cannot be negative.");
        hasError = true;
      }
    }

    if (hasError) return;

    setSaving(true);
    try {
      // Check unique name
      const taken = await isItemNameTaken(
        authUser.entity.id,
        name,
        isEditMode ? editItem!.id : undefined
      );
      if (taken) {
        setNameError("An item with this name already exists.");
        setSaving(false);
        return;
      }

      const payload = {
        name: name.trim(),
        item_type: itemType,
        description: description.trim() || null,
        default_unit_price: priceNum,
        default_sales_account_id: defaultSalesAccountId || null,
        default_purchase_account_id: defaultPurchaseAccountId || null,
        default_tax_treatment: defaultTaxTreatment,
        default_purchase_category:
          (defaultPurchaseCategory as PurchaseCategory) || null,
      };

      if (isEditMode) {
        const oldValues = {
          name: editItem!.name,
          item_type: editItem!.item_type,
          description: editItem!.description,
          default_unit_price: editItem!.default_unit_price,
          default_sales_account_id: editItem!.default_sales_account_id,
          default_purchase_account_id: editItem!.default_purchase_account_id,
          default_tax_treatment: editItem!.default_tax_treatment,
          default_purchase_category: editItem!.default_purchase_category,
        };

        await updateItem(editItem!.id, payload);

        await logAuditEntry({
          entity_id: authUser.entity.id,
          user_id: authUser.user.id,
          action: "edit",
          entity_type: "item",
          entity_record_id: editItem!.id,
          old_values: oldValues,
          new_values: payload,
        });

        toast.success(`"${name.trim()}" updated.`);
      } else {
        const newItem = await createItem({
          entity_id: authUser.entity.id,
          ...payload,
          is_active: true,
        });

        await logAuditEntry({
          entity_id: authUser.entity.id,
          user_id: authUser.user.id,
          action: "create",
          entity_type: "item",
          entity_record_id: newItem.id,
          old_values: null,
          new_values: payload,
        });

        toast.success(`"${name.trim()}" added.`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const pgError = err as { message?: string; details?: string; code?: string };
      const message = pgError?.message || "Something went wrong. Please try again.";
      console.error("Item save error:", err);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const title = isEditMode ? "Edit Item" : "Add Item";

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setItemType("product")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  itemType === "product"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Product
              </button>
              <button
                type="button"
                onClick={() => setItemType("service")}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  itemType === "service"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Service
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              maxLength={255}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                nameError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="Item name"
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{nameError}</p>
            )}
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
              placeholder="Description (auto-fills on transaction lines)"
            />
          </div>

          {/* Default Unit Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Unit Price
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={defaultUnitPrice}
              onChange={(e) => {
                setDefaultUnitPrice(e.target.value);
                setPriceError("");
              }}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                priceError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="0.00"
            />
            {priceError && (
              <p className="text-xs text-red-500 mt-1">{priceError}</p>
            )}
          </div>

          {/* Default Sales Account */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Sales Account
            </label>
            <div
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 cursor-pointer focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
              onClick={() => {
                setSalesDropdownOpen(!salesDropdownOpen);
                setPurchaseDropdownOpen(false);
              }}
            >
              {defaultSalesAccountId ? (
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {getAccountDisplay(defaultSalesAccountId)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefaultSalesAccountId("");
                      setSalesDropdownOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">Select revenue account...</span>
              )}
            </div>

            {salesDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      placeholder="Search accounts..."
                      className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredSalesAccounts.length === 0 ? (
                    <p className="text-sm text-gray-400 px-3 py-2">
                      No matching accounts
                    </p>
                  ) : (
                    filteredSalesAccounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultSalesAccountId(a.id);
                          setSalesDropdownOpen(false);
                          setSalesSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                          a.id === defaultSalesAccountId
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

          {/* Default Purchase Account */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Purchase Account
            </label>
            <div
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 cursor-pointer focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
              onClick={() => {
                setPurchaseDropdownOpen(!purchaseDropdownOpen);
                setSalesDropdownOpen(false);
              }}
            >
              {defaultPurchaseAccountId ? (
                <div className="flex items-center justify-between">
                  <span className="truncate">
                    {getAccountDisplay(defaultPurchaseAccountId)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefaultPurchaseAccountId("");
                      setPurchaseDropdownOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className="text-gray-400">
                  Select expense/asset account...
                </span>
              )}
            </div>

            {purchaseDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      placeholder="Search accounts..."
                      className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredPurchaseAccounts.length === 0 ? (
                    <p className="text-sm text-gray-400 px-3 py-2">
                      No matching accounts
                    </p>
                  ) : (
                    filteredPurchaseAccounts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultPurchaseAccountId(a.id);
                          setPurchaseDropdownOpen(false);
                          setPurchaseSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                          a.id === defaultPurchaseAccountId
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

          {/* Default Tax Treatment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Tax Treatment <span className="text-red-500">*</span>
            </label>
            <select
              value={defaultTaxTreatment}
              onChange={(e) =>
                setDefaultTaxTreatment(e.target.value as TaxTreatment)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(
                Object.entries(TAX_TREATMENT_LABELS) as [
                  TaxTreatment,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Default Purchase Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Purchase Category
            </label>
            <select
              value={defaultPurchaseCategory}
              onChange={(e) => setDefaultPurchaseCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {(
                Object.entries(PURCHASE_CATEGORY_LABELS) as [
                  PurchaseCategory,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Only relevant for items used in purchases.
            </p>
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
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </>
  );
}
