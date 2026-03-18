"use client";

import { Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import type { Stakeholder, StakeholderMode } from "@/lib/stakeholders/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";

interface StakeholderRowProps {
  stakeholder: Stakeholder;
  mode: StakeholderMode;
  showInactive: boolean;
  onEdit: (s: Stakeholder) => void;
  onToggleActive: (s: Stakeholder) => void;
  onDelete: (s: Stakeholder) => void;
}

export default function StakeholderRow({
  stakeholder,
  mode,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: StakeholderRowProps) {
  const isInactive = !stakeholder.is_active;

  // "Also Supplier" or "Also Client" badge
  const showAlsoBadge =
    (mode === "client" && stakeholder.is_supplier) ||
    (mode === "supplier" && stakeholder.is_client);
  const alsoBadgeLabel = mode === "client" ? "Also Supplier" : "Also Client";

  return (
    <tr
      className={`group border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isInactive ? "opacity-50" : ""
      }`}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {getStakeholderDisplayName(stakeholder)}
          </span>
          {showAlsoBadge && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              {alsoBadgeLabel}
            </span>
          )}
        </div>
      </td>

      {/* Contact Person */}
      <td className="px-4 py-3">
        <span
          className={`text-sm ${
            stakeholder.contact_person ? "text-gray-700" : "text-gray-300"
          }`}
        >
          {stakeholder.contact_person || "—"}
        </span>
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700">
          {stakeholder.phone || "—"}
        </span>
      </td>

      {/* Email */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700">
          {stakeholder.email || "—"}
        </span>
      </td>

      {/* TIN */}
      <td className="px-4 py-3">
        <span
          className={`text-sm font-mono ${
            stakeholder.tin ? "text-gray-700" : "text-gray-300"
          }`}
        >
          {stakeholder.tin || "—"}
        </span>
      </td>

      {/* Status (only visible when showing inactive) */}
      {showInactive && (
        <td className="px-4 py-3">
          {stakeholder.is_active ? (
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
            onClick={() => onEdit(stakeholder)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Edit"
          >
            <Pencil size={15} />
          </button>

          {stakeholder.is_active ? (
            <button
              onClick={() => onToggleActive(stakeholder)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Deactivate"
            >
              <Archive size={15} />
            </button>
          ) : (
            <button
              onClick={() => onToggleActive(stakeholder)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Reactivate"
            >
              <RotateCcw size={15} />
            </button>
          )}

          <button
            onClick={() => onDelete(stakeholder)}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
