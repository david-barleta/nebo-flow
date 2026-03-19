// =============================================================================
// Receipts — Supabase Queries
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Receipt,
  ReceiptWithStakeholder,
  ReceiptDetail,
  PaymentMethod,
  OutstandingSale,
} from "./types";
import { resolveSystemAccount } from "@/lib/settings/system-accounts-queries";

const supabase = createClient();

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function fetchReceipts(
  entityId: string
): Promise<ReceiptWithStakeholder[]> {
  const { data, error } = await supabase
    .from("receipts")
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
  return (data ?? []) as ReceiptWithStakeholder[];
}

export async function fetchReceiptById(
  receiptId: string
): Promise<ReceiptDetail> {
  const { data, error } = await supabase
    .from("receipts")
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
      journal_entry:journal_entries!receipts_journal_entry_id_fkey (
        id,
        entry_number,
        entry_date,
        description,
        status
      )
    `
    )
    .eq("id", receiptId)
    .single();

  if (error) throw error;

  // Fetch receipt allocations with linked sale info
  const { data: allocations } = await supabase
    .from("receipt_allocations")
    .select(
      `
      id,
      amount_applied,
      sale:sales (
        id,
        document_number,
        sales_invoice_number,
        transaction_date,
        total_amount,
        total_amount_due,
        outstanding_balance,
        status
      )
    `
    )
    .eq("receipt_id", receiptId);

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

  return {
    ...data,
    receipt_allocations: allocations ?? [],
    voided_by_user,
  } as ReceiptDetail;
}

/** Fetch outstanding sales for a client (for allocation picker) */
export async function fetchOutstandingSales(
  entityId: string,
  stakeholderId: string
): Promise<OutstandingSale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, document_number, sales_invoice_number, transaction_date, total_amount, total_amount_due, amount_paid, outstanding_balance, status"
    )
    .eq("entity_id", entityId)
    .eq("stakeholder_id", stakeholderId)
    .in("status", ["posted", "partially_paid"])
    .gt("outstanding_balance", 0)
    .order("transaction_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OutstandingSale[];
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
    .update({
      next_number: seq.next_number + 1,
      updated_at: new Date().toISOString(),
    })
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
  const yearPart = data.include_year
    ? new Date().getFullYear().toString()
    : "";
  const numberPart = String(data.next_number).padStart(
    data.padding_length,
    "0"
  );
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
): Promise<{
  blocked: boolean;
  requiresJustification: boolean;
  reason: string;
}> {
  const { data: entity } = await supabase
    .from("entities")
    .select("reporting_lock_date, year_end_lock_date")
    .eq("id", entityId)
    .single();

  if (!entity)
    return { blocked: false, requiresJustification: false, reason: "" };

  // Year-end lock is absolute — no override
  if (
    entity.year_end_lock_date &&
    transactionDate <= entity.year_end_lock_date
  ) {
    return {
      blocked: true,
      requiresJustification: false,
      reason: `Transaction date is on or before the year-end lock date (${entity.year_end_lock_date}). This cannot be overridden.`,
    };
  }

  // Reporting lock — can be overridden with justification
  if (
    entity.reporting_lock_date &&
    transactionDate <= entity.reporting_lock_date
  ) {
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
// Create receipt (the main transaction)
// ---------------------------------------------------------------------------

export interface CreateReceiptInput {
  entity_id: string;
  transaction_date: string;
  description: string | null;
  stakeholder_id: string | null;
  is_standalone: boolean;
  standalone_account_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  check_number: string | null;
  check_date: string | null;
  bank_account_id: string | null;
  notes: string | null;
  override_justification: string | null;
  // Allocations (for applied receipts only)
  allocations: {
    sale_id: string;
    amount_applied: number;
  }[];
  // Auth context
  created_by: string;
}

export async function createReceipt(
  input: CreateReceiptInput
): Promise<Receipt> {
  const {
    entity_id,
    transaction_date,
    is_standalone,
    amount,
    payment_method,
    created_by,
  } = input;

  // Step 1: Generate document number
  const document_number = await generateDocumentNumber(
    entity_id,
    "official_receipt"
  );

  // Step 2: Determine fiscal period
  const fiscal_period_id = await findFiscalPeriod(entity_id, transaction_date);

  // Step 3: Determine debit account (Cash/Bank)
  let debitAccountId: string;
  if (payment_method === "cash") {
    debitAccountId = await resolveSystemAccount(entity_id, "default_cash");
  } else {
    // Check or bank transfer — use the bank account's GL account
    if (!input.bank_account_id)
      throw new Error(
        "Bank account is required for check/bank transfer payments."
      );
    const { data: bankAcct } = await supabase
      .from("bank_accounts")
      .select("account_id")
      .eq("id", input.bank_account_id)
      .single();
    if (!bankAcct) throw new Error("Bank account not found.");
    debitAccountId = bankAcct.account_id;
  }

  // Step 4: Determine credit account
  let creditAccountId: string;
  if (is_standalone) {
    if (!input.standalone_account_id)
      throw new Error("Income account is required for standalone receipts.");
    creditAccountId = input.standalone_account_id;
  } else {
    // Applied receipt — credit Accounts Receivable
    creditAccountId = await resolveSystemAccount(
      entity_id,
      "accounts_receivable"
    );
  }

  // Step 5: Create journal entry
  const jeNumber = await generateDocumentNumber(entity_id, "journal_entry");

  const { data: je, error: jeError } = await supabase
    .from("journal_entries")
    .insert({
      entity_id,
      entry_number: jeNumber,
      entry_date: transaction_date,
      description:
        input.description || `Official Receipt ${document_number}`,
      entry_type: "system_generated",
      source_type: "receipt",
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
  const jeLines = [
    {
      journal_entry_id: je.id,
      account_id: debitAccountId,
      description: "Cash/Bank received",
      debit_amount: amount,
      credit_amount: 0,
      line_order: 1,
    },
    {
      journal_entry_id: je.id,
      account_id: creditAccountId,
      description: is_standalone ? "Income" : "Accounts Receivable",
      debit_amount: 0,
      credit_amount: amount,
      line_order: 2,
    },
  ];

  const { error: jeLinesError } = await supabase
    .from("journal_entry_lines")
    .insert(jeLines);

  if (jeLinesError) throw jeLinesError;

  // Step 7: Create the receipt
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      entity_id,
      document_number,
      transaction_date,
      description: input.description || null,
      stakeholder_id: input.stakeholder_id || null,
      is_standalone,
      standalone_account_id: input.standalone_account_id || null,
      amount,
      payment_method,
      check_number: input.check_number || null,
      check_date: input.check_date || null,
      bank_account_id: input.bank_account_id || null,
      status: "posted",
      journal_entry_id: je.id,
      fiscal_period_id,
      notes: input.notes || null,
      override_justification: input.override_justification || null,
      created_by,
    })
    .select()
    .single();

  if (receiptError) throw receiptError;

  // Update JE source_id to the receipt ID
  await supabase
    .from("journal_entries")
    .update({ source_id: receipt.id })
    .eq("id", je.id);

  // Step 8: Create receipt allocations and update sale statuses
  if (!is_standalone && input.allocations.length > 0) {
    const allocationRows = input.allocations.map((a) => ({
      receipt_id: receipt.id,
      sale_id: a.sale_id,
      amount_applied: a.amount_applied,
    }));

    const { error: allocError } = await supabase
      .from("receipt_allocations")
      .insert(allocationRows);

    if (allocError) throw allocError;

    // Update each allocated sale's payment fields
    for (const alloc of input.allocations) {
      const { data: sale } = await supabase
        .from("sales")
        .select("amount_paid, outstanding_balance, total_amount, total_amount_due, ewt_amount")
        .eq("id", alloc.sale_id)
        .single();

      if (sale) {
        const newAmountPaid = sale.amount_paid + alloc.amount_applied;
        const effectiveTotal =
          sale.ewt_amount > 0 ? sale.total_amount_due : sale.total_amount;
        const newBalance = effectiveTotal - newAmountPaid;
        const newStatus =
          newBalance <= 0
            ? "paid"
            : newAmountPaid > 0
              ? "partially_paid"
              : "posted";

        await supabase
          .from("sales")
          .update({
            amount_paid: Math.round(newAmountPaid * 100) / 100,
            outstanding_balance: Math.max(
              0,
              Math.round(newBalance * 100) / 100
            ),
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", alloc.sale_id);
      }
    }
  }

  return receipt as Receipt;
}

// ---------------------------------------------------------------------------
// Void receipt
// ---------------------------------------------------------------------------

export async function voidReceipt(
  receiptId: string,
  voidReason: string,
  userId: string,
  overrideJustification?: string | null
): Promise<void> {
  // Fetch the receipt
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", receiptId)
    .single();

  if (receiptError) throw receiptError;
  if (!receipt) throw new Error("Receipt not found.");
  if (receipt.status === "voided") throw new Error("Receipt is already voided.");

  // Fetch original JE lines
  const { data: jeLines } = await supabase
    .from("journal_entry_lines")
    .select("*")
    .eq("journal_entry_id", receipt.journal_entry_id);

  // Create reversing journal entry
  const jeNumber = await generateDocumentNumber(
    receipt.entity_id,
    "journal_entry"
  );

  const { data: reversingJe, error: rjeError } = await supabase
    .from("journal_entries")
    .insert({
      entity_id: receipt.entity_id,
      entry_number: jeNumber,
      entry_date: new Date().toISOString().split("T")[0],
      description: `Void reversal: ${receipt.document_number}`,
      entry_type: "system_generated",
      source_type: "void_reversal",
      source_id: receiptId,
      fiscal_period_id: receipt.fiscal_period_id,
      status: "posted",
      reversal_of_entry_id: receipt.journal_entry_id,
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
      (line: {
        account_id: string;
        description: string | null;
        debit_amount: number;
        credit_amount: number;
        line_order: number;
      }) => ({
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
  if (receipt.journal_entry_id) {
    await supabase
      .from("journal_entries")
      .update({ reversed_by_entry_id: reversingJe.id })
      .eq("id", receipt.journal_entry_id);
  }

  // Update the receipt
  const { error: updateError } = await supabase
    .from("receipts")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      voided_by: userId,
      void_reason: voidReason,
      reversing_journal_entry_id: reversingJe.id,
      override_justification: overrideJustification || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", receiptId);

  if (updateError) throw updateError;

  // Reverse sale status updates for applied receipts
  if (!receipt.is_standalone) {
    const { data: allocations } = await supabase
      .from("receipt_allocations")
      .select("sale_id, amount_applied")
      .eq("receipt_id", receiptId);

    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        const { data: sale } = await supabase
          .from("sales")
          .select("amount_paid, total_amount, total_amount_due, ewt_amount")
          .eq("id", alloc.sale_id)
          .single();

        if (sale) {
          const newAmountPaid = sale.amount_paid - alloc.amount_applied;
          const effectiveTotal =
            sale.ewt_amount > 0 ? sale.total_amount_due : sale.total_amount;
          const newBalance = effectiveTotal - newAmountPaid;
          const newStatus =
            newAmountPaid <= 0
              ? "posted"
              : newBalance <= 0
                ? "paid"
                : "partially_paid";

          await supabase
            .from("sales")
            .update({
              amount_paid: Math.max(
                0,
                Math.round(newAmountPaid * 100) / 100
              ),
              outstanding_balance: Math.max(
                0,
                Math.round(newBalance * 100) / 100
              ),
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", alloc.sale_id);
        }
      }
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
