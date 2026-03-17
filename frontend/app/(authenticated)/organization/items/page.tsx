"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Organization" }, { label: "Items & Services" }];

export default function Page() {
  return <PlaceholderPage title="Items & Services" breadcrumbs={breadcrumbs} />;
}
