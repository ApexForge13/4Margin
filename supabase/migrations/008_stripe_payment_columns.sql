-- ============================================================
-- Migration 008: Add Stripe payment tracking to supplements
-- ============================================================

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_supplements_stripe_session
  ON supplements(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
