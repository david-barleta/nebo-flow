// =============================================================================
// Stakeholders — TypeScript Types
// =============================================================================

export type StakeholderType = "individual" | "non_individual";

export interface Stakeholder {
  id: string;
  entity_id: string;
  stakeholder_type: StakeholderType;
  last_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  registered_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tin: string | null;
  is_client: boolean;
  is_supplier: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StakeholderMode = "client" | "supplier";

/**
 * Compute the display name for a stakeholder.
 * - Individual: "Last Name, First Name M." (middle initial if present)
 * - Non-individual: registered_name as-is
 */
export function getStakeholderDisplayName(s: Stakeholder): string {
  if (s.stakeholder_type === "non_individual") {
    return s.registered_name || "";
  }

  const last = s.last_name || "";
  const first = s.first_name || "";
  const middle = s.middle_name
    ? ` ${s.middle_name.charAt(0).toUpperCase()}.`
    : "";

  if (!last && !first) return "";
  if (!last) return `${first}${middle}`;
  if (!first) return last;
  return `${last}, ${first}${middle}`;
}
