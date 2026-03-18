"use client";

import { Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import type { Item } from "@/lib/items/types";
import { ITEM_TYPE_LABELS, TAX_TREATMENT_LABELS } from "@/lib/items/types";

interface ItemRowProps {
  item: Item;
  showStatus: boolean;
  isSetupMode: boolean;
  onEdit: (item: Item) => void;
  onToggleActive: (item: Item) => void;
  onDelete: (item: Item) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "\u2014";
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ItemRow({
  item,
  showStatus,
  isSetupMode,
  onEdit,
  onToggleActive,
  onDelete,
}: ItemRowProps) {
  const isInactive = !item.is_active;

  return (
    <tr
      className={`group border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isInactive ? "opacity-50" : ""
      }`}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-900">{item.name}</span>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            item.item_type === "product"
              ? "bg-blue-50 text-blue-700"
              : "bg-purple-50 text-purple-700"
          }`}
        >
          {ITEM_TYPE_LABELS[item.item_type]}
        </span>
      </td>

      {/* Default Unit Price */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 font-mono">
          {formatCurrency(item.default_unit_price)}
        </span>
      </td>

      {/* Tax Treatment */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700">
          {TAX_TREATMENT_LABELS[item.default_tax_treatment]}
        </span>
      </td>

      {/* Status */}
      {showStatus && (
        <td className="px-4 py-3">
          {item.is_active ? (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              Inactive
            </span>
          )}
        </td>
      )}

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Edit"
          >
            <Pencil size={15} />
          </button>

          {item.is_active ? (
            <button
              onClick={() => onToggleActive(item)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Deactivate"
            >
              <Archive size={15} />
            </button>
          ) : (
            <button
              onClick={() => onToggleActive(item)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Reactivate"
            >
              <RotateCcw size={15} />
            </button>
          )}

          {isSetupMode && (
            <button
              onClick={() => onDelete(item)}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
