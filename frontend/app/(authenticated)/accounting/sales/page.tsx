"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Sales" }];

export default function Page() {
  return <PlaceholderPage title="Sales" breadcrumbs={breadcrumbs} />;
}
