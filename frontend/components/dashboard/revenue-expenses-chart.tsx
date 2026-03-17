"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const labels = ["Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"];

const data = {
  labels,
  datasets: [
    {
      label: "Revenue",
      data: [980000, 1050000, 1320000, 1100000, 1180000, 1250000],
      borderColor: "#166534",
      backgroundColor: "rgba(22, 101, 52, 0.08)",
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: "#166534",
    },
    {
      label: "Expenses",
      data: [720000, 810000, 950000, 780000, 830000, 875000],
      borderColor: "#991b1b",
      backgroundColor: "rgba(153, 27, 27, 0.08)",
      fill: true,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: "#991b1b",
    },
  ],
};

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        padding: 20,
        font: { size: 12 },
      },
    },
    tooltip: {
      callbacks: {
        label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const value = context.parsed.y;
          if (value === null) return "";
          return `${context.dataset.label}: ₱ ${value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) =>
          `₱ ${(Number(value) / 1000).toFixed(0)}K`,
        font: { size: 11 },
      },
      grid: { color: "rgba(0,0,0,0.04)" },
    },
    x: {
      ticks: { font: { size: 11 } },
      grid: { display: false },
    },
  },
};

export default function RevenueExpensesChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
