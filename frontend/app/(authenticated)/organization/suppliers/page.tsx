"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Organization" }, { label: "Suppliers" }];

export default function Page() {
  return <PlaceholderPage title="Suppliers" breadcrumbs={breadcrumbs} />;
}
