"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import EwtRatesPage from "@/components/settings/tax/ewt-rates-page";

export default function Page() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb("Tax Configuration", [
      { label: "Settings" },
      { label: "Tax Configuration" },
    ]);
  }, [setBreadcrumb]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
        Tax Configuration
      </h1>
      <EwtRatesPage />
    </div>
  );
}
