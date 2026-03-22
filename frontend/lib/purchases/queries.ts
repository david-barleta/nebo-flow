// =============================================================================
// Purchases — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Purchase,
  PurchaseWithStakeholder,
  PurchaseDetail,
  PurchaseLine,
} from "./types";
import type { TaxTreatment, PurchaseCategory } from "@/lib/items/types";
import { resolveSystemAccount } from "@/lib/settings/system-accounts-queries";

const supabase = createClient();

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchPurchases(
  entityId: string
): Promise<PurchaseWithStakeholder[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
      *,
      stakeholder:stakeholders (
        stakeholder_type,
        last_name,
        first_name,
        middle_name,
        registered_name
      )
    `
    )
    .eq("entity_id", entityId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PurchaseWithStakeholder[];
}

export async function fetchPurchaseById(purchaseId: string): Promise<PurchaseDetail> {
  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
      *,
      stakeholder:stakeholders (
        id,
        stakeholder_type,
        last_name,
        first_name,
        middle_name,
        registered_name
      ),
      purchase_lines (
        *
      ),
      journal_entry:journal_entries!purchases_journal_entry_id_fkey (
        id,
        entry_number,
        entry_date,
        description,
        status
      )
    `
    )
    .eq("id", purchaseId)
    .single();

  if (error) throw error;

  // Fetch disbursement allocations separately
  const { data: allocations } = await supabase
    .from("disbursement_allocations")
    .select(
      `
      id,
      amount_applied,
      disbursement:disbursements (
        id,
        document_number,
        transaction_date,
        amount,
        status
      )
    `
    )
    .eq("purchase_id", purchaseId);

  // Fetch voided_by user name if voided
  let voided_by_user = null;
  if (data.voided_by) {
    const { data: userData } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", data.voided_by)
      .single();
    voided_by_user = userData;
  }

  // Sort lines by line_order
  const purchase_lines = (data.purchase_lines ?? []).sort(
    (a: PurchaseLine, b: PurchaseLine) => a.line_order - b.line_order
  );

  return {
    ...data,
    purchase_lines,
    disbursement_allocations: allocations ?? [],
    voided_by_user,
  } as PurchaseDetail;
}

// ---------------------------------------------------------------------------
// Document sequence
// ---------------------------------------------------------------------------

async function generateDocumentNumber(
  entityId: string,
  documentType: string
): Promise<string> {
  const { data, error } = await supabase
    .from("document_sequences")
    .select("*")
    .eq("entity_id", entityId)
    .eq("document_type", documentType)
    .single();

  if (error) throw error;

  const seq = data;
  const yearPart = seq.include_year
    ? new Date().getFullYear().toString()
    : "";
  const numberPart = String(seq.next_number).padStart(seq.padding_length, "0");
  const parts = [seq.prefix, yearPart, numberPart].filter(Boolean);
  const docNumber = parts.join("-");

  // Increment next_number
  const { error: updateError } = await supabase
    .from("document_sequences")
    .update({ next_number: seq.next_number + 1, updated_at: new Date().toISOString() })
    .eq("id", seq.id);

  if (updateError) throw updateError;

  return docNumber;
}

/** Fetch the numbering mode for a document type */
export async function fetchNumberingMode(
  entityId: string,
  documentType: string
): Promise<{ mode: "manual" | "auto"; preview: string | null }> {
  const { data, error } = await supabase
    .from("document_sequences")
    .select("*")
    .eq("entity_id", entityId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (error || !data) return { mode: "auto", preview: null };

  const mode = (data.numbering_mode as "manual" | "auto") ?? "auto";
  if (mode === "manual") return { mode, preview: null };

  // Generate preview for auto mode
  const yearPart = data.include_year ? new Date().getFullYear().toString() : "";
  const numberPart = String(data.next_number).padStart(data.padding_length, "0");
  const parts = [data.prefix, yearPart, numberPart].filter(Boolean);
  return { mode, preview: parts.join("-") };
}

// ---------------------------------------------------------------------------
// Fiscal period lookup
// ---------------------------------------------------------------------------

async function findFiscalPeriod(
  entityId: string,
  transactionDate: string
): Promise<string | null> {
  const { data } = await supabase
    .from("fiscal_periods")
    .select("id")
    .eq("entity_id", entityId)
    .lte("start_date", transactionDate)
    .gte("end_date", transactionDate)
    .maybeSingle();

  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Lock date validation
// ---------------------------------------------------------------------------

export async function checkLockDates(
  entityId: string,
  transactionDate: string,
  canOverrideLockDates: boolean
): Promise<{ blocked: boolean; requiresJustification: boolean; reason: string }> {
  const { data: entity } = await supabase
    .from("entities")
    .select("reporting_lock_date, year_end_lock_date")
    .eq("id", entityId)
    .single();

  if (!entity) return { blocked: false, requiresJustification: false, reason: "" };

  // Year-end lock is absolute — no override
  if (entity.year_end_lock_date && transactionDate <= entity.year_end_lock_date) {
    return {
      blocked: true,
      requiresJustification: false,
      reason: `Transaction date is on or before the year-end lock date (${entity.year_end_lock_date}). This cannot be overridden.`,
    };
  }

  // Reporting lock — can be overridden with justification
  if (entity.reporting_lock_date && transactionDate <= entity.reporting_lock_date) {
    if (!canOverrideLockDates) {
      return {
        blocked: true,
        requiresJustification: false,
        reason: `Transaction date is on or before the reporting lock date (${entity.reporting_lock_date}). Your role does not allow overriding lock dates.`,
      };
    }
    return {
      blocked: false,
      requiresJustification: true,
      reason: `Transaction date is on or before the reporting lock date (${entity.reporting_lock_date}). An override justification is required.`,
    };
  }

  return { blocked: false, requiresJustification: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Create purchase (on-account only — creates AP)
// ---------------------------------------------------------------------------

export interface CreatePurchaseInput {
  entity_id: string;
  transaction_date: string;
  description: string | null;
  stakeholder_id: string;
  notes: string | null;
  override_justification: string | null;
  // Purchase voucher number (manual mode) — null means auto-generate
  purchase_voucher_number: string | null;
  // Header discount
  discount_type: "fixed" | "percentage" | null;
  discount_value: number | null;
  // Lines
  lines: {
    item_id: string | null;
    account_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    price_entry_mode: string;
    tax_treatment: TaxTreatment;
    purchase_category: PurchaseCategory | null;
    vat_rate: number;
    vat_amount: number;
    line_total: number;
    ewt_rate_id: string | null;
    ewt_rate: number;
    ewt_amount: number;
    line_order: number;
  }[];
  // Computed totals (from client)
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  ewt_amount: number;
  total_amount_due: number;
  // BIR fields
  gross_purchases: number;
  exempt_purchases: number;
  zero_rated_purchases: number;
  taxable_purchases: number;
  input_tax: number;
  gross_taxable_purchases: number;
  // Auth context
  created_by: string;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const {
    entity_id,
    transaction_date,
    lines,
    created_by,
  } = input;

  // Step 1: Generate document number (internal) and purchase voucher number
  const document_number = await generateDocumentNumber(entity_id, "purchase_voucher");

  let purchase_voucher_number: string | null = input.purchase_voucher_number;
  if (!purchase_voucher_number) {
    purchase_voucher_number = document_number;
  }

  // Step 2: Determine fiscal period
  const fiscal_period_id = await findFiscalPeriod(entity_id, transaction_date);

  // Step 3: Credit account is always Accounts Payable (on-account only)
  const creditAccountId = await resolveSystemAccount(entity_id, "accounts_payable");

  // Step 4: Find Input VAT account
  const inputVatAccountId = await resolveSystemAccount(entity_id, "input_vat");

  // Step 5: Create journal entry
  const jeNumber = await generateDocumentNumber(entity_id, "journal_entry");

  const { data: je, error: jeError } = await supabase
    .from("journal_entries")
    .insert({
      entity_id,
      entry_number: jeNumber,
      entry_date: transaction_date,
      description: input.description || `Purchase Voucher ${document_number}`,
      entry_type: "system_generated",
      source_type: "purchase",
      fiscal_period_id,
      status: "posted",
      posted_at: new Date().toISOString(),
      posted_by: created_by,
      created_by,
    })
    .select()
    .single();

  if (jeError) throw jeError;

  // Step 6: Create JE lines
  const jeLines: {
    journal_entry_id: string;
    account_id: string;
    description: string | null;
    debit_amount: number;
    credit_amount: number;
    line_order: number;
  }[] = [];

  // Debit lines: Expense/asset accounts (grouped by account_id, using net amounts)
  const expenseByAccount = new Map<string, number>();
  for (const line of lines) {
    const netAmount = line.line_total - line.vat_amount;
    const existing = expenseByAccount.get(line.account_id) ?? 0;
    expenseByAccount.set(line.account_id, existing + netAmount);
  }

  let lineOrder = 1;
  for (const [accountId, amount] of expenseByAccount) {
    if (amount !== 0) {
      jeLines.push({
        journal_entry_id: je.id,
        account_id: accountId,
        description: "Expense/Asset",
        debit_amount: Math.round(amount * 100) / 100,
        credit_amount: 0,
        line_order: lineOrder++,
      });
    }
  }

  // Debit line: Input VAT (consolidated)
  if (input.vat_amount > 0) {
    jeLines.push({
      journal_entry_id: je.id,
      account_id: inputVatAccountId,
      description: "Input VAT",
      debit_amount: input.vat_amount,
      credit_amount: 0,
      line_order: lineOrder++,
    });
  }

  // Credit line: Accounts Payable
  jeLines.push({
    journal_entry_id: je.id,
    account_id: creditAccountId,
    description: "Accounts Payable",
    debit_amount: 0,
    credit_amount: input.ewt_amount > 0 ? input.total_amount_due : input.total_amount,
    line_order: lineOrder++,
  });

  // Credit line: EWT Payable (if EWT applies — entity withholds and remits to BIR)
  if (input.ewt_amount > 0) {
    const ewtPayableAccountId = await resolveSystemAccount(entity_id, "ewt_payable");
    jeLines.push({
      journal_entry_id: je.id,
      account_id: ewtPayableAccountId,
      description: "EWT Payable",
      debit_amount: 0,
      credit_amount: input.ewt_amount,
      line_order: lineOrder++,
    });
  }

  const { error: jeLinesError } = await supabase
    .from("journal_entry_lines")
    .insert(jeLines);

  if (jeLinesError) throw jeLinesError;

  // Step 7: Compute payment fields (always on-account: unpaid)
  const effectiveAmount = input.ewt_amount > 0 ? input.total_amount_due : input.total_amount;

  // Step 8: Create the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      entity_id,
      document_number,
      purchase_voucher_number,
      transaction_date,
      description: input.description || null,
      stakeholder_id: input.stakeholder_id,
      payment_type: "on_account",
      subtotal: input.subtotal,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      discount_amount: input.discount_amount,
      vat_amount: input.vat_amount,
      total_amount: input.total_amount,
      amount_paid: 0,
      outstanding_balance: effectiveAmount,
      gross_purchases: input.gross_purchases,
      exempt_purchases: input.exempt_purchases,
      zero_rated_purchases: input.zero_rated_purchases,
      taxable_purchases: input.taxable_purchases,
      input_tax: input.input_tax,
      gross_taxable_purchases: input.gross_taxable_purchases,
      ewt_amount: input.ewt_amount,
      total_amount_due: input.total_amount_due,
      status: "posted",
      journal_entry_id: je.id,
      fiscal_period_id,
      notes: input.notes || null,
      override_justification: input.override_justification || null,
      created_by,
    })
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  // Update JE source_id to the purchase ID
  await supabase
    .from("journal_entries")
    .update({ source_id: purchase.id })
    .eq("id", je.id);

  // Step 9: Create purchase lines
  const purchaseLines = lines.map((line) => ({
    purchase_id: purchase.id,
    item_id: line.item_id || null,
    account_id: line.account_id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    discount_amount: line.discount_amount,
    price_entry_mode: line.price_entry_mode,
    tax_treatment: line.tax_treatment,
    purchase_category: line.purchase_category || null,
    vat_rate: line.vat_rate,
    vat_amount: line.vat_amount,
    line_total: line.line_total,
    ewt_rate_id: line.ewt_rate_id || null,
    ewt_rate: line.ewt_rate,
    ewt_amount: line.ewt_amount,
    line_order: line.line_order,
  }));

  const { error: purchaseLinesError } = await supabase
    .from("purchase_lines")
    .insert(purchaseLines);

  if (purchaseLinesError) throw purchaseLinesError;

  return purchase as Purchase;
}

// ---------------------------------------------------------------------------
// Void purchase
// ---------------------------------------------------------------------------

export async function voidPurchase(
  purchaseId: string,
  voidReason: string,
  userId: string,
  overrideJustification?: string | null
): Promise<void> {
  // Fetch the purchase with its JE
  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .select("*, journal_entry:journal_entries(*)")
    .eq("id", purchaseId)
    .single();

  if (purchaseError) throw purchaseError;
  if (!purchase) throw new Error("Purchase not found.");
  if (purchase.status === "voided") throw new Error("Purchase is already voided.");

  // Check for active disbursements
  const { data: allocations } = await supabase
    .from("disbursement_allocations")
    .select("disbursement_id, disbursement:disbursements(is_standalone, status)")
    .eq("purchase_id", purchaseId);

  const activeDisbursements = (allocations ?? []).filter(
    (a: { disbursement: { status: string } | null }) =>
      a.disbursement && a.disbursement.status !== "voided"
  );
  if (activeDisbursements.length > 0) {
    throw new Error("Cannot void this purchase because it has active disbursement payments. Void the disbursements first.");
  }

  // Fetch original JE lines
  const { data: jeLines } = await supabase
    .from("journal_entry_lines")
    .select("*")
    .eq("journal_entry_id", purchase.journal_entry_id);

  // Create reversing journal entry
  const jeNumber = await generateDocumentNumber(purchase.entity_id, "journal_entry");

  const { data: reversingJe, error: rjeError } = await supabase
    .from("journal_entries")
    .insert({
      entity_id: purchase.entity_id,
      entry_number: jeNumber,
      entry_date: new Date().toISOString().split("T")[0],
      description: `Void reversal: ${purchase.document_number}`,
      entry_type: "system_generated",
      source_type: "void_reversal",
      source_id: purchaseId,
      fiscal_period_id: purchase.fiscal_period_id,
      status: "posted",
      reversal_of_entry_id: purchase.journal_entry_id,
      posted_at: new Date().toISOString(),
      posted_by: userId,
      created_by: userId,
    })
    .select()
    .single();

  if (rjeError) throw rjeError;

  // Create reversed JE lines (swap debits and credits)
  if (jeLines && jeLines.length > 0) {
    const reversedLines = jeLines.map(
      (line: { account_id: string; description: string | null; debit_amount: number; credit_amount: number; line_order: number }) => ({
        journal_entry_id: reversingJe.id,
        account_id: line.account_id,
        description: line.description,
        debit_amount: line.credit_amount,
        credit_amount: line.debit_amount,
        line_order: line.line_order,
      })
    );

    const { error: rlError } = await supabase
      .from("journal_entry_lines")
      .insert(reversedLines);

    if (rlError) throw rlError;
  }

  // Link original JE to reversing JE
  await supabase
    .from("journal_entries")
    .update({ reversed_by_entry_id: reversingJe.id })
    .eq("id", purchase.journal_entry_id);

  // Update the purchase
  const { error: updateError } = await supabase
    .from("purchases")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      voided_by: userId,
      void_reason: voidReason,
      reversing_journal_entry_id: reversingJe.id,
      override_justification: overrideJustification || null,
      amount_paid: 0,
      outstanding_balance: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseId);

  if (updateError) throw updateError;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function logAuditEntry(entry: {
  entity_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}): Promise<void> {
  const { error } = await supabase.from("audit_log").insert(entry);
  if (error) console.error("Audit log error:", error);
}
