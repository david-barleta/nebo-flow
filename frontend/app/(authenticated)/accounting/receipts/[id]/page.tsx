"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import ReceiptDetail from "@/components/accounting/receipts/receipt-detail";

export default function ReceiptDetailPage() {
  const { setBreadcrumb } = useBreadcrumb();
  const params = useParams();
  const receiptId = params.id as string;

  useEffect(() => {
    setBreadcrumb("Receipt Details", [
      { label: "Accounting" },
      { label: "Receipts", href: "/accounting/receipts" },
      { label: "Receipt Details" },
    ]);
  }, [setBreadcrumb]);

  return <ReceiptDetail receiptId={receiptId} />;
}
