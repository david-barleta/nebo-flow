// =============================================================================
// Purchases — TypeScript Types
// =============================================================================

import type { TaxTreatment, PriceEntryMode, PurchaseCategory } from "@/lib/items/types";

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type PurchaseStatus =
  | "draft"
  | "pending_approval"
  | "posted"
  | "partially_paid"
  | "paid"
  | "voided";

// ---------------------------------------------------------------------------
// Database interfaces
// ---------------------------------------------------------------------------

export interface Purchase {
  id: string;
  entity_id: string;
  document_number: string;
  purchase_voucher_number: string | null;
  transaction_date: string;
  description: string | null;
  stakeholder_id: string;
  payment_type: "on_account";
  subtotal: number;
  discount_type: "fixed" | "percentage" | null;
  discount_value: number | null;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  gross_purchases: number;
  exempt_purchases: number;
  zero_rated_purchases: number;
  taxable_purchases: number;
  input_tax: number;
  gross_taxable_purchases: number;
  ewt_amount: number;
  total_amount_due: number;
  status: PurchaseStatus;
  journal_entry_id: string | null;
  fiscal_period_id: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  reversing_journal_entry_id: string | null;
  override_justification: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseLine {
  id: string;
  purchase_id: string;
  item_id: string | null;
  account_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  price_entry_mode: PriceEntryMode;
  tax_treatment: TaxTreatment;
  purchase_category: PurchaseCategory | null;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
  ewt_rate_id: string | null;
  ewt_rate: number;
  ewt_amount: number;
  line_order: number;
  created_at: string;
}

/** Purchase with joined stakeholder name for list view */
export interface PurchaseWithStakeholder extends Purchase {
  stakeholder?: {
    stakeholder_type: string;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
    registered_name: string | null;
  } | null;
}

/** Purchase with full details for the detail page */
export interface PurchaseDetail extends Purchase {
  stakeholder?: {
    id: string;
    stakeholder_type: string;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
    registered_name: string | null;
  } | null;
  purchase_lines: PurchaseLine[];
  journal_entry?: {
    id: string;
    entry_number: string;
    entry_date: string;
    description: string | null;
    status: string;
  } | null;
  disbursement_allocations?: {
    id: string;
    amount_applied: number;
    disbursement: {
      id: string;
      document_number: string;
      transaction_date: string;
      amount: number;
      status: string;
    };
  }[];
  voided_by_user?: {
    full_name: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Form state types (used by the create/edit form)
// ---------------------------------------------------------------------------

export type PurchaseLineType = "item" | "service";

export interface PurchaseLineForm {
  key: string; // client-side key for React list rendering
  line_type: PurchaseLineType;
  item_id: string | null;
  item_type: "product" | "service" | null;
  description: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  price_entry_mode: PriceEntryMode;
  tax_treatment: TaxTreatment;
  purchase_category: PurchaseCategory | null;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
  ewt_rate_id: string | null;
  ewt_rate: number;
  ewt_amount: number;
}

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  posted: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  voided: "Voided",
};

export const PURCHASE_STATUS_COLORS: Record<PurchaseStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-yellow-100 text-yellow-800",
  posted: "bg-blue-100 text-blue-700",
  partially_paid: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  voided: "bg-red-100 text-red-700",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a single purchase line's amounts from its form values.
 *
 * Supports two price entry modes:
 * - vat_exclusive: price is net of VAT → VAT = net × rate
 * - vat_inclusive: price includes VAT → net = gross / (1 + rate), VAT = gross - net
 *
 * EWT is always computed on the VAT-exclusive (net) amount.
 */
export function computeLineAmounts(line: PurchaseLineForm): {
  net_amount: number;
  vat_amount: number;
  line_total: number;
  ewt_amount: number;
} {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unit_price) || 0;
  const discount = parseFloat(line.discount_amount) || 0;
  const grossInput = qty * price - discount;

  let net_amount: number;
  let vat_amount: number;

  if (line.tax_treatment === "vatable") {
    if (line.price_entry_mode === "vat_inclusive") {
      net_amount = grossInput / (1 + line.vat_rate / 100);
      vat_amount = grossInput - net_amount;
    } else {
      net_amount = grossInput;
      vat_amount = net_amount * (line.vat_rate / 100);
    }
  } else {
    net_amount = grossInput;
    vat_amount = 0;
  }

  const line_total = net_amount + vat_amount;
  const ewt_amount = line.ewt_rate > 0 ? net_amount * (line.ewt_rate / 100) : 0;

  return { net_amount, vat_amount, line_total, ewt_amount };
}

/** Format a number as Philippine peso currency */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
