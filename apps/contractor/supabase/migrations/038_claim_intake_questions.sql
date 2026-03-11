-- Migration 038: Add intake questions to claims table
-- Three new property condition fields for stronger supplement justifications:
-- 1. gutters_nailed_through_drip_edge — determines if drip edge removal requires gutter re-hang
-- 2. roof_under_warranty — affects whether manufacturer installation requirements can be used in rebuttals
-- 3. pre_existing_conditions — documents known issues prior to loss event

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS gutters_nailed_through_drip_edge TEXT,
  ADD COLUMN IF NOT EXISTS roof_under_warranty TEXT,
  ADD COLUMN IF NOT EXISTS pre_existing_conditions TEXT;

-- Add check constraints for enum-like fields
ALTER TABLE claims
  ADD CONSTRAINT chk_gutters_drip_edge
    CHECK (gutters_nailed_through_drip_edge IS NULL OR gutters_nailed_through_drip_edge IN ('yes', 'no', 'unknown'));

ALTER TABLE claims
  ADD CONSTRAINT chk_roof_warranty
    CHECK (roof_under_warranty IS NULL OR roof_under_warranty IN ('yes', 'no', 'unknown'));

COMMENT ON COLUMN claims.gutters_nailed_through_drip_edge IS 'Whether gutters are nailed through drip edge — affects drip edge replacement scope';
COMMENT ON COLUMN claims.roof_under_warranty IS 'Whether current roof is under manufacturer warranty — affects rebuttal strategy';
COMMENT ON COLUMN claims.pre_existing_conditions IS 'Pre-existing property conditions noted by contractor before loss event';
