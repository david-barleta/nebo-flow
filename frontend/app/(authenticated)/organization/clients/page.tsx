"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Organization" }, { label: "Clients" }];

export default function Page() {
  return <PlaceholderPage title="Clients" breadcrumbs={breadcrumbs} />;
}
