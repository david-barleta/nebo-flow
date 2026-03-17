"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Accounting" }, { label: "Trial Balance" }];

export default function Page() {
  return <PlaceholderPage title="Trial Balance" breadcrumbs={breadcrumbs} />;
}
