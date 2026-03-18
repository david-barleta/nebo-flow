// =============================================================================
// Items / Products & Services — TypeScript Types
// =============================================================================

export type ItemType = "product" | "service";

export type TaxTreatment = "vatable" | "vat_exempt" | "zero_rated";

export type PurchaseCategory = "services" | "capital_goods" | "other_than_capital_goods";

export interface Item {
  id: string;
  entity_id: string;
  name: string;
  description: string | null;
  item_type: ItemType;
  default_unit_price: number | null;
  default_sales_account_id: string | null;
  default_purchase_account_id: string | null;
  default_tax_treatment: TaxTreatment;
  default_purchase_category: PurchaseCategory | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Display labels
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  product: "Product",
  service: "Service",
};

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  vatable: "VATable",
  vat_exempt: "VAT Exempt",
  zero_rated: "Zero Rated",
};

export const PURCHASE_CATEGORY_LABELS: Record<PurchaseCategory, string> = {
  services: "Services",
  capital_goods: "Capital Goods",
  other_than_capital_goods: "Other than Capital Goods",
};

/**
 * Derive the VAT rate from a tax treatment value.
 * 12% for vatable, 0% for exempt or zero-rated.
 */
export function deriveVatRate(taxTreatment: TaxTreatment): number {
  return taxTreatment === "vatable" ? 12.0 : 0.0;
}
