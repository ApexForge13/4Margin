-- ============================================================
-- ADD 'draft' STATUS BACK TO SUPPLEMENT ENUM
-- Supplements now start as 'draft' until payment is confirmed.
-- Pipeline only runs after payment (free or Stripe).
-- ============================================================

-- IMPORTANT: These must be run as SEPARATE statements in the Supabase
-- SQL editor. PostgreSQL requires new enum values to be committed
-- before they can be referenced.

-- STEP 1: Run this FIRST (alone):
ALTER TYPE supplement_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'generating';

-- STEP 2: Run this SECOND (after step 1 commits):
-- ALTER TABLE supplements ALTER COLUMN status SET DEFAULT 'draft';
