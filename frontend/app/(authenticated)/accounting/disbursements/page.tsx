"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Disbursements" }];

export default function Page() {
  return <PlaceholderPage title="Disbursements" breadcrumbs={breadcrumbs} />;
}
