-- Add optional claim context to policy decodings
-- Allows users to specify damage type and description so the
-- decoder focuses on relevant coverages and exclusions.

ALTER TABLE policy_decodings ADD COLUMN IF NOT EXISTS claim_type TEXT;
ALTER TABLE policy_decodings ADD COLUMN IF NOT EXISTS claim_description TEXT;
