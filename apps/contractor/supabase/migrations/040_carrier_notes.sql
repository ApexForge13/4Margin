-- Add carrier_notes column for the carrier battle card feature.
-- Stores contractor-authored notes about a specific carrier/policy decode.

ALTER TABLE policy_decodings
  ADD COLUMN IF NOT EXISTS carrier_notes TEXT;
