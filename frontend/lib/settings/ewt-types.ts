// =============================================================================
// Expanded Withholding Tax (EWT) Rates — Types
// =============================================================================

export interface EwtRate {
  id: string;
  entity_id: string;
  category_name: string;
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
