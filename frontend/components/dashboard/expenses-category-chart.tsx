"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const data = {
  labels: ["Salaries", "Rent", "Marketing", "Supplies", "Other", "Utilities"],
  datasets: [
    {
      label: "Amount",
      data: [380000, 145000, 112000, 95000, 75000, 68000],
      backgroundColor: "#1e3a5f",
      borderRadius: 4,
    },
  ],
};

const options: Parameters<typeof Bar>[0]["options"] = {
  indexAxis: "y" as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => {
          const value = context.parsed.x;
          if (value === null) return "";
          return `₱ ${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) =>
          `₱ ${(Number(value) / 1000).toFixed(0)}K`,
        font: { size: 11 },
      },
      grid: { color: "rgba(0,0,0,0.04)" },
    },
    y: {
      ticks: { font: { size: 12 } },
      grid: { display: false },
    },
  },
};

export default function ExpensesCategoryChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Expenses by Category</h3>
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
