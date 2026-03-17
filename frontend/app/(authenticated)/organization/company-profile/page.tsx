"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Organization" }, { label: "Company Profile" }];

export default function Page() {
  return <PlaceholderPage title="Company Profile" breadcrumbs={breadcrumbs} />;
}
