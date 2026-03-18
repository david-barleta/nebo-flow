"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Item, ItemType } from "@/lib/items/types";
import ItemRow from "./item-row";

const PAGE_SIZE = 25;
const SHOW_ALL_THRESHOLD = 50;

type SortField = "name" | "item_type" | "default_unit_price";
type SortDir = "asc" | "desc";
type StatusFilter = "active" | "inactive" | "all";
type TypeFilter = "all" | ItemType;

interface ItemListProps {
  items: Item[];
  searchQuery: string;
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  isSetupMode: boolean;
  onEdit: (item: Item) => void;
  onToggleActive: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export default function ItemList({
  items,
  searchQuery,
  typeFilter,
  statusFilter,
  isSetupMode,
  onEdit,
  onToggleActive,
  onDelete,
}: ItemListProps) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filter by type
  const typeFiltered = useMemo(() => {
    if (typeFilter === "all") return items;
    return items.filter((i) => i.item_type === typeFilter);
  }, [items, typeFilter]);

  // Filter by status
  const statusFiltered = useMemo(() => {
    if (statusFilter === "all") return typeFiltered;
    return typeFiltered.filter((i) =>
      statusFilter === "active" ? i.is_active : !i.is_active
    );
  }, [typeFiltered, statusFilter]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return statusFiltered;
    const q = searchQuery.toLowerCase();
    return statusFiltered.filter((i) =>
      [i.name, i.description].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    );
  }, [statusFiltered, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "item_type") {
        cmp = a.item_type.localeCompare(b.item_type);
      } else if (sortField === "default_unit_price") {
        cmp = (a.default_unit_price ?? 0) - (b.default_unit_price ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  // Reset page when filters change
  useMemo(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, typeFilter, statusFilter, sortField, sortDir]);

  // Pagination
  const needsPagination = sorted.length > SHOW_ALL_THRESHOLD;
  const pageCount = needsPagination ? Math.ceil(sorted.length / PAGE_SIZE) : 1;
  const displayed = needsPagination
    ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : sorted;

  const start = needsPagination ? page * PAGE_SIZE + 1 : 1;
  const end = needsPagination
    ? Math.min((page + 1) * PAGE_SIZE, sorted.length)
    : sorted.length;

  const showStatus = statusFilter === "all" || statusFilter === "inactive";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronUp size={14} className="opacity-0 group-hover/th:opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp size={14} className="text-blue-600" />
    ) : (
      <ChevronDown size={14} className="text-blue-600" />
    );
  };

  if (sorted.length === 0 && searchQuery) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">
          No items match &ldquo;{searchQuery}&rdquo;
        </p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">
          No {statusFilter === "inactive" ? "inactive" : ""} items found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th
                onClick={() => handleSort("name")}
                className="group/th px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Name <SortIcon field="name" />
                </div>
              </th>
              <th
                onClick={() => handleSort("item_type")}
                className="group/th px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Type <SortIcon field="item_type" />
                </div>
              </th>
              <th
                onClick={() => handleSort("default_unit_price")}
                className="group/th px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center gap-1">
                  Default Price <SortIcon field="default_unit_price" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tax Treatment
              </th>
              {showStatus && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                showStatus={showStatus}
                isSetupMode={isSetupMode}
                onEdit={onEdit}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {needsPagination && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {start}-{end} of {sorted.length} items
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
