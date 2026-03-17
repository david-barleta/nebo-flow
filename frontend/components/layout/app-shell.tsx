"use client";

import { ReactNode } from "react";
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context";
import Sidebar from "./sidebar";
import TopHeader from "./top-header";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <BreadcrumbProvider>
      <div className="flex h-screen bg-[#f8fafc]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
