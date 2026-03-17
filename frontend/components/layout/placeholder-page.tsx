"use client";

import { useEffect } from "react";
import { useBreadcrumb, BreadcrumbItem } from "@/contexts/breadcrumb-context";
import { Clock } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
}

export default function PlaceholderPage({ title, breadcrumbs }: PlaceholderPageProps) {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(title, breadcrumbs);
  }, [title, breadcrumbs, setBreadcrumb]);

  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
        <Clock size={28} className="text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">This module is under development.</p>
    </div>
  );
}
