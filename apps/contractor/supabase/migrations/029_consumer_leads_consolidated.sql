-- 029: Consolidated consumer_leads schema
-- Safe to run regardless of which previous migrations (022-028) were applied.
-- All statements use IF NOT EXISTS / IF EXISTS guards.
--
-- Run this in Supabase SQL Editor to fix the DecodeCoverage lead creation error.

-- ── 1. Create table if it doesn't exist (from 022) ─────────────────
CREATE TABLE IF NOT EXISTS consumer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  property_address TEXT,
  carrier TEXT,
  consent_terms BOOLEAN NOT NULL DEFAULT false,
  consent_contact BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'complete', 'failed')),
  policy_pdf_url TEXT,
  original_filename TEXT,
  policy_analysis JSONB DEFAULT NULL,
  document_meta JSONB DEFAULT NULL,
  error_message TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Indexes (from 022) ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consumer_leads_email ON consumer_leads (email);
CREATE INDEX IF NOT EXISTS idx_consumer_leads_created ON consumer_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consumer_leads_consent ON consumer_leads (consent_contact) WHERE consent_contact = true;

-- ── 3. Storage bucket (from 022) ───────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('consumer-policies', 'consumer-policies', false)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Consent certificate (from 023) ──────────────────────────────
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS consent_certificate JSONB DEFAULT NULL;

-- ── 5. Switching interest (from 026) ───────────────────────────────
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS switching_interest BOOLEAN DEFAULT FALSE;

-- ── 6. Funnel overhaul (from 028) ──────────────────────────────────
-- Make contact fields nullable for anonymous leads
ALTER TABLE consumer_leads
  ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE consumer_leads
  ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE consumer_leads
  ALTER COLUMN email DROP NOT NULL;
ALTER TABLE consumer_leads
  ALTER COLUMN consent_terms SET DEFAULT false;

-- Post-results conversion
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT,
  ADD COLUMN IF NOT EXISTS best_time TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Policy score (pre-computed at upload time)
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS policy_score INTEGER,
  ADD COLUMN IF NOT EXISTS policy_grade TEXT;

-- Engagement tracking
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS exit_intent_shown BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS report_downloaded BOOLEAN DEFAULT FALSE;

-- Email re-trigger sequence
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS email_sequence_stage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_sequence_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;

-- Indexes for email sequence and conversion tracking
CREATE INDEX IF NOT EXISTS idx_consumer_leads_email_seq
  ON consumer_leads (email_sequence_stage, email_sequence_started_at)
  WHERE email IS NOT NULL AND email_sequence_stage < 4;

CREATE INDEX IF NOT EXISTS idx_consumer_leads_converted
  ON consumer_leads (converted_at)
  WHERE converted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consumer_leads_score
  ON consumer_leads (policy_score)
  WHERE policy_score IS NOT NULL;
