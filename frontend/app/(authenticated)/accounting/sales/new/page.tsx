"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect to the sales page — the form is now inline on the list page */
export default function NewSalePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/accounting/sales");
  }, [router]);

  return null;
}
