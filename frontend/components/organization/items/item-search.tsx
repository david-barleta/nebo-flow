"use client";

import { Search } from "lucide-react";
import type { ItemType } from "@/lib/items/types";

type StatusFilter = "active" | "inactive" | "all";
type TypeFilter = "all" | ItemType;

interface ItemSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (val: TypeFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
}

export default function ItemSearch({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}: ItemSearchProps) {
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
          placeholder="Search items..."
          className="w-64 rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Types</option>
        <option value="product">Products</option>
        <option value="service">Services</option>
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}
