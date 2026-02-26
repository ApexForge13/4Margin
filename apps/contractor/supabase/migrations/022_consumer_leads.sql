-- Consumer leads table for DecodeCoverage (homeowner-facing policy decoder)
-- No RLS — all access via service role key from server-side API routes.

CREATE TABLE consumer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact (lead capture)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Property
  property_address TEXT,
  carrier TEXT,

  -- Consent
  consent_terms BOOLEAN NOT NULL DEFAULT false,
  consent_contact BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,

  -- Policy analysis
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'complete', 'failed')),
  policy_pdf_url TEXT,
  original_filename TEXT,
  policy_analysis JSONB DEFAULT NULL,
  document_meta JSONB DEFAULT NULL,
  error_message TEXT,

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consumer_leads_email ON consumer_leads (email);
CREATE INDEX idx_consumer_leads_created ON consumer_leads (created_at DESC);
CREATE INDEX idx_consumer_leads_consent ON consumer_leads (consent_contact) WHERE consent_contact = true;

-- Storage bucket for consumer policy uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('consumer-policies', 'consumer-policies', false)
ON CONFLICT (id) DO NOTHING;
