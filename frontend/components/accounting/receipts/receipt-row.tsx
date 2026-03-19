"use client";

import type {
  ReceiptWithStakeholder,
  ReceiptStatus,
} from "@/lib/receipts/types";
import {
  PAYMENT_METHOD_LABELS,
  RECEIPT_STATUS_LABELS,
  RECEIPT_STATUS_COLORS,
  formatCurrency,
} from "@/lib/receipts/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Stakeholder } from "@/lib/stakeholders/types";

interface ReceiptRowProps {
  receipt: ReceiptWithStakeholder;
  onClick: (receipt: ReceiptWithStakeholder) => void;
}

export default function ReceiptRow({ receipt, onClick }: ReceiptRowProps) {
  const stakeholderName = receipt.stakeholder
    ? getStakeholderDisplayName(
        receipt.stakeholder as unknown as Stakeholder
      )
    : receipt.is_standalone
      ? "Standalone"
      : "—";

  const status = receipt.status as ReceiptStatus;

  return (
    <tr
      onClick={() => onClick(receipt)}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-6 py-3.5 text-sm font-medium text-blue-600">
        {receipt.document_number}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {receipt.transaction_date}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {stakeholderName}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-900 font-mono text-right">
        {formatCurrency(receipt.amount)}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {receipt.is_standalone ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700">
            Standalone
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
            Applied
          </span>
        )}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {PAYMENT_METHOD_LABELS[receipt.payment_method]}
      </td>
      <td className="px-6 py-3.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RECEIPT_STATUS_COLORS[status]}`}
        >
          {RECEIPT_STATUS_LABELS[status]}
        </span>
      </td>
    </tr>
  );
}
