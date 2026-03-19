// =============================================================================
// Settings — TypeScript Types
// =============================================================================

export type NumberingMode = "manual" | "auto";

export type DocumentType =
  | "sales_invoice"
  | "official_receipt"
  | "check_voucher"
  | "purchase_voucher"
  | "journal_entry";

export interface DocumentSequence {
  id: string;
  entity_id: string;
  document_type: DocumentType;
  numbering_mode: NumberingMode;
  prefix: string;
  include_year: boolean;
  next_number: number;
  padding_length: number;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  sales_invoice: "Sales Invoice",
  official_receipt: "Official Receipt",
  check_voucher: "Check Voucher",
  purchase_voucher: "Purchase Voucher",
  journal_entry: "Journal Entry",
};

export const DOCUMENT_TYPE_ORDER: DocumentType[] = [
  "sales_invoice",
  "official_receipt",
  "check_voucher",
  "purchase_voucher",
  "journal_entry",
];

/** Generate a preview of the next document number */
export function previewDocumentNumber(seq: DocumentSequence): string {
  const yearPart = seq.include_year ? new Date().getFullYear().toString() : "";
  const numberPart = String(seq.next_number).padStart(seq.padding_length, "0");
  const parts = [seq.prefix, yearPart, numberPart].filter(Boolean);
  return parts.join("-");
}
