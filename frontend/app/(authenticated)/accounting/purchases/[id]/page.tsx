"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import PurchaseDetail from "@/components/accounting/purchases/purchase-detail";

export default function PurchaseDetailPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const params = useParams();
  const purchaseId = params.id as string;

  useEffect(() => {
    setBreadcrumb("Purchase Details", [
      { label: "Accounting" },
      { label: "Purchases", href: "/accounting/purchases" },
      { label: "Purchase Details" },
    ]);
  }, [setBreadcrumb]);

  return <PurchaseDetail purchaseId={purchaseId} />;
}
