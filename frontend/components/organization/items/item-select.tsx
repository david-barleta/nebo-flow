"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Package, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { fetchItems } from "@/lib/items/queries";
import type { Item } from "@/lib/items/types";
import { deriveVatRate } from "@/lib/items/types";

/**
 * Fields auto-populated when an item is selected on a transaction line.
 * All fields are overridable by the user.
 */
export interface ItemSelectionResult {
  item_id: string | null;
  item_type: "product" | "service" | null;
  description: string | null;
  unit_price: number | null;
  account_id: string | null;
  tax_treatment: string;
  vat_rate: number;
  purchase_category: string | null;
  price_entry_mode: string;
  ewt_rate_id: string | null;
}

type TransactionContext = "sale" | "purchase";

interface ItemSelectProps {
  /** Current selected item ID (controlled) */
  value: string | null;
  /** Called when item selection changes */
  onSelect: (result: ItemSelectionResult) => void;
  /** Whether this is a sale or purchase context — determines which default account to use */
  context: TransactionContext;
  /** Optional placeholder text */
  placeholder?: string;
  /** Disable the selector */
  disabled?: boolean;
}

/**
 * Reusable item selection dropdown for transaction forms.
 *
 * When an item is selected, it auto-populates:
 * - description ← items.description
 * - unit_price ← items.default_unit_price
 * - account_id ← default_sales_account_id (sales) or default_purchase_account_id (purchases)
 * - tax_treatment ← items.default_tax_treatment
 * - vat_rate ← derived from tax_treatment (12% if vatable, 0% otherwise)
 * - purchase_category ← items.default_purchase_category (purchases only)
 */
export default function ItemSelect({
  value,
  onSelect,
  context,
  placeholder = "Select item...",
  disabled = false,
}: ItemSelectProps) {
  const { authUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load active items
  useEffect(() => {
    if (!authUser) return;
    fetchItems(authUser.entity.id, false)
      .then(setItems)
      .catch(() => {});
  }, [authUser]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    let list = items;
    if (context === "purchase") {
      list = list.filter((i) => i.item_type !== "service");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, search, context]);

  const selectedItem = useMemo(
    () => (value ? items.find((i) => i.id === value) ?? null : null),
    [items, value]
  );

  const handleSelect = (item: Item) => {
    const accountId =
      context === "sale"
        ? item.default_sales_account_id
        : item.default_purchase_account_id;

    onSelect({
      item_id: item.id,
      item_type: item.item_type,
      description: item.description,
      unit_price: item.default_unit_price,
      account_id: accountId,
      tax_treatment: item.default_tax_treatment,
      vat_rate: deriveVatRate(item.default_tax_treatment),
      purchase_category:
        context === "purchase" ? item.default_purchase_category : null,
      price_entry_mode: item.default_price_entry_mode ?? "vat_exclusive",
      ewt_rate_id: item.default_ewt_rate_id ?? null,
    });
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onSelect({
      item_id: null,
      item_type: null,
      description: null,
      unit_price: null,
      account_id: null,
      tax_treatment: "vatable",
      vat_rate: 12.0,
      purchase_category: null,
      price_entry_mode: "vat_exclusive",
      ewt_rate_id: null,
    });
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
          disabled
            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
            : "text-gray-900 hover:border-gray-400"
        }`}
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
      >
        {selectedItem ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedItem.item_type === "product" ? (
              <Package size={14} className="text-blue-500 shrink-0" />
            ) : (
              <Wrench size={14} className="text-purple-500 shrink-0" />
            )}
            <span className="truncate">{selectedItem.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-gray-400 hover:text-gray-600 ml-auto shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>

      {open && (
        <div
          className="fixed z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-hidden"
          style={{
            top: containerRef.current
              ? containerRef.current.getBoundingClientRect().bottom + 4
              : 0,
            left: containerRef.current
              ? containerRef.current.getBoundingClientRect().left
              : 0,
          }}
        >
          {/* Search */}
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
                placeholder="Search items..."
                className="w-full rounded border border-gray-200 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-2">No items found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 ${
                    item.id === value
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  {item.item_type === "product" ? (
                    <Package size={14} className="text-blue-500 shrink-0" />
                  ) : (
                    <Wrench size={14} className="text-purple-500 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                  {item.default_unit_price !== null && (
                    <span className="ml-auto text-xs text-gray-400 font-mono shrink-0">
                      {item.default_unit_price.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
