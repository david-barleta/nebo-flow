"use client";

import type { StakeholderMode } from "@/lib/stakeholders/types";

interface StakeholderEmptyStateProps {
  mode: StakeholderMode;
  onAdd: () => void;
}

export default function StakeholderEmptyState({
  mode,
  onAdd,
}: StakeholderEmptyStateProps) {
  const label = mode === "client" ? "client" : "supplier";

  return (
    <div className="rounded-xl border border-gray-200 bg-white flex flex-col items-center justify-center py-20 px-6 text-center">
      <p className="text-gray-500 text-sm mb-4">
        No {label}s yet. Add your first {label} to get started.
      </p>
      <button
        onClick={onAdd}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        + Add {mode === "client" ? "Client" : "Supplier"}
      </button>
    </div>
  );
}
