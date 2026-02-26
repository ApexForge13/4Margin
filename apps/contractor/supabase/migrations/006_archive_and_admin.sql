-- ============================================================
-- Migration 006: Soft delete for claims + admin portal support
-- ============================================================

-- Add archived_at column for soft-delete
ALTER TABLE claims ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Partial index for efficient filtering of non-archived claims
CREATE INDEX IF NOT EXISTS idx_claims_archived ON claims(company_id) WHERE archived_at IS NULL;
