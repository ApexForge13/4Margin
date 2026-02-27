-- Add IRC verification columns to supplement_items
-- These support the building-codes enrichment feature that verifies
-- AI-generated IRC references against jurisdiction-specific databases.

ALTER TABLE supplement_items
  ADD COLUMN IF NOT EXISTS irc_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS irc_source_ref text;
