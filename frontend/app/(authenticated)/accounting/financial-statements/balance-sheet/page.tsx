"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Financial Statements" }, { label: "Balance Sheet" }];

export default function Page() {
  return <PlaceholderPage title="Balance Sheet" breadcrumbs={breadcrumbs} />;
}
