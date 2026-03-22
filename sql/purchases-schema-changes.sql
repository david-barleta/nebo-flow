-- ============================================================================
-- PURCHASES MODULE — Schema Changes
-- Run against your Supabase PostgreSQL database
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add missing columns to `purchases`
-- ---------------------------------------------------------------------------

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS purchase_voucher_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS gross_purchases DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exempt_purchases DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zero_rated_purchases DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_purchases DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS input_tax DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_taxable_purchases DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ewt_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount_due DECIMAL(15,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. Add missing columns to `purchase_lines`
-- ---------------------------------------------------------------------------

ALTER TABLE purchase_lines
  ADD COLUMN IF NOT EXISTS price_entry_mode VARCHAR(20) NOT NULL DEFAULT 'vat_exclusive',
  ADD COLUMN IF NOT EXISTS tax_treatment VARCHAR(20) NOT NULL DEFAULT 'vatable',
  ADD COLUMN IF NOT EXISTS purchase_category VARCHAR(30),
  ADD COLUMN IF NOT EXISTS ewt_rate_id UUID,
  ADD COLUMN IF NOT EXISTS ewt_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ewt_amount DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Add CHECK constraint for purchase_category
ALTER TABLE purchase_lines
  ADD CONSTRAINT chk_purchase_lines_category
  CHECK (purchase_category IS NULL OR purchase_category IN ('services', 'capital_goods', 'other_than_capital_goods'));

-- ---------------------------------------------------------------------------
-- 3. Disable RLS on purchase-related tables
-- ---------------------------------------------------------------------------

ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE disbursements DISABLE ROW LEVEL SECURITY;
ALTER TABLE disbursement_allocations DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Rename check_voucher → disbursement_voucher in document_sequences
-- ---------------------------------------------------------------------------

-- Update the CHECK constraint on document_sequences.document_type
ALTER TABLE document_sequences
  DROP CONSTRAINT IF EXISTS document_sequences_document_type_check;

ALTER TABLE document_sequences
  ADD CONSTRAINT document_sequences_document_type_check
  CHECK (document_type IN (
    'sales_invoice', 'official_receipt', 'disbursement_voucher',
    'purchase_voucher', 'journal_entry'
  ));

-- Rename any existing check_voucher rows to disbursement_voucher
UPDATE document_sequences
  SET document_type = 'disbursement_voucher'
  WHERE document_type = 'check_voucher';

-- ---------------------------------------------------------------------------
-- 5. Ensure document sequences exist for purchase_voucher and disbursement_voucher
--    (Run per entity — replace 'YOUR_ENTITY_ID' with actual entity UUID)
-- ---------------------------------------------------------------------------

-- Example for a single entity (adjust entity_id as needed):
-- INSERT INTO document_sequences (entity_id, document_type, prefix, include_year, next_number, padding_length)
-- VALUES
--   ('YOUR_ENTITY_ID', 'purchase_voucher', 'PV', true, 1, 4),
--   ('YOUR_ENTITY_ID', 'disbursement_voucher', 'DV', true, 1, 4)
-- ON CONFLICT (entity_id, document_type) DO NOTHING;
