"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Payables" }];

export default function Page() {
  return <PlaceholderPage title="Payables" breadcrumbs={breadcrumbs} />;
}
