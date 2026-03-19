"use client";

import { Search } from "lucide-react";
import type { PaymentMethod, ReceiptStatus } from "@/lib/receipts/types";

type StatusFilter = "all" | ReceiptStatus;
type MethodFilter = "all" | PaymentMethod;
type TypeFilter = "all" | "applied" | "standalone";

interface ReceiptSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
  methodFilter: MethodFilter;
  onMethodFilterChange: (val: MethodFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (val: TypeFilter) => void;
}

export default function ReceiptSearch({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  methodFilter,
  onMethodFilterChange,
  typeFilter,
  onTypeFilterChange,
}: ReceiptSearchProps) {
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
          placeholder="Search receipts..."
          className="w-64 rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Types</option>
        <option value="applied">Applied</option>
        <option value="standalone">Standalone</option>
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) =>
          onStatusFilterChange(e.target.value as StatusFilter)
        }
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Statuses</option>
        <option value="posted">Posted</option>
        <option value="draft">Draft</option>
        <option value="pending_approval">Pending Approval</option>
        <option value="voided">Voided</option>
      </select>

      {/* Payment method filter */}
      <select
        value={methodFilter}
        onChange={(e) =>
          onMethodFilterChange(e.target.value as MethodFilter)
        }
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Methods</option>
        <option value="cash">Cash</option>
        <option value="check">Check</option>
        <option value="bank_transfer">Bank Transfer</option>
      </select>
    </div>
  );
}
