"use client";

import type { SaleWithStakeholder, SaleStatus } from "@/lib/sales/types";
import {
  PAYMENT_TYPE_LABELS,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  formatCurrency,
} from "@/lib/sales/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Stakeholder } from "@/lib/stakeholders/types";

interface SaleRowProps {
  sale: SaleWithStakeholder;
  onClick: (sale: SaleWithStakeholder) => void;
}

export default function SaleRow({ sale, onClick }: SaleRowProps) {
  const stakeholderName = sale.stakeholder
    ? getStakeholderDisplayName(sale.stakeholder as unknown as Stakeholder)
    : "Walk-in";

  const status = sale.status as SaleStatus;
  const displayNumber = sale.sales_invoice_number || sale.document_number;

  return (
    <tr
      onClick={() => onClick(sale)}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-6 py-3.5 text-sm font-medium text-blue-600">
        {displayNumber}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {sale.transaction_date}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-700">{stakeholderName}</td>
      <td className="px-6 py-3.5 text-sm text-gray-700">
        {PAYMENT_TYPE_LABELS[sale.payment_type]}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-900 font-mono text-right">
        {formatCurrency(sale.total_amount)}
      </td>
      <td className="px-6 py-3.5 text-sm text-gray-900 font-mono text-right">
        {formatCurrency(sale.outstanding_balance)}
      </td>
      <td className="px-6 py-3.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SALE_STATUS_COLORS[status]}`}
        >
          {SALE_STATUS_LABELS[status]}
        </span>
      </td>
    </tr>
  );
}
