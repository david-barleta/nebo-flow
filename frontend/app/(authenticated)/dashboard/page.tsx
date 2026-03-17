"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import SummaryCards from "@/components/dashboard/summary-cards";
import RevenueExpensesChart from "@/components/dashboard/revenue-expenses-chart";
import ExpensesCategoryChart from "@/components/dashboard/expenses-category-chart";
import RecentTransactions from "@/components/dashboard/recent-transactions";

export default function DashboardPage() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb("Dashboard", [{ label: "Dashboard" }]);
  }, [setBreadcrumb]);

  return (
    <div className="space-y-6">
      {/* Row 1: Summary cards */}
      <SummaryCards />

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueExpensesChart />
        <ExpensesCategoryChart />
      </div>

      {/* Row 3: Recent transactions */}
      <RecentTransactions />
    </div>
  );
}
