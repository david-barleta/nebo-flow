"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type {
  PurchaseWithStakeholder,
  PurchaseStatus,
} from "@/lib/purchases/types";
import { fetchPurchases } from "@/lib/purchases/queries";
import PurchaseSearch from "@/components/accounting/purchases/purchase-search";
import PurchaseList from "@/components/accounting/purchases/purchase-list";
import PurchaseEmptyState from "@/components/accounting/purchases/purchase-empty-state";
import PurchaseForm from "@/components/accounting/purchases/purchase-form";

type StatusFilter = "all" | PurchaseStatus;

export default function PurchasesPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { authUser } = useAuth();

  const [purchases, setPurchases] = useState<PurchaseWithStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);

  // Page title from entity_labels or default
  const [pageTitle, setPageTitle] = useState("Purchases");

  useEffect(() => {
    if (!authUser) return;
    const supabase = createClient();
    supabase
      .from("entity_labels")
      .select("custom_label")
      .eq("entity_id", authUser.entity.id)
      .eq("entity_key", "purchases")
      .maybeSingle()
      .then(({ data }: { data: { custom_label: string } | null }) => {
        if (data?.custom_label) setPageTitle(data.custom_label);
      });
  }, [authUser]);

  useEffect(() => {
    setBreadcrumb(pageTitle, [{ label: "Accounting" }, { label: pageTitle }]);
  }, [setBreadcrumb, pageTitle]);

  const loadPurchases = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchPurchases(authUser.entity.id);
      setPurchases(data);
    } catch {
      toast.error("Failed to load purchases.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleNewPurchase = () => {
    setShowForm(true);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    loadPurchases();
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  const handlePurchaseClick = (purchase: PurchaseWithStakeholder) => {
    router.push(`/accounting/purchases/${purchase.id}`);
  };

  const isEmpty = purchases.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          {pageTitle}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {!showForm && (
            <PurchaseSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          )}

          {!showForm && (
            <button
              onClick={handleNewPurchase}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
            >
              <Plus size={16} />
              New Purchase
            </button>
          )}
        </div>
      </div>

      {/* Inline form (shown above the list) */}
      {showForm && (
        <PurchaseForm onSaved={handleFormSaved} onCancel={handleFormCancel} />
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !showForm && <PurchaseEmptyState onAdd={handleNewPurchase} />}

      {/* List (always visible when there are purchases, even when form is open) */}
      {!loading && !isEmpty && (
        <>
          {showForm && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <PurchaseSearch
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              </div>
            </div>
          )}
          <PurchaseList
            purchases={purchases}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onClick={handlePurchaseClick}
          />
        </>
      )}
    </div>
  );
}
