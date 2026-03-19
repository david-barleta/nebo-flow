// =============================================================================
// Receipts — TypeScript Types
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type PaymentMethod = "cash" | "check" | "bank_transfer";

export type ReceiptStatus =
  | "draft"
  | "pending_approval"
  | "posted"
  | "voided";

// ---------------------------------------------------------------------------
// Database interfaces
// ---------------------------------------------------------------------------

export interface Receipt {
  id: string;
  entity_id: string;
  document_number: string;
  transaction_date: string;
  description: string | null;
  stakeholder_id: string | null;
  is_standalone: boolean;
  standalone_account_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  check_number: string | null;
  check_date: string | null;
  bank_name: string | null;
  bank_account_id: string | null;
  status: ReceiptStatus;
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

export interface ReceiptAllocation {
  id: string;
  receipt_id: string;
  sale_id: string;
  amount_applied: number;
  created_at: string;
}

/** Receipt with joined stakeholder name for list view */
export interface ReceiptWithStakeholder extends Receipt {
  stakeholder?: {
    stakeholder_type: string;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
    registered_name: string | null;
  } | null;
}

/** Receipt with full details for the detail page */
export interface ReceiptDetail extends Receipt {
  stakeholder?: {
    id: string;
    stakeholder_type: string;
    last_name: string | null;
    first_name: string | null;
    middle_name: string | null;
    registered_name: string | null;
  } | null;
  journal_entry?: {
    id: string;
    entry_number: string;
    entry_date: string;
    description: string | null;
    status: string;
  } | null;
  receipt_allocations: {
    id: string;
    amount_applied: number;
    sale: {
      id: string;
      document_number: string;
      sales_invoice_number: string | null;
      transaction_date: string;
      total_amount: number;
      total_amount_due: number;
      outstanding_balance: number;
      status: string;
    };
  }[];
  voided_by_user?: {
    full_name: string;
  } | null;
}

/** Outstanding sale for the allocation picker */
export interface OutstandingSale {
  id: string;
  document_number: string;
  sales_invoice_number: string | null;
  transaction_date: string;
  total_amount: number;
  total_amount_due: number;
  amount_paid: number;
  outstanding_balance: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  bank_transfer: "Bank Transfer",
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  posted: "Posted",
  voided: "Voided",
};

export const RECEIPT_STATUS_COLORS: Record<ReceiptStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-yellow-100 text-yellow-800",
  posted: "bg-green-100 text-green-700",
  voided: "bg-red-100 text-red-700",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as Philippine peso currency */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
