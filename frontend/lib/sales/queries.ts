// =============================================================================
// Sales — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Sale,
  SaleWithStakeholder,
  SaleDetail,
  SaleLine,
  BankAccount,
  PaymentType,
  PaymentMethod,
} from "./types";
import type { TaxTreatment } from "@/lib/items/types";
import { resolveSystemAccount } from "@/lib/settings/system-accounts-queries";

const supabase = createClient();

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchSales(
  entityId: string
): Promise<SaleWithStakeholder[]> {
  const { data, error } = await supabase
    .from("sales")
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
  return (data ?? []) as SaleWithStakeholder[];
}

export async function fetchSaleById(saleId: string): Promise<SaleDetail> {
  const { data, error } = await supabase
    .from("sales")
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
      sale_lines (
        *
      ),
      journal_entry:journal_entries!sales_journal_entry_id_fkey (
        id,
        entry_number,
        entry_date,
        description,
        status
      )
    `
    )
    .eq("id", saleId)
    .single();

  if (error) throw error;

  // Fetch receipt allocations separately (nested join through receipts)
  const { data: allocations } = await supabase
    .from("receipt_allocations")
    .select(
      `
      id,
      amount_applied,
      receipt:receipts (
        id,
        document_number,
        transaction_date,
        amount,
        status
      )
    `
    )
    .eq("sale_id", saleId);

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
  const sale_lines = (data.sale_lines ?? []).sort(
    (a: SaleLine, b: SaleLine) => a.line_order - b.line_order
  );

  return {
    ...data,
    sale_lines,
    receipt_allocations: allocations ?? [],
    voided_by_user,
  } as SaleDetail;
}

export async function fetchBankAccounts(
  entityId: string
): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .order("bank_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BankAccount[];
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
// System account lookup (via system_account_mappings table)
// ---------------------------------------------------------------------------

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
// Create sale (the main transaction)
// ---------------------------------------------------------------------------

export interface CreateSaleInput {
  entity_id: string;
  transaction_date: string;
  description: string | null;
  stakeholder_id: string | null;
  payment_type: PaymentType;
  notes: string | null;
  override_justification: string | null;
  // Sales invoice number (manual mode) — null means auto-generate
  sales_invoice_number: string | null;
  // Header discount
  discount_type: "fixed" | "percentage" | null;
  discount_value: number | null;
  // Payment details (for cash sales only)
  payment_method?: PaymentMethod;
  check_number?: string | null;
  check_date?: string | null;
  bank_account_id?: string | null;
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
  gross_sales: number;
  exempt_sales: number;
  zero_rated_sales: number;
  taxable_sales: number;
  output_tax: number;
  gross_taxable_sales: number;
  // Auth context
  created_by: string;
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const {
    entity_id,
    transaction_date,
    payment_type,
    lines,
    created_by,
  } = input;

  // Step 1: Generate document number (internal) and sales invoice number
  const document_number = await generateDocumentNumber(entity_id, "sales_invoice");

  // Determine SI number: use provided (manual) or auto-generate
  let sales_invoice_number: string | null = input.sales_invoice_number;
  if (!sales_invoice_number) {
    // Auto mode — use the same generated document_number as SI number
    sales_invoice_number = document_number;
  }

  // Step 2: Determine fiscal period
  const fiscal_period_id = await findFiscalPeriod(entity_id, transaction_date);

  // Step 3: Determine debit account for JE
  let debitAccountId: string;
  if (payment_type === "on_account") {
    debitAccountId = await resolveSystemAccount(entity_id, "accounts_receivable");
  } else {
    // Cash sale — debit account depends on payment method
    if (input.payment_method === "cash" || !input.payment_method) {
      debitAccountId = await resolveSystemAccount(entity_id, "default_cash");
    } else {
      // Check or bank transfer — use the bank account's GL account
      if (!input.bank_account_id) throw new Error("Bank account is required for check/bank transfer payments.");
      const { data: bankAcct } = await supabase
        .from("bank_accounts")
        .select("account_id")
        .eq("id", input.bank_account_id)
        .single();
      if (!bankAcct) throw new Error("Bank account not found.");
      debitAccountId = bankAcct.account_id;
    }
  }

  // Step 4: Find Output VAT account
  const outputVatAccountId = await resolveSystemAccount(entity_id, "output_vat");

  // Step 5: Create journal entry
  const jeNumber = await generateDocumentNumber(entity_id, "journal_entry");

  const { data: je, error: jeError } = await supabase
    .from("journal_entries")
    .insert({
      entity_id,
      entry_number: jeNumber,
      entry_date: transaction_date,
      description: input.description || `Sales Invoice ${document_number}`,
      entry_type: "system_generated",
      source_type: "sale",
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

  // Debit line: AR or Cash/Bank for the amount actually receivable
  jeLines.push({
    journal_entry_id: je.id,
    account_id: debitAccountId,
    description: payment_type === "on_account" ? "Accounts Receivable" : "Cash/Bank received",
    debit_amount: input.ewt_amount > 0 ? input.total_amount_due : input.total_amount,
    credit_amount: 0,
    line_order: 1,
  });

  // Debit line: Creditable Withholding Tax (if EWT applies)
  if (input.ewt_amount > 0) {
    const cwtAccountId = await resolveSystemAccount(entity_id, "creditable_withholding_tax");
    jeLines.push({
      journal_entry_id: je.id,
      account_id: cwtAccountId,
      description: "Creditable Withholding Tax",
      debit_amount: input.ewt_amount,
      credit_amount: 0,
      line_order: 2,
    });
  }

  // Credit lines: Revenue accounts (grouped by account_id)
  // Use the actual net_amount from each line (handles VAT-inclusive correctly)
  const revenueByAccount = new Map<string, number>();
  for (const line of lines) {
    // For vat_inclusive, the line stores vat_amount separately, so net = line_total - vat_amount
    // For vat_exclusive, net = qty × price - discount
    // In both cases: revenue = line_total - vat_amount (which equals net_amount)
    const netAmount = line.line_total - line.vat_amount;
    const existing = revenueByAccount.get(line.account_id) ?? 0;
    revenueByAccount.set(line.account_id, existing + netAmount);
  }

  let lineOrder = input.ewt_amount > 0 ? 3 : 2;
  for (const [accountId, amount] of revenueByAccount) {
    if (amount !== 0) {
      jeLines.push({
        journal_entry_id: je.id,
        account_id: accountId,
        description: "Revenue",
        debit_amount: 0,
        credit_amount: Math.round(amount * 100) / 100,
        line_order: lineOrder++,
      });
    }
  }

  // Credit line: Output VAT (consolidated)
  if (input.vat_amount > 0) {
    jeLines.push({
      journal_entry_id: je.id,
      account_id: outputVatAccountId,
      description: "Output VAT",
      debit_amount: 0,
      credit_amount: input.vat_amount,
      line_order: lineOrder++,
    });
  }

  const { error: jeLinesError } = await supabase
    .from("journal_entry_lines")
    .insert(jeLines);

  if (jeLinesError) throw jeLinesError;

  // Update JE source_id after sale is created (we'll update it below)

  // Step 7: Compute payment fields
  const isCash = payment_type === "cash";
  // When EWT applies, the receivable/payable amount is total_amount_due (after EWT deduction)
  const effectiveAmount = input.ewt_amount > 0 ? input.total_amount_due : input.total_amount;
  const amount_paid = isCash ? effectiveAmount : 0;
  const outstanding_balance = isCash ? 0 : effectiveAmount;
  const status = isCash ? "paid" : "posted";

  // Step 8: Create the sale
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      entity_id,
      document_number,
      sales_invoice_number,
      transaction_date,
      description: input.description || null,
      stakeholder_id: input.stakeholder_id || null,
      payment_type,
      subtotal: input.subtotal,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      discount_amount: input.discount_amount,
      vat_amount: input.vat_amount,
      total_amount: input.total_amount,
      amount_paid,
      outstanding_balance,
      gross_sales: input.gross_sales,
      exempt_sales: input.exempt_sales,
      zero_rated_sales: input.zero_rated_sales,
      taxable_sales: input.taxable_sales,
      output_tax: input.output_tax,
      gross_taxable_sales: input.gross_taxable_sales,
      ewt_amount: input.ewt_amount,
      total_amount_due: input.total_amount_due,
      status,
      journal_entry_id: je.id,
      fiscal_period_id,
      notes: input.notes || null,
      override_justification: input.override_justification || null,
      created_by,
    })
    .select()
    .single();

  if (saleError) throw saleError;

  // Update JE source_id to the sale ID
  await supabase
    .from("journal_entries")
    .update({ source_id: sale.id })
    .eq("id", je.id);

  // Step 9: Create sale lines
  const saleLines = lines.map((line) => ({
    sale_id: sale.id,
    item_id: line.item_id || null,
    account_id: line.account_id,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    discount_amount: line.discount_amount,
    price_entry_mode: line.price_entry_mode,
    tax_treatment: line.tax_treatment,
    vat_rate: line.vat_rate,
    vat_amount: line.vat_amount,
    line_total: line.line_total,
    ewt_rate_id: line.ewt_rate_id || null,
    ewt_rate: line.ewt_rate,
    ewt_amount: line.ewt_amount,
    line_order: line.line_order,
  }));

  const { error: saleLinesError } = await supabase
    .from("sale_lines")
    .insert(saleLines);

  if (saleLinesError) throw saleLinesError;

  // Step 10: Auto-create receipt for cash sales
  if (isCash) {
    const receiptNumber = await generateDocumentNumber(entity_id, "official_receipt");

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert({
        entity_id,
        document_number: receiptNumber,
        transaction_date,
        description: `Payment for ${document_number}`,
        stakeholder_id: input.stakeholder_id || null,
        is_standalone: false,
        amount: effectiveAmount,
        payment_method: input.payment_method || "cash",
        check_number: input.check_number || null,
        check_date: input.check_date || null,
        bank_account_id: input.bank_account_id || null,
        status: "posted",
        journal_entry_id: null, // No separate JE — sale's JE already debits Cash/Bank
        fiscal_period_id,
        created_by,
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    // Create receipt allocation
    const { error: allocError } = await supabase
      .from("receipt_allocations")
      .insert({
        receipt_id: receipt.id,
        sale_id: sale.id,
        amount_applied: effectiveAmount,
      });

    if (allocError) throw allocError;
  }

  return sale as Sale;
}

// ---------------------------------------------------------------------------
// Void sale
// ---------------------------------------------------------------------------

export async function voidSale(
  saleId: string,
  voidReason: string,
  userId: string,
  overrideJustification?: string | null
): Promise<void> {
  // Fetch the sale with its JE
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("*, journal_entry:journal_entries(*)")
    .eq("id", saleId)
    .single();

  if (saleError) throw saleError;
  if (!sale) throw new Error("Sale not found.");
  if (sale.status === "voided") throw new Error("Sale is already voided.");

  // Check for external receipts (not auto-created for this sale)
  const { data: allocations } = await supabase
    .from("receipt_allocations")
    .select("receipt_id, receipt:receipts(is_standalone, status)")
    .eq("sale_id", saleId);

  const externalReceipts = (allocations ?? []).filter(
    (a: { receipt: { is_standalone: boolean; status: string } | null }) =>
      a.receipt && (a.receipt.is_standalone || a.receipt.status !== "voided")
  );

  // For cash sales, auto-created receipts are is_standalone=false. They're fine.
  // But if there are receipts from the Receipts module (separate payments for on_account sales),
  // we need to check those.
  if (sale.payment_type === "on_account" && externalReceipts.length > 0) {
    const activeReceipts = externalReceipts.filter(
      (a: { receipt: { status: string } | null }) => a.receipt && a.receipt.status !== "voided"
    );
    if (activeReceipts.length > 0) {
      throw new Error("Cannot void this sale because it has active receipt payments. Void the receipts first.");
    }
  }

  // Fetch original JE lines
  const { data: jeLines } = await supabase
    .from("journal_entry_lines")
    .select("*")
    .eq("journal_entry_id", sale.journal_entry_id);

  // Create reversing journal entry
  const jeNumber = await generateDocumentNumber(sale.entity_id, "journal_entry");

  const { data: reversingJe, error: rjeError } = await supabase
    .from("journal_entries")
    .insert({
      entity_id: sale.entity_id,
      entry_number: jeNumber,
      entry_date: new Date().toISOString().split("T")[0],
      description: `Void reversal: ${sale.document_number}`,
      entry_type: "system_generated",
      source_type: "void_reversal",
      source_id: saleId,
      fiscal_period_id: sale.fiscal_period_id,
      status: "posted",
      reversal_of_entry_id: sale.journal_entry_id,
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
    .eq("id", sale.journal_entry_id);

  // Update the sale
  const { error: updateError } = await supabase
    .from("sales")
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
    .eq("id", saleId);

  if (updateError) throw updateError;

  // Void auto-created receipt for cash sales
  if (sale.payment_type === "cash") {
    const autoReceipts = (allocations ?? []).filter(
      (a: { receipt: { is_standalone: boolean; status: string } | null }) =>
        a.receipt && !a.receipt.is_standalone
    );
    for (const alloc of autoReceipts) {
      await supabase
        .from("receipts")
        .update({
          status: "voided",
          voided_at: new Date().toISOString(),
          voided_by: userId,
          void_reason: `Auto-voided: linked sale ${sale.document_number} was voided`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alloc.receipt_id);
    }
  }
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
