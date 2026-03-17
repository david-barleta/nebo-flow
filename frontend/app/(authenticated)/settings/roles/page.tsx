"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Settings" }, { label: "Roles & Permissions" }];

export default function Page() {
  return <PlaceholderPage title="Roles & Permissions" breadcrumbs={breadcrumbs} />;
}
