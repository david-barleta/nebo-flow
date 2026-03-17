// =============================================================================
// Default Philippine Chart of Accounts Template
// =============================================================================
// Each entry is either a header (grouping) or a detail account.
// Headers have no code and is_header=true.
// Detail accounts have codes and is_header=false.
// The "parentRef" field links detail accounts to their header's ref key.
// =============================================================================

import type { AccountType } from "./types";
import { deriveNormalBalance } from "./types";

interface TemplateAccount {
  ref: string; // internal key for linking parent-child
  parentRef?: string; // ref of parent header
  account_code: string | null;
  account_name: string;
  account_type: AccountType;
  account_sub_type: string;
  is_header: boolean;
  is_contra: boolean;
}

const TEMPLATE: TemplateAccount[] = [
  // ── ASSETS ──────────────────────────────────────────────────────
  // Current Assets
  { ref: "h_cash", account_code: null, account_name: "Cash and Cash Equivalents", account_type: "asset", account_sub_type: "Current Asset", is_header: true, is_contra: false },
  { ref: "101", parentRef: "h_cash", account_code: "101", account_name: "Cash on Hand", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },
  { ref: "102", parentRef: "h_cash", account_code: "102", account_name: "Cash in Bank", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },

  { ref: "h_receivables", account_code: null, account_name: "Receivables", account_type: "asset", account_sub_type: "Current Asset", is_header: true, is_contra: false },
  { ref: "110", parentRef: "h_receivables", account_code: "110", account_name: "Accounts Receivable", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },
  { ref: "111", parentRef: "h_receivables", account_code: "111", account_name: "Allowance for Doubtful Accounts", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: true },
  { ref: "112", parentRef: "h_receivables", account_code: "112", account_name: "Notes Receivable", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },

  { ref: "h_other_current", account_code: null, account_name: "Other Current Assets", account_type: "asset", account_sub_type: "Current Asset", is_header: true, is_contra: false },
  { ref: "120", parentRef: "h_other_current", account_code: "120", account_name: "Advances to Employees", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },
  { ref: "121", parentRef: "h_other_current", account_code: "121", account_name: "Inventory", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },
  { ref: "122", parentRef: "h_other_current", account_code: "122", account_name: "Prepaid Expenses", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },
  { ref: "123", parentRef: "h_other_current", account_code: "123", account_name: "Input VAT", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },
  { ref: "124", parentRef: "h_other_current", account_code: "124", account_name: "Creditable Withholding Tax", account_type: "asset", account_sub_type: "Current Asset", is_header: false, is_contra: false },

  // Fixed Assets
  { ref: "h_ppe", account_code: null, account_name: "Property, Plant and Equipment", account_type: "asset", account_sub_type: "Fixed Asset", is_header: true, is_contra: false },
  { ref: "150", parentRef: "h_ppe", account_code: "150", account_name: "Office Equipment", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: false },
  { ref: "151", parentRef: "h_ppe", account_code: "151", account_name: "Accumulated Depreciation - Office Equipment", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: true },
  { ref: "152", parentRef: "h_ppe", account_code: "152", account_name: "Furniture and Fixtures", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: false },
  { ref: "153", parentRef: "h_ppe", account_code: "153", account_name: "Accumulated Depreciation - Furniture and Fixtures", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: true },
  { ref: "154", parentRef: "h_ppe", account_code: "154", account_name: "Building", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: false },
  { ref: "155", parentRef: "h_ppe", account_code: "155", account_name: "Accumulated Depreciation - Building", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: true },
  { ref: "156", parentRef: "h_ppe", account_code: "156", account_name: "Land", account_type: "asset", account_sub_type: "Fixed Asset", is_header: false, is_contra: false },

  // Non-Current & Other Assets
  { ref: "160", account_code: "160", account_name: "Intangible Assets", account_type: "asset", account_sub_type: "Non-Current Asset", is_header: false, is_contra: false },
  { ref: "170", account_code: "170", account_name: "Other Assets", account_type: "asset", account_sub_type: "Other Asset", is_header: false, is_contra: false },

  // ── LIABILITIES ─────────────────────────────────────────────────
  { ref: "h_trade_payables", account_code: null, account_name: "Trade and Other Payables", account_type: "liability", account_sub_type: "Current Liability", is_header: true, is_contra: false },
  { ref: "201", parentRef: "h_trade_payables", account_code: "201", account_name: "Accounts Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "202", parentRef: "h_trade_payables", account_code: "202", account_name: "Notes Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "203", parentRef: "h_trade_payables", account_code: "203", account_name: "Accrued Expenses", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },

  { ref: "h_tax", account_code: null, account_name: "Tax Obligations", account_type: "liability", account_sub_type: "Current Liability", is_header: true, is_contra: false },
  { ref: "210", parentRef: "h_tax", account_code: "210", account_name: "VAT Payable (Output Tax)", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "211", parentRef: "h_tax", account_code: "211", account_name: "Withholding Tax Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "212", parentRef: "h_tax", account_code: "212", account_name: "Income Tax Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },

  { ref: "h_govt", account_code: null, account_name: "Government Contributions Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: true, is_contra: false },
  { ref: "220", parentRef: "h_govt", account_code: "220", account_name: "SSS Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "221", parentRef: "h_govt", account_code: "221", account_name: "PhilHealth Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "222", parentRef: "h_govt", account_code: "222", account_name: "Pag-IBIG Payable", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },

  { ref: "230", account_code: "230", account_name: "Unearned Revenue", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "240", account_code: "240", account_name: "Loans Payable - Current", account_type: "liability", account_sub_type: "Current Liability", is_header: false, is_contra: false },
  { ref: "250", account_code: "250", account_name: "Loans Payable - Non-Current", account_type: "liability", account_sub_type: "Non-Current Liability", is_header: false, is_contra: false },
  { ref: "260", account_code: "260", account_name: "Other Liabilities", account_type: "liability", account_sub_type: "Other Liability", is_header: false, is_contra: false },

  // ── EQUITY ──────────────────────────────────────────────────────
  { ref: "301", account_code: "301", account_name: "Owner's Equity", account_type: "equity", account_sub_type: "Owner's Equity", is_header: false, is_contra: false },
  { ref: "302", account_code: "302", account_name: "Capital Stock", account_type: "equity", account_sub_type: "Capital Stock", is_header: false, is_contra: false },
  { ref: "310", account_code: "310", account_name: "Retained Earnings", account_type: "equity", account_sub_type: "Retained Earnings", is_header: false, is_contra: false },
  { ref: "311", account_code: "311", account_name: "Dividends / Drawing", account_type: "equity", account_sub_type: "Drawing/Dividends", is_header: false, is_contra: false },

  // ── REVENUE ─────────────────────────────────────────────────────
  { ref: "401", account_code: "401", account_name: "Sales Revenue", account_type: "revenue", account_sub_type: "Operating Revenue", is_header: false, is_contra: false },
  { ref: "402", account_code: "402", account_name: "Service Revenue", account_type: "revenue", account_sub_type: "Operating Revenue", is_header: false, is_contra: false },
  { ref: "410", account_code: "410", account_name: "Interest Income", account_type: "revenue", account_sub_type: "Non-Operating Revenue", is_header: false, is_contra: false },
  { ref: "411", account_code: "411", account_name: "Gain on Sale of Assets", account_type: "revenue", account_sub_type: "Non-Operating Revenue", is_header: false, is_contra: false },
  { ref: "420", account_code: "420", account_name: "Other Income", account_type: "revenue", account_sub_type: "Other Revenue", is_header: false, is_contra: false },

  // ── EXPENSES ────────────────────────────────────────────────────
  { ref: "501", account_code: "501", account_name: "Cost of Sales", account_type: "expense", account_sub_type: "Cost of Sales", is_header: false, is_contra: false },
  { ref: "502", account_code: "502", account_name: "Cost of Services", account_type: "expense", account_sub_type: "Cost of Sales", is_header: false, is_contra: false },

  { ref: "h_personnel", account_code: null, account_name: "Personnel Costs", account_type: "expense", account_sub_type: "Operating Expense", is_header: true, is_contra: false },
  { ref: "510", parentRef: "h_personnel", account_code: "510", account_name: "Salaries and Wages", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "511", parentRef: "h_personnel", account_code: "511", account_name: "Employee Benefits", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "512", parentRef: "h_personnel", account_code: "512", account_name: "SSS Contribution - Employer", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "513", parentRef: "h_personnel", account_code: "513", account_name: "PhilHealth Contribution - Employer", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "514", parentRef: "h_personnel", account_code: "514", account_name: "Pag-IBIG Contribution - Employer", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "515", parentRef: "h_personnel", account_code: "515", account_name: "13th Month Pay", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },

  { ref: "h_gna", account_code: null, account_name: "General and Administrative", account_type: "expense", account_sub_type: "Operating Expense", is_header: true, is_contra: false },
  { ref: "520", parentRef: "h_gna", account_code: "520", account_name: "Rent Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "521", parentRef: "h_gna", account_code: "521", account_name: "Utilities Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "522", parentRef: "h_gna", account_code: "522", account_name: "Office Supplies Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "523", parentRef: "h_gna", account_code: "523", account_name: "Communication Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "524", parentRef: "h_gna", account_code: "524", account_name: "Internet Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "525", parentRef: "h_gna", account_code: "525", account_name: "Repairs and Maintenance", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "526", parentRef: "h_gna", account_code: "526", account_name: "Insurance Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "527", parentRef: "h_gna", account_code: "527", account_name: "Bank Charges", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },

  { ref: "h_professional", account_code: null, account_name: "Professional and Outside Services", account_type: "expense", account_sub_type: "Operating Expense", is_header: true, is_contra: false },
  { ref: "540", parentRef: "h_professional", account_code: "540", account_name: "Professional Fees", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "541", parentRef: "h_professional", account_code: "541", account_name: "Legal Fees", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "542", parentRef: "h_professional", account_code: "542", account_name: "Accounting Fees", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },

  { ref: "h_depreciation", account_code: null, account_name: "Depreciation and Amortization", account_type: "expense", account_sub_type: "Operating Expense", is_header: true, is_contra: false },
  { ref: "530", parentRef: "h_depreciation", account_code: "530", account_name: "Depreciation Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "531", parentRef: "h_depreciation", account_code: "531", account_name: "Amortization Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },

  { ref: "h_taxes_permits", account_code: null, account_name: "Taxes, Permits, and Licenses", account_type: "expense", account_sub_type: "Operating Expense", is_header: true, is_contra: false },
  { ref: "550", parentRef: "h_taxes_permits", account_code: "550", account_name: "Taxes and Licenses", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "551", parentRef: "h_taxes_permits", account_code: "551", account_name: "Business Permits and Registration", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },

  { ref: "h_selling", account_code: null, account_name: "Selling and Marketing", account_type: "expense", account_sub_type: "Operating Expense", is_header: true, is_contra: false },
  { ref: "560", parentRef: "h_selling", account_code: "560", account_name: "Transportation and Travel", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "561", parentRef: "h_selling", account_code: "561", account_name: "Gas and Oil Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "570", parentRef: "h_selling", account_code: "570", account_name: "Representation and Entertainment", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "571", parentRef: "h_selling", account_code: "571", account_name: "Advertising and Promotion", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },

  { ref: "580", account_code: "580", account_name: "Bad Debt Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "590", account_code: "590", account_name: "Miscellaneous Expense", account_type: "expense", account_sub_type: "Operating Expense", is_header: false, is_contra: false },
  { ref: "591", account_code: "591", account_name: "Interest Expense", account_type: "expense", account_sub_type: "Non-Operating Expense", is_header: false, is_contra: false },
  { ref: "592", account_code: "592", account_name: "Loss on Sale of Assets", account_type: "expense", account_sub_type: "Non-Operating Expense", is_header: false, is_contra: false },
];

// Build the insert-ready rows from the template.
// Headers are inserted first so we get their UUIDs, then details reference them.
export function buildDefaultChartRows(entityId: string) {
  // We need to insert headers first, get their IDs, then insert details.
  // Since Supabase returns inserted rows, we do it in two passes.

  let displayOrder = 0;

  const headers = TEMPLATE.filter((t) => t.is_header).map((t) => ({
    _ref: t.ref,
    entity_id: entityId,
    account_code: null,
    account_name: t.account_name,
    account_type: t.account_type,
    account_sub_type: t.account_sub_type,
    normal_balance: deriveNormalBalance(t.account_type, t.is_contra),
    is_header: true,
    is_contra: t.is_contra,
    is_active: true,
    is_system_account: true,
    parent_account_id: null,
    display_order: displayOrder++,
    description: null,
  }));

  const details = TEMPLATE.filter((t) => !t.is_header).map((t) => ({
    _ref: t.ref,
    _parentRef: t.parentRef || null,
    entity_id: entityId,
    account_code: t.account_code,
    account_name: t.account_name,
    account_type: t.account_type,
    account_sub_type: t.account_sub_type,
    normal_balance: deriveNormalBalance(t.account_type, t.is_contra),
    is_header: false,
    is_contra: t.is_contra,
    is_active: true,
    is_system_account: true,
    parent_account_id: null, // will be set after headers are inserted
    display_order: displayOrder++,
    description: null,
  }));

  return { headers, details };
}
