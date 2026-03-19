"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type {
  ReceiptWithStakeholder,
  PaymentMethod,
  ReceiptStatus,
} from "@/lib/receipts/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Stakeholder } from "@/lib/stakeholders/types";
import ReceiptRow from "./receipt-row";

const PAGE_SIZE = 25;
const SHOW_ALL_THRESHOLD = 50;

type SortField = "document_number" | "transaction_date" | "amount" | "status";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | ReceiptStatus;
type MethodFilter = "all" | PaymentMethod;
type TypeFilter = "all" | "applied" | "standalone";

interface ReceiptListProps {
  receipts: ReceiptWithStakeholder[];
  searchQuery: string;
  statusFilter: StatusFilter;
  methodFilter: MethodFilter;
  typeFilter: TypeFilter;
  onClick: (receipt: ReceiptWithStakeholder) => void;
}

export default function ReceiptList({
  receipts,
  searchQuery,
  statusFilter,
  methodFilter,
  typeFilter,
  onClick,
}: ReceiptListProps) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("transaction_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Filter by status
  const statusFiltered = useMemo(() => {
    if (statusFilter === "all") return receipts;
    return receipts.filter((r) => r.status === statusFilter);
  }, [receipts, statusFilter]);

  // Filter by payment method
  const methodFiltered = useMemo(() => {
    if (methodFilter === "all") return statusFiltered;
    return statusFiltered.filter((r) => r.payment_method === methodFilter);
  }, [statusFiltered, methodFilter]);

  // Filter by type
  const typeFiltered = useMemo(() => {
    if (typeFilter === "all") return methodFiltered;
    if (typeFilter === "standalone")
      return methodFiltered.filter((r) => r.is_standalone);
    return methodFiltered.filter((r) => !r.is_standalone);
  }, [methodFiltered, typeFilter]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return typeFiltered;
    const q = searchQuery.toLowerCase();
    return typeFiltered.filter((r) => {
      const stakeholderName = r.stakeholder
        ? getStakeholderDisplayName(r.stakeholder as unknown as Stakeholder)
        : "";
      return (
        r.document_number.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        stakeholderName.toLowerCase().includes(q)
      );
    });
  }, [typeFiltered, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...searchFiltered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "document_number") {
        cmp = a.document_number.localeCompare(b.document_number);
      } else if (sortField === "transaction_date") {
        cmp = a.transaction_date.localeCompare(b.transaction_date);
      } else if (sortField === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortField === "status") {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [searchFiltered, sortField, sortDir]);

  // Pagination
  const needsPagination = sorted.length > SHOW_ALL_THRESHOLD;
  const pageCount = needsPagination
    ? Math.ceil(sorted.length / PAGE_SIZE)
    : 1;
  const displayed = needsPagination
    ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : sorted;

  // Reset page on filter change
  useMemo(() => {
    setPage(0);
  }, [searchQuery, statusFilter, methodFilter, typeFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "amount" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white flex items-center justify-center py-16">
        <p className="text-sm text-gray-500">
          No receipts match your filters.
        </p>
      </div>
    );
  }

  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, sorted.length);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                <button
                  onClick={() => toggleSort("document_number")}
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  Receipt # <SortIcon field="document_number" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                <button
                  onClick={() => toggleSort("transaction_date")}
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  Date <SortIcon field="transaction_date" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                Client
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900">
                <button
                  onClick={() => toggleSort("amount")}
                  className="flex items-center gap-1 hover:text-gray-600 ml-auto"
                >
                  Amount <SortIcon field="amount" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900">
                <button
                  onClick={() => toggleSort("status")}
                  className="flex items-center gap-1 hover:text-gray-600"
                >
                  Status <SortIcon field="status" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((receipt) => (
              <ReceiptRow
                key={receipt.id}
                receipt={receipt}
                onClick={onClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {needsPagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {start} to {end} of {sorted.length}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
