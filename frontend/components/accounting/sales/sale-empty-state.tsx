"use client";

interface SaleEmptyStateProps {
  onAdd: () => void;
}

export default function SaleEmptyState({ onAdd }: SaleEmptyStateProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white flex flex-col items-center justify-center py-20 px-6 text-center">
      <p className="text-gray-500 text-sm mb-4">
        No sales yet. Create your first sales invoice to get started.
      </p>
      <button
        onClick={onAdd}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        + New Sale
      </button>
    </div>
  );
}
