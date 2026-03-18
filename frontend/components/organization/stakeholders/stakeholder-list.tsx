"use client";

import { useMemo, useState } from "react";
import type { Stakeholder, StakeholderMode } from "@/lib/stakeholders/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import StakeholderRow from "./stakeholder-row";

const PAGE_SIZE = 25;
const SHOW_ALL_THRESHOLD = 50;

interface StakeholderListProps {
  stakeholders: Stakeholder[];
  mode: StakeholderMode;
  searchQuery: string;
  showInactive: boolean;
  onEdit: (s: Stakeholder) => void;
  onToggleActive: (s: Stakeholder) => void;
  onDelete: (s: Stakeholder) => void;
}

export default function StakeholderList({
  stakeholders,
  mode,
  searchQuery,
  showInactive,
  onEdit,
  onToggleActive,
  onDelete,
}: StakeholderListProps) {
  const [page, setPage] = useState(0);

  // Filter by search query (name, contact_person, email, phone, tin)
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return stakeholders;
    const q = searchQuery.toLowerCase();
    return stakeholders.filter((s) =>
      [
        getStakeholderDisplayName(s),
        s.contact_person,
        s.email,
        s.phone,
        s.tin,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [stakeholders, searchQuery]);

  // Reset page when search changes
  useMemo(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Pagination
  const needsPagination = filtered.length > SHOW_ALL_THRESHOLD;
  const pageCount = needsPagination
    ? Math.ceil(filtered.length / PAGE_SIZE)
    : 1;
  const displayed = needsPagination
    ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : filtered;

  const start = needsPagination ? page * PAGE_SIZE + 1 : 1;
  const end = needsPagination
    ? Math.min((page + 1) * PAGE_SIZE, filtered.length)
    : filtered.length;

  const label = mode === "client" ? "clients" : "suppliers";

  if (filtered.length === 0 && searchQuery) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">
          No {label} match &ldquo;{searchQuery}&rdquo;
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contact Person
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                TIN
              </th>
              {showInactive && (
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
            {displayed.map((s) => (
              <StakeholderRow
                key={s.id}
                stakeholder={s}
                mode={mode}
                showInactive={showInactive}
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
            Showing {start}-{end} of {filtered.length} {label}
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
