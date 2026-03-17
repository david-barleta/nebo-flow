"use client";

import Link from "next/link";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";

export default function Breadcrumb() {
  const { items } = useBreadcrumb();

  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-300">&gt;</span>}
            {isLast || !item.href ? (
              <span className="text-gray-500">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-gray-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
