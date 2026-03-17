"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextType {
  items: BreadcrumbItem[];
  pageTitle: string;
  setBreadcrumb: (pageTitle: string, items: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  const [pageTitle, setPageTitle] = useState("");

  const setBreadcrumb = useCallback((title: string, breadcrumbItems: BreadcrumbItem[]) => {
    setPageTitle(title);
    setItems(breadcrumbItems);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ items, pageTitle, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error("useBreadcrumb must be used within a BreadcrumbProvider");
  }
  return context;
}
