"use client";

import { Search } from "lucide-react";

interface StakeholderSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (val: boolean) => void;
  placeholder?: string;
}

export default function StakeholderSearch({
  query,
  onQueryChange,
  showInactive,
  onShowInactiveChange,
  placeholder = "Search...",
}: StakeholderSearchProps) {
  return (
    <div className="flex items-center gap-4">
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
          placeholder={placeholder}
          className="w-64 rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Show inactive toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={showInactive}
          onClick={() => onShowInactiveChange(!showInactive)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            showInactive ? "bg-blue-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              showInactive ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-gray-600">Show inactive</span>
      </label>
    </div>
  );
}
