"use client";

import type { Account, TypeGroup } from "@/lib/accounts/types";
import AccountTypeGroup from "./account-type-group";

interface AccountsTreeProps {
  tree: TypeGroup[];
  showInactive: boolean;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export default function AccountsTree({
  tree,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: AccountsTreeProps) {
  if (tree.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      {tree.map((group) => (
        <AccountTypeGroup
          key={group.type}
          group={group}
          showInactive={showInactive}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
