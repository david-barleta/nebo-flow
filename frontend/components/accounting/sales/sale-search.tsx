"use client";

import { Search } from "lucide-react";
import type { PaymentType, SaleStatus } from "@/lib/sales/types";

type StatusFilter = "all" | SaleStatus;
type PaymentFilter = "all" | PaymentType;

interface SaleSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (val: PaymentFilter) => void;
}

export default function SaleSearch({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
}: SaleSearchProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search sales..."
          className="w-64 rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Statuses</option>
        <option value="posted">Unpaid</option>
        <option value="partially_paid">Partially Paid</option>
        <option value="paid">Paid</option>
        <option value="draft">Draft</option>
        <option value="pending_approval">Pending Approval</option>
        <option value="voided">Voided</option>
      </select>

      {/* Payment type filter */}
      <select
        value={paymentFilter}
        onChange={(e) => onPaymentFilterChange(e.target.value as PaymentFilter)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Types</option>
        <option value="cash">Cash</option>
        <option value="on_account">On Account</option>
      </select>
    </div>
  );
}
