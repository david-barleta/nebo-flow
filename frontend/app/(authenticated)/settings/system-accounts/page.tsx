"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import SystemAccountsPage from "@/components/settings/system-accounts/system-accounts-page";

export default function Page() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb("System Accounts", [
      { label: "Settings" },
      { label: "System Accounts" },
    ]);
  }, [setBreadcrumb]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
        System Accounts
      </h1>
      <SystemAccountsPage />
    </div>
  );
}
