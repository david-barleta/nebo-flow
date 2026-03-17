"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Account, TypeGroup } from "@/lib/accounts/types";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from "@/lib/accounts/types";
import AccountSubTypeGroup from "./account-sub-type-group";

interface AccountTypeGroupProps {
  group: TypeGroup;
  showInactive: boolean;
  onEdit: (account: Account) => void;
  onToggleActive: (account: Account) => void;
  onDelete: (account: Account) => void;
}

export default function AccountTypeGroup({
  group,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: AccountTypeGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      <div
        className={`flex items-center gap-2 py-2.5 px-4 cursor-pointer rounded-lg ${ACCOUNT_TYPE_COLORS[group.type]}`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={16} className="opacity-60" />
        ) : (
          <ChevronRight size={16} className="opacity-60" />
        )}
        <span className="text-sm font-bold tracking-wide">
          {ACCOUNT_TYPE_LABELS[group.type]}
        </span>
      </div>

      {expanded &&
        group.subTypes.map((stGroup) => (
          <AccountSubTypeGroup
            key={stGroup.subType}
            group={stGroup}
            showInactive={showInactive}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
