"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import type {
  SaleWithStakeholder,
  PaymentType,
  SaleStatus,
} from "@/lib/sales/types";
import { fetchSales } from "@/lib/sales/queries";
import SaleSearch from "@/components/accounting/sales/sale-search";
import SaleList from "@/components/accounting/sales/sale-list";
import SaleEmptyState from "@/components/accounting/sales/sale-empty-state";
import SaleForm from "@/components/accounting/sales/sale-form";

type StatusFilter = "all" | SaleStatus;
type PaymentFilter = "all" | PaymentType;

export default function SalesPage() {
  const router = useRouter();
  const { setBreadcrumb } = useBreadcrumb();
  const { authUser } = useAuth();

  const [sales, setSales] = useState<SaleWithStakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [showForm, setShowForm] = useState(false);

  // Page title from entity_labels or default
  const [pageTitle, setPageTitle] = useState("Sales");

  useEffect(() => {
    if (!authUser) return;
    const supabase = createClient();
    supabase
      .from("entity_labels")
      .select("custom_label")
      .eq("entity_id", authUser.entity.id)
      .eq("entity_key", "sales")
      .maybeSingle()
      .then(({ data }: { data: { custom_label: string } | null }) => {
        if (data?.custom_label) setPageTitle(data.custom_label);
      });
  }, [authUser]);

  useEffect(() => {
    setBreadcrumb(pageTitle, [{ label: "Accounting" }, { label: pageTitle }]);
  }, [setBreadcrumb, pageTitle]);

  const loadSales = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await fetchSales(authUser.entity.id);
      setSales(data);
    } catch {
      toast.error("Failed to load sales.");
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleNewSale = () => {
    setShowForm(true);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    loadSales();
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  const handleSaleClick = (sale: SaleWithStakeholder) => {
    router.push(`/accounting/sales/${sale.id}`);
  };

  const isEmpty = sales.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Top section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
          {pageTitle}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {!showForm && (
            <SaleSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              paymentFilter={paymentFilter}
              onPaymentFilterChange={setPaymentFilter}
            />
          )}

          {!showForm && (
            <button
              onClick={handleNewSale}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
            >
              <Plus size={16} />
              New Sale
            </button>
          )}
        </div>
      </div>

      {/* Inline form (shown above the list) */}
      {showForm && (
        <SaleForm onSaved={handleFormSaved} onCancel={handleFormCancel} />
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !showForm && <SaleEmptyState onAdd={handleNewSale} />}

      {/* List (always visible when there are sales, even when form is open) */}
      {!loading && !isEmpty && (
        <>
          {showForm && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <SaleSearch
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  paymentFilter={paymentFilter}
                  onPaymentFilterChange={setPaymentFilter}
                />
              </div>
            </div>
          )}
          <SaleList
            sales={sales}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            paymentFilter={paymentFilter}
            onClick={handleSaleClick}
          />
        </>
      )}
    </div>
  );
}
