"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type {
  ReceiptWithStakeholder,
  PaymentMethod,
  ReceiptStatus,
} from "@/lib/receipts/types";
import { fetchReceipts } from "@/lib/receipts/queries";
import ReceiptSearch from "@/components/accounting/receipts/receipt-search";
import ReceiptList from "@/components/accounting/receipts/receipt-list";
import ReceiptEmptyState from "@/components/accounting/receipts/receipt-empty-state";
import ReceiptForm from "@/components/accounting/receipts/receipt-form";

type StatusFilter = "all" | ReceiptStatus;
type MethodFilter = "all" | PaymentMethod;
type TypeFilter = "all" | "applied" | "standalone";

export default function ReceiptsPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { authUser } = useAuth();

  const [receipts, setReceipts] = useState<ReceiptWithStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showForm, setShowForm] = useState(false);

  // Page title from entity_labels or default
  const [pageTitle, setPageTitle] = useState("Receipts");

  useEffect(() => {
    if (!authUser) return;
    const supabase = createClient();
    supabase
      .from("entity_labels")
      .select("custom_label")
      .eq("entity_id", authUser.entity.id)
      .eq("entity_key", "receipts")
      .maybeSingle()
      .then(({ data }: { data: { custom_label: string } | null }) => {
        if (data?.custom_label) setPageTitle(data.custom_label);
      });
  }, [authUser]);

  useEffect(() => {
    setBreadcrumb(pageTitle, [{ label: "Accounting" }, { label: pageTitle }]);
  }, [setBreadcrumb, pageTitle]);

  const loadReceipts = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchReceipts(authUser.entity.id);
      setReceipts(data);
    } catch {
      toast.error("Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleNewReceipt = () => {
    setShowForm(true);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    loadReceipts();
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  const handleReceiptClick = (receipt: ReceiptWithStakeholder) => {
    router.push(`/accounting/receipts/${receipt.id}`);
  };

  const isEmpty = receipts.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          {pageTitle}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {!showForm && (
            <ReceiptSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              methodFilter={methodFilter}
              onMethodFilterChange={setMethodFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />
          )}

          {!showForm && (
            <button
              onClick={handleNewReceipt}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
            >
              <Plus size={16} />
              New Receipt
            </button>
          )}
        </div>
      </div>

      {/* Inline form (shown above the list) */}
      {showForm && (
        <ReceiptForm onSaved={handleFormSaved} onCancel={handleFormCancel} />
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !showForm && (
        <ReceiptEmptyState onAdd={handleNewReceipt} />
      )}

      {/* List (always visible when there are receipts, even when form is open) */}
      {!loading && !isEmpty && (
        <>
          {showForm && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <ReceiptSearch
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  methodFilter={methodFilter}
                  onMethodFilterChange={setMethodFilter}
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                />
              </div>
            </div>
          )}
          <ReceiptList
            receipts={receipts}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            methodFilter={methodFilter}
            typeFilter={typeFilter}
            onClick={handleReceiptClick}
          />
        </>
      )}
    </div>
  );
}
