// =============================================================================
// System Account Mappings — TypeScript Types
// =============================================================================

export type SystemAccountKey =
  | "default_cash"
  | "accounts_receivable"
  | "accounts_payable"
  | "output_vat"
  | "input_vat"
  | "creditable_withholding_tax"
  | "ewt_payable";

export interface SystemAccountMapping {
  id: string;
  entity_id: string;
  mapping_key: SystemAccountKey;
  account_id: string;
  created_at: string;
  updated_at: string;
}

export interface SystemAccountMappingWithAccount extends SystemAccountMapping {
  account?: {
    id: string;
    account_code: string | null;
    account_name: string;
    account_type: string;
  } | null;
}

export const SYSTEM_ACCOUNT_LABELS: Record<SystemAccountKey, string> = {
  default_cash: "Default Cash Account",
  accounts_receivable: "Accounts Receivable",
  accounts_payable: "Accounts Payable",
  output_vat: "Output VAT",
  input_vat: "Input VAT",
  creditable_withholding_tax: "Creditable Withholding Tax",
  ewt_payable: "EWT Payable",
};

export const SYSTEM_ACCOUNT_DESCRIPTIONS: Record<SystemAccountKey, string> = {
  default_cash:
    "Used when recording cash sales or cash purchases (payment method = cash).",
  accounts_receivable:
    "Debited when recording on-account sales. Credited when receipts are applied.",
  accounts_payable:
    "Credited when recording on-account purchases. Debited when disbursements are applied.",
  output_vat:
    "Credited for VAT collected on sales.",
  input_vat:
    "Debited for VAT paid on purchases.",
  creditable_withholding_tax:
    "Debited for expanded withholding tax (EWT) withheld by customers on sales. Used as a tax credit.",
  ewt_payable:
    "Credited when the entity withholds EWT from suppliers on purchases. Represents the liability to remit to the BIR.",
};

export const SYSTEM_ACCOUNT_ORDER: SystemAccountKey[] = [
  "default_cash",
  "accounts_receivable",
  "accounts_payable",
  "output_vat",
  "input_vat",
  "creditable_withholding_tax",
  "ewt_payable",
];

/** The expected account_type for each mapping key */
export const SYSTEM_ACCOUNT_EXPECTED_TYPE: Record<SystemAccountKey, string> = {
  default_cash: "asset",
  accounts_receivable: "asset",
  accounts_payable: "liability",
  output_vat: "liability",
  input_vat: "asset",
  creditable_withholding_tax: "asset",
  ewt_payable: "liability",
};
