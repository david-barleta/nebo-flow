"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Receivables" }];

export default function Page() {
  return <PlaceholderPage title="Receivables" breadcrumbs={breadcrumbs} />;
}
