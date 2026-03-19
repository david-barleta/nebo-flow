"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import BankAccountsPage from "@/components/settings/bank-accounts/bank-accounts-page";

export default function Page() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb("Bank Accounts", [
      { label: "Settings" },
      { label: "Bank Accounts" },
    ]);
  }, [setBreadcrumb]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
        Bank Accounts
      </h1>
      <BankAccountsPage />
    </div>
  );
}
