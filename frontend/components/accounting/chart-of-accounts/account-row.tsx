"use client";

import { Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import type { Account } from "@/lib/accounts/types";

interface AccountRowProps {
  account: Account;
  indent: number; // 0-based indent level for padding
  showInactive: boolean;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export default function AccountRow({
  account,
  indent,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: AccountRowProps) {
  if (!account.is_active && !showInactive) return null;

  const paddingLeft = 16 + indent * 24;

  return (
    <div
      className={`group flex items-center gap-3 py-2 px-4 hover:bg-gray-50 transition-colors ${
        !account.is_active ? "opacity-40" : ""
      }`}
      style={{ paddingLeft }}
    >
      <span className="font-mono text-sm font-semibold text-gray-500 w-14 shrink-0">
        {account.account_code}
      </span>
      <span className="text-sm text-gray-800 flex-1">{account.account_name}</span>

      {account.is_contra && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium shrink-0">
          Contra
        </span>
      )}

      {!account.is_active && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 font-medium shrink-0">
          Inactive
        </span>
      )}

      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(account)}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onToggleActive(account)}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
          title={account.is_active ? "Deactivate" : "Reactivate"}
        >
          {account.is_active ? <Archive size={14} /> : <RotateCcw size={14} />}
        </button>
        <button
          onClick={() => onDelete(account)}
          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
