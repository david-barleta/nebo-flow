"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Purchases" }];

export default function Page() {
  return <PlaceholderPage title="Purchases" breadcrumbs={breadcrumbs} />;
}
