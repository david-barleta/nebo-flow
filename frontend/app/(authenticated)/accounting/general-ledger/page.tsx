"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "General Ledger" }];

export default function Page() {
  return <PlaceholderPage title="General Ledger" breadcrumbs={breadcrumbs} />;
}
