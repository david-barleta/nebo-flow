"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Receipts" }];

export default function Page() {
  return <PlaceholderPage title="Receipts" breadcrumbs={breadcrumbs} />;
}
