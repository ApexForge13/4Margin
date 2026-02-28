-- 028: Funnel overhaul — anonymous upload-first flow + engagement tracking
--
-- Changes:
-- 1. Make contact fields nullable (anonymous leads created on upload, backfilled after results)
-- 2. Add engagement/conversion tracking columns
-- 3. Add email sequence tracking for 4-email re-trigger drip

-- ── Allow anonymous leads ─────────────────────────────────────
ALTER TABLE consumer_leads
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE consumer_leads
  ALTER COLUMN consent_terms SET DEFAULT false;

-- ── Post-results conversion ───────────────────────────────────
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS best_time TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- ── Policy score (pre-computed at upload time) ────────────────
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS policy_score INTEGER,
  ADD COLUMN IF NOT EXISTS policy_grade TEXT;

-- ── Engagement tracking ───────────────────────────────────────
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS exit_intent_shown BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS report_downloaded BOOLEAN DEFAULT FALSE;

-- ── Email re-trigger sequence ─────────────────────────────────
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS email_sequence_stage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_sequence_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consumer_leads_email_seq
  ON consumer_leads (email_sequence_stage, email_sequence_started_at)
  WHERE email IS NOT NULL AND email_sequence_stage < 4;

CREATE INDEX IF NOT EXISTS idx_consumer_leads_converted
  ON consumer_leads (converted_at)
  WHERE converted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consumer_leads_score
  ON consumer_leads (policy_score)
  WHERE policy_score IS NOT NULL;
