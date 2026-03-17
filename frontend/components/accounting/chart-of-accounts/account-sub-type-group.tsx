"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Account, SubTypeGroup } from "@/lib/accounts/types";
import AccountHeaderGroup from "./account-header-group";
import AccountRow from "./account-row";

interface AccountSubTypeGroupProps {
  group: SubTypeGroup;
  showInactive: boolean;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export default function AccountSubTypeGroup({
  group,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: AccountSubTypeGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-4 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: 32 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
        <span className="text-sm font-semibold text-gray-600">
          {group.subType}
        </span>
      </div>

      {expanded && (
        <>
          {group.headers.map((headerNode) => (
            <AccountHeaderGroup
              key={headerNode.account.id}
              node={headerNode}
              indent={2}
              showInactive={showInactive}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
            />
          ))}

          {group.standaloneAccounts
            .filter((a) => showInactive || a.is_active)
            .map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                indent={2}
                showInactive={showInactive}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            ))}
        </>
      )}
    </div>
  );
}
