"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { fetchAccounts } from "@/lib/accounts/queries";
import type { Account } from "@/lib/accounts/types";
import { getStakeholderDisplayName } from "@/lib/stakeholders/types";
import type { Stakeholder } from "@/lib/stakeholders/types";
import type { PurchaseDetail as PurchaseDetailType } from "@/lib/purchases/types";
import {
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_COLORS,
  formatCurrency,
} from "@/lib/purchases/types";
import { TAX_TREATMENT_LABELS, PRICE_ENTRY_MODE_LABELS, PURCHASE_CATEGORY_LABELS } from "@/lib/items/types";
import type { TaxTreatment, PriceEntryMode, PurchaseCategory } from "@/lib/items/types";
import {
  fetchPurchaseById,
  voidPurchase,
  checkLockDates,
  logAuditEntry,
} from "@/lib/purchases/queries";
import VoidPurchaseDialog from "./void-purchase-dialog";

interface PurchaseDetailProps {
  purchaseId: string;
}

export default function PurchaseDetail({ purchaseId }: PurchaseDetailProps) {
  const router = useRouter();
  const { authUser } = useAuth();
  const [purchase, setPurchase] = useState<PurchaseDetailType | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidRequiresJustification, setVoidRequiresJustification] = useState(false);

  const loadPurchase = useCallback(async () => {
    try {
      const [data, accts] = await Promise.all([
        fetchPurchaseById(purchaseId),
        authUser ? fetchAccounts(authUser.entity.id) : Promise.resolve([]),
      ]);
      setPurchase(data);
      setAccounts(accts);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to load purchase.";
      console.error("Purchase load error:", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [purchaseId, authUser]);

  useEffect(() => {
    loadPurchase();
  }, [loadPurchase]);

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
    if (!purchase?.stakeholder) return "No supplier";
    return getStakeholderDisplayName(purchase.stakeholder as unknown as Stakeholder);
  }, [purchase]);

  const canVoid = useMemo(() => {
    if (!purchase || !authUser) return false;
    if (purchase.status === "voided" || purchase.status === "draft" || purchase.status === "pending_approval") return false;
    return true;
  }, [purchase, authUser]);

  const handleVoidClick = async () => {
    if (!purchase || !authUser) return;

    const lockCheck = await checkLockDates(
      authUser.entity.id,
      purchase.transaction_date,
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
    if (!purchase || !authUser) return;

    try {
      await voidPurchase(purchase.id, voidReason, authUser.user.id, overrideJustification);

      await logAuditEntry({
        entity_id: authUser.entity.id,
        user_id: authUser.user.id,
        action: "void",
        entity_type: "purchase",
        entity_record_id: purchase.id,
        old_values: {
          status: purchase.status,
          total_amount: purchase.total_amount,
        },
        new_values: {
          status: "voided",
          void_reason: voidReason,
        },
      });

      toast.success(`Purchase voucher ${purchase.purchase_voucher_number || purchase.document_number} voided.`);
      setShowVoidDialog(false);
      loadPurchase();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "Failed to void purchase.";
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

  if (!purchase) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Purchase not found.</p>
      </div>
    );
  }

  const status = purchase.status;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/accounting/purchases")}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-raleway)]">
            {purchase.purchase_voucher_number || purchase.document_number}
          </h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PURCHASE_STATUS_COLORS[status]}`}
          >
            {PURCHASE_STATUS_LABELS[status]}
          </span>
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
      {purchase.status === "voided" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800 font-medium">
            This purchase has been voided
            {purchase.void_reason && <> — {purchase.void_reason}</>}
          </p>
          {purchase.voided_by_user && (
            <p className="text-xs text-red-600 mt-0.5">
              by {purchase.voided_by_user.full_name} on{" "}
              {purchase.voided_at
                ? new Date(purchase.voided_at).toLocaleDateString()
                : ""}
            </p>
          )}
        </div>
      )}

      {/* Header details + Totals side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-gray-500">Date</p>
              <p className="text-sm text-gray-900">{purchase.transaction_date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Supplier</p>
              <p className="text-sm text-gray-900">{stakeholderName}</p>
            </div>
            {purchase.description && (
              <div className="col-span-3">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-900">{purchase.description}</p>
              </div>
            )}
            {purchase.notes && (
              <div className="col-span-3">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-900">{purchase.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-mono text-gray-900">
              {formatCurrency(purchase.subtotal)}
            </span>
          </div>
          {purchase.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Discount
                {purchase.discount_type === "percentage" && purchase.discount_value
                  ? ` (${purchase.discount_value}%)`
                  : ""}
              </span>
              <span className="font-mono text-red-600">
                ({formatCurrency(purchase.discount_amount)})
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">VAT</span>
            <span className="font-mono text-gray-900">
              {formatCurrency(purchase.vat_amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1.5">
            <span className="text-gray-900">Total</span>
            <span className="font-mono text-gray-900">
              {formatCurrency(purchase.total_amount)}
            </span>
          </div>
          {purchase.ewt_amount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Less: EWT</span>
                <span className="font-mono text-red-600">
                  ({formatCurrency(purchase.ewt_amount)})
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900">Amount Due</span>
                <span className="font-mono text-gray-900">
                  {formatCurrency(purchase.total_amount_due)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm border-t border-gray-100 pt-1.5">
            <span className="text-gray-500">Paid</span>
            <span className="font-mono text-green-700">
              {formatCurrency(purchase.amount_paid)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Balance</span>
            <span
              className={`font-mono ${
                purchase.outstanding_balance > 0
                  ? "text-orange-700 font-medium"
                  : "text-gray-900"
              }`}
            >
              {formatCurrency(purchase.outstanding_balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                  Account
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                  Qty
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                  Unit Price
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                  Discount
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                  Tax
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                  Price Mode
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">
                  Category
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                  VAT
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                  EWT
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {purchase.purchase_lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-gray-100"
                >
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {line.description}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {getAccountDisplay(line.account_id)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">
                    {line.quantity}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">
                    {formatCurrency(line.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">
                    {line.discount_amount > 0
                      ? formatCurrency(line.discount_amount)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {TAX_TREATMENT_LABELS[line.tax_treatment as TaxTreatment] ??
                      line.tax_treatment}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {PRICE_ENTRY_MODE_LABELS[line.price_entry_mode as PriceEntryMode] ??
                      line.price_entry_mode}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {line.purchase_category
                      ? (PURCHASE_CATEGORY_LABELS[line.purchase_category as PurchaseCategory] ??
                          line.purchase_category)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">
                    {formatCurrency(line.vat_amount)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-right font-mono">
                    {line.ewt_amount > 0
                      ? `(${formatCurrency(line.ewt_amount)})`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 text-right font-mono font-medium">
                    {formatCurrency(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Journal entry link */}
      {purchase.journal_entry && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Journal Entry
          </h2>
          <div className="text-sm">
            <p className="text-gray-700">
              <span className="font-medium text-blue-600">
                {purchase.journal_entry.entry_number}
              </span>
              {" — "}
              {purchase.journal_entry.description}
              {" — "}
              <span className="text-gray-500">
                {purchase.journal_entry.entry_date}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Linked disbursements */}
      {purchase.disbursement_allocations && purchase.disbursement_allocations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Payment Disbursements
          </h2>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                  Disbursement #
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900">
                  Amount Applied
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {purchase.disbursement_allocations.map((alloc) => (
                <tr key={alloc.id} className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-sm text-blue-600 font-medium">
                    {alloc.disbursement.document_number}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">
                    {alloc.disbursement.transaction_date}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-mono">
                    {formatCurrency(alloc.amount_applied)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">
                    {alloc.disbursement.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Void dialog */}
      {showVoidDialog && (
        <VoidPurchaseDialog
          documentNumber={purchase.document_number}
          requiresJustification={voidRequiresJustification}
          onConfirm={handleVoidConfirm}
          onCancel={() => setShowVoidDialog(false)}
        />
      )}
    </div>
  );
}
