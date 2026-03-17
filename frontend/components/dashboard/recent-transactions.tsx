"use client";

interface Transaction {
  date: string;
  type: string;
  documentNo: string;
  description: string;
  amount: string;
  typeColor: string;
}

const transactions: Transaction[] = [
  {
    date: "2026-03-15",
    type: "Sale",
    documentNo: "INV-2026-0047",
    description: "Consulting services",
    amount: "₱ 125,000.00",
    typeColor: "text-green-700 bg-green-50",
  },
  {
    date: "2026-03-14",
    type: "Purchase",
    documentNo: "PV-2026-0023",
    description: "Office supplies",
    amount: "₱ 8,500.00",
    typeColor: "text-orange-700 bg-orange-50",
  },
  {
    date: "2026-03-14",
    type: "Receipt",
    documentNo: "OR-2026-0019",
    description: "Collection — ABC Corp",
    amount: "₱ 250,000.00",
    typeColor: "text-blue-700 bg-blue-50",
  },
  {
    date: "2026-03-13",
    type: "Disbursement",
    documentNo: "CV-2026-0015",
    description: "Rent payment — March",
    amount: "₱ 45,000.00",
    typeColor: "text-red-700 bg-red-50",
  },
  {
    date: "2026-03-12",
    type: "Sale",
    documentNo: "INV-2026-0046",
    description: "Website development",
    amount: "₱ 350,000.00",
    typeColor: "text-green-700 bg-green-50",
  },
];

export default function RecentTransactions() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 font-medium text-gray-500">Date</th>
              <th className="px-5 py-3 font-medium text-gray-500">Type</th>
              <th className="px-5 py-3 font-medium text-gray-500">Document No.</th>
              <th className="px-5 py-3 font-medium text-gray-500">Description</th>
              <th className="px-5 py-3 font-medium text-gray-500 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr
                key={i}
                className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-5 py-3 text-gray-600">{t.date}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${t.typeColor}`}>
                    {t.type}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-gray-700">{t.documentNo}</td>
                <td className="px-5 py-3 text-gray-700">{t.description}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
