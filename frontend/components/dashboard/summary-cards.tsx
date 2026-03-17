"use client";

import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SummaryCard {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accentColor: string;
  iconBg: string;
}

const cards: SummaryCard[] = [
  {
    label: "Total Sales",
    value: "₱ 1,250,000.00",
    subtitle: "This month",
    icon: TrendingUp,
    accentColor: "text-green-800",
    iconBg: "bg-green-100",
  },
  {
    label: "Total Expenses",
    value: "₱ 875,000.00",
    subtitle: "This month",
    icon: TrendingDown,
    accentColor: "text-red-800",
    iconBg: "bg-red-100",
  },
  {
    label: "Net Profit",
    value: "₱ 375,000.00",
    subtitle: "This month",
    icon: DollarSign,
    accentColor: "text-blue-800",
    iconBg: "bg-blue-100",
  },
  {
    label: "Cash Position",
    value: "₱ 2,150,000.00",
    subtitle: "As of today",
    icon: Wallet,
    accentColor: "text-purple-800",
    iconBg: "bg-purple-100",
  },
];

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon size={18} className={card.accentColor} />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${card.accentColor}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
