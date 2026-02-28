-- Policy Checks — contractor-initiated homeowner policy analysis links
-- Contractor sends a link; homeowner uploads policy; both see tailored reports.
-- Contractor pays $29/check via Stripe.

CREATE TABLE IF NOT EXISTS policy_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- Claim context (set by contractor)
  claim_type      TEXT,  -- wind, hail, fire, water_flood, impact, theft, other

  -- Homeowner info (set by contractor, updated by homeowner on submission)
  homeowner_first_name  TEXT,
  homeowner_last_name   TEXT,
  homeowner_email       TEXT NOT NULL,
  homeowner_phone       TEXT,
  homeowner_address     TEXT,

  -- Status lifecycle: pending → opened → processing → complete / failed / expired
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'opened', 'processing', 'complete', 'failed', 'expired')),

  -- Policy upload (set when homeowner submits)
  policy_pdf_url    TEXT,
  original_filename TEXT,
  carrier           TEXT,

  -- Analysis results (same JSONB shape as consumer_leads.policy_analysis)
  policy_analysis   JSONB DEFAULT NULL,
  document_meta     JSONB DEFAULT NULL,
  error_message     TEXT,

  -- Consent (captured when homeowner submits)
  consent_terms       BOOLEAN DEFAULT FALSE,
  consent_timestamp   TIMESTAMPTZ,
  consent_certificate JSONB DEFAULT NULL,

  -- Payment ($29/check via Stripe)
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'free')),
  stripe_payment_id TEXT,

  -- Claim outcome (set by contractor after viewing results)
  outcome TEXT DEFAULT NULL
    CHECK (outcome IS NULL OR outcome IN ('claim_filed', 'no_claim')),
  outcome_set_at TIMESTAMPTZ,

  -- Lead lifecycle
  retrigger_at      TIMESTAMPTZ,          -- set to submitted_at + 120 days on submission
  concierge_status  TEXT NOT NULL DEFAULT 'none'
    CHECK (concierge_status IN ('none', 'email_sent', 'opted_in', 'opted_out')),
  concierge_sent_at TIMESTAMPTZ,
  lead_contactable  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Link management
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_policy_checks_company    ON policy_checks (company_id, created_at DESC);
CREATE INDEX idx_policy_checks_token      ON policy_checks (token);
CREATE INDEX idx_policy_checks_email      ON policy_checks (homeowner_email);
CREATE INDEX idx_policy_checks_retrigger  ON policy_checks (retrigger_at)
  WHERE retrigger_at IS NOT NULL AND NOT lead_contactable;

-- RLS — company members can read/write their own company's checks
ALTER TABLE policy_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view policy checks"
  ON policy_checks FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Company members can create policy checks"
  ON policy_checks FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Company members can update policy checks"
  ON policy_checks FOR UPDATE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

COMMENT ON TABLE policy_checks IS 'Contractor-initiated policy analysis links. Token-based public access for homeowner form; RLS for contractor dashboard.';
