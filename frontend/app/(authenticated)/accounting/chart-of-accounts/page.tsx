"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Chart of Accounts" }];

export default function Page() {
  return <PlaceholderPage title="Chart of Accounts" breadcrumbs={breadcrumbs} />;
}
