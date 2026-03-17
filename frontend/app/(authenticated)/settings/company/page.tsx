"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Settings" }, { label: "Company Settings" }];

export default function Page() {
  return <PlaceholderPage title="Company Settings" breadcrumbs={breadcrumbs} />;
}
