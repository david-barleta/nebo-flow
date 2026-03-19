"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import SaleDetail from "@/components/accounting/sales/sale-detail";

export default function SaleDetailPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const params = useParams();
  const saleId = params.id as string;

  useEffect(() => {
    setBreadcrumb("Sale Details", [
      { label: "Accounting" },
      { label: "Sales", href: "/accounting/sales" },
      { label: "Sale Details" },
    ]);
  }, [setBreadcrumb]);

  return <SaleDetail saleId={saleId} />;
}
