"use client";

import { useState } from "react";
import { FolderOpen, Folder, ChevronDown, ChevronRight, Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import type { Account, AccountTreeNode } from "@/lib/accounts/types";
import AccountRow from "./account-row";

interface AccountHeaderGroupProps {
  node: AccountTreeNode;
  indent: number;
  showInactive: boolean;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export default function AccountHeaderGroup({
  node,
  indent,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: AccountHeaderGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const { account, children } = node;

  if (!account.is_active && !showInactive) return null;

  const paddingLeft = 16 + indent * 24;
  const visibleChildren = showInactive
    ? children
    : children.filter((c) => c.account.is_active);

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 px-4 hover:bg-gray-50 transition-colors cursor-pointer ${
          !account.is_active ? "opacity-40" : ""
        }`}
        style={{ paddingLeft }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 shrink-0" />
        )}
        {expanded ? (
          <FolderOpen size={16} className="text-gray-500 shrink-0" />
        ) : (
          <Folder size={16} className="text-gray-500 shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-700 flex-1">
          {account.account_name}
        </span>

        {!account.is_active && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 font-medium shrink-0">
            Inactive
          </span>
        )}

        <div
          className="hidden group-hover:flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
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

      {expanded &&
        visibleChildren.map((child) => (
          <AccountRow
            key={child.account.id}
            account={child.account}
            indent={indent + 1}
            showInactive={showInactive}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
