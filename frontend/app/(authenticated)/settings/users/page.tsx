"use client";

import PlaceholderPage from "@/components/layout/placeholder-page";

const breadcrumbs = [{ label: "Settings" }, { label: "Users" }];

export default function Page() {
  return <PlaceholderPage title="Users" breadcrumbs={breadcrumbs} />;
}
