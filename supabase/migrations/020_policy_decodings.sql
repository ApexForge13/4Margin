-- Policy Decodings table for standalone Policy Decoder product ($50/decode)
-- Stores uploaded policy PDFs and their parsed analysis results.
-- Independent from supplements — no claim or estimate required.

CREATE TABLE IF NOT EXISTS policy_decodings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  created_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'complete', 'failed')),

  -- Upload
  policy_pdf_url TEXT,
  original_filename TEXT,

  -- Parsed output
  policy_analysis JSONB DEFAULT NULL,
  document_meta JSONB DEFAULT NULL,

  -- Payment
  paid_at TIMESTAMPTZ DEFAULT NULL,
  stripe_checkout_session_id TEXT DEFAULT NULL,
  stripe_payment_id TEXT DEFAULT NULL,
  amount_cents INTEGER DEFAULT 5000,

  -- Meta
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE policy_decodings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company decodings"
  ON policy_decodings FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert for own company"
  ON policy_decodings FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own company decodings"
  ON policy_decodings FOR UPDATE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Index for listing by company
CREATE INDEX IF NOT EXISTS idx_policy_decodings_company
  ON policy_decodings (company_id, created_at DESC);

-- Index for Stripe webhook lookup
CREATE INDEX IF NOT EXISTS idx_policy_decodings_stripe_session
  ON policy_decodings (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

COMMENT ON TABLE policy_decodings IS 'Standalone policy decoder results — $50/decode, independent from supplement flow';
