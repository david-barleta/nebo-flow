"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Journal Entries" }];

export default function Page() {
  return <PlaceholderPage title="Journal Entries" breadcrumbs={breadcrumbs} />;
}
