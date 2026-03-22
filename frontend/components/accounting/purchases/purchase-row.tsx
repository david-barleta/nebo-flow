"use client";

import type { PurchaseWithStakeholder, PurchaseStatus } from "@/lib/purchases/types";
import {
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_COLORS,
  formatCurrency,
} from "@/lib/purchases/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Stakeholder } from "@/lib/stakeholders/types";

interface PurchaseRowProps {
  purchase: PurchaseWithStakeholder;
  onClick: (purchase: PurchaseWithStakeholder) => void;
}

export default function PurchaseRow({ purchase, onClick }: PurchaseRowProps) {
  const stakeholderName = purchase.stakeholder
    ? getStakeholderDisplayName(purchase.stakeholder as unknown as Stakeholder)
    : "Walk-in";

  const status = purchase.status as PurchaseStatus;
  const displayNumber = purchase.purchase_voucher_number || purchase.document_number;

  return (
    <tr
      onClick={() => onClick(purchase)}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-6 py-3.5 text-sm font-medium text-blue-600">
        {displayNumber}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {purchase.transaction_date}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">{stakeholderName}</td>
      <td className="px-6 py-3.5 text-sm text-gray-900 font-mono text-right">
        {formatCurrency(purchase.total_amount)}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-900 font-mono text-right">
        {formatCurrency(purchase.outstanding_balance)}
      </td>
      <td className="px-6 py-3.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PURCHASE_STATUS_COLORS[status]}`}
        >
          {PURCHASE_STATUS_LABELS[status]}
        </span>
      </td>
    </tr>
  );
}
