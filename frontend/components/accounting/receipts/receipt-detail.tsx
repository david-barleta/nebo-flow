"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Stakeholder } from "@/lib/stakeholders/types";
import { fetchAccounts } from "@/lib/accounts/queries";
import type { Account } from "@/lib/accounts/types";
import type { ReceiptDetail as ReceiptDetailType } from "@/lib/receipts/types";
import {
  PAYMENT_METHOD_LABELS,
  RECEIPT_STATUS_LABELS,
  RECEIPT_STATUS_COLORS,
  formatCurrency,
} from "@/lib/receipts/types";
import type { ReceiptStatus } from "@/lib/receipts/types";
import {
  fetchReceiptById,
  voidReceipt,
  checkLockDates,
  logAuditEntry,
} from "@/lib/receipts/queries";
import VoidReceiptDialog from "./void-receipt-dialog";

interface ReceiptDetailProps {
  receiptId: string;
}

export default function ReceiptDetail({ receiptId }: ReceiptDetailProps) {
  const router = useRouter();
  const { authUser } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptDetailType | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidRequiresJustification, setVoidRequiresJustification] =
    useState(false);

  const loadReceipt = useCallback(async () => {
    try {
      const [data, accts] = await Promise.all([
        fetchReceiptById(receiptId),
        authUser ? fetchAccounts(authUser.entity.id) : Promise.resolve([]),
      ]);
      setReceipt(data);
      setAccounts(accts);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to load receipt.";
      console.error("Receipt load error:", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [receiptId, authUser]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  const getAccountDisplay = useCallback(
    (id: string) => {
      const acct = accounts.find((a) => a.id === id);
      if (!acct) return id;
      return acct.account_code
        ? `${acct.account_code} — ${acct.account_name}`
        : acct.account_name;
    },
    [accounts]
  );

  const stakeholderName = useMemo(() => {
    if (!receipt?.stakeholder) return receipt?.is_standalone ? "Standalone" : "—";
    return getStakeholderDisplayName(
      receipt.stakeholder as unknown as Stakeholder
    );
  }, [receipt]);

  const canVoid = useMemo(() => {
    if (!receipt || !authUser) return false;
    if (
      receipt.status === "voided" ||
      receipt.status === "draft" ||
      receipt.status === "pending_approval"
    )
      return false;
    return true;
  }, [receipt, authUser]);

  const handleVoidClick = async () => {
    if (!receipt || !authUser) return;

    const lockCheck = await checkLockDates(
      authUser.entity.id,
      receipt.transaction_date,
      authUser.role.canOverrideLockDates
    );

    if (lockCheck.blocked) {
      toast.error(lockCheck.reason);
      return;
    }

    setVoidRequiresJustification(lockCheck.requiresJustification);
    setShowVoidDialog(true);
  };

  const handleVoidConfirm = async (
    voidReason: string,
    overrideJustification: string | null
  ) => {
    if (!receipt || !authUser) return;

    try {
      await voidReceipt(
        receipt.id,
        voidReason,
        authUser.user.id,
        overrideJustification
      );

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "void",
        entity_type: "receipt",
        entity_record_id: receipt.id,
        old_values: {
          status: receipt.status,
          amount: receipt.amount,
        },
        new_values: {
          status: "voided",
          void_reason: voidReason,
        },
      });

      toast.success(`Receipt ${receipt.document_number} voided.`);
      setShowVoidDialog(false);
      loadReceipt();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to void receipt.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Receipt not found.</p>
      </div>
    );
  }

  const status = receipt.status as ReceiptStatus;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/accounting/receipts")}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
            {receipt.document_number}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RECEIPT_STATUS_COLORS[status]}`}
          >
            {RECEIPT_STATUS_LABELS[status]}
          </span>
          {receipt.is_standalone && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
              Standalone
            </span>
          )}
        </div>

        {canVoid && (
          <button
            onClick={handleVoidClick}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 flex items-center gap-2"
          >
            <Ban size={14} />
            Void
          </button>
        )}
      </div>

      {/* Voided banner */}
      {receipt.status === "voided" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800 font-medium">
            This receipt has been voided
            {receipt.void_reason && <> — {receipt.void_reason}</>}
          </p>
          {receipt.voided_by_user && (
            <p className="text-xs text-red-600 mt-0.5">
              by {receipt.voided_by_user.full_name} on{" "}
              {receipt.voided_at
                ? new Date(receipt.voided_at).toLocaleDateString()
                : ""}
            </p>
          )}
        </div>
      )}

      {/* Header details + Amount side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm text-gray-900">
                {receipt.transaction_date}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="text-sm text-gray-900">{stakeholderName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Method</p>
              <p className="text-sm text-gray-900">
                {PAYMENT_METHOD_LABELS[receipt.payment_method]}
              </p>
            </div>
            {receipt.check_number && (
              <div>
                <p className="text-xs text-gray-500">Check Number</p>
                <p className="text-sm text-gray-900">
                  {receipt.check_number}
                </p>
              </div>
            )}
            {receipt.check_date && (
              <div>
                <p className="text-xs text-gray-500">Check Date</p>
                <p className="text-sm text-gray-900">{receipt.check_date}</p>
              </div>
            )}
            {receipt.is_standalone && receipt.standalone_account_id && (
              <div>
                <p className="text-xs text-gray-500">Income Account</p>
                <p className="text-sm text-gray-900">
                  {getAccountDisplay(receipt.standalone_account_id)}
                </p>
              </div>
            )}
            {receipt.description && (
              <div className="col-span-3">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-900">
                  {receipt.description}
                </p>
              </div>
            )}
            {receipt.notes && (
              <div className="col-span-3">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-900">{receipt.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 space-y-1.5">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-gray-900">Total Amount</span>
            <span className="font-mono text-gray-900">
              {formatCurrency(receipt.amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Allocations (applied receipts only) */}
      {!receipt.is_standalone &&
        receipt.receipt_allocations &&
        receipt.receipt_allocations.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Applied to Invoices
            </h2>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                    Invoice #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                    Invoice Total
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                    Amount Applied
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipt.receipt_allocations.map((alloc) => (
                  <tr key={alloc.id} className="border-b border-gray-100">
                    <td
                      className="px-4 py-2.5 text-sm text-blue-600 font-medium cursor-pointer hover:underline"
                      onClick={() =>
                        router.push(`/accounting/sales/${alloc.sale.id}`)
                      }
                    >
                      {alloc.sale.sales_invoice_number ||
                        alloc.sale.document_number}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">
                      {alloc.sale.transaction_date}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-mono">
                      {formatCurrency(
                        alloc.sale.total_amount_due > 0
                          ? alloc.sale.total_amount_due
                          : alloc.sale.total_amount
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-mono font-medium">
                      {formatCurrency(alloc.amount_applied)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Journal entry link */}
      {receipt.journal_entry && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Journal Entry
          </h2>
          <div className="text-sm">
            <p className="text-gray-700">
              <span className="font-medium text-blue-600">
                {receipt.journal_entry.entry_number}
              </span>
              {" — "}
              {receipt.journal_entry.description}
              {" — "}
              <span className="text-gray-500">
                {receipt.journal_entry.entry_date}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Void dialog */}
      {showVoidDialog && (
        <VoidReceiptDialog
          documentNumber={receipt.document_number}
          requiresJustification={voidRequiresJustification}
          onConfirm={handleVoidConfirm}
          onCancel={() => setShowVoidDialog(false)}
        />
      )}
    </div>
  );
}
