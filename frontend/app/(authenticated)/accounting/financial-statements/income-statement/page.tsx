"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Financial Statements" }, { label: "Income Statement" }];

export default function Page() {
  return <PlaceholderPage title="Income Statement" breadcrumbs={breadcrumbs} />;
}
