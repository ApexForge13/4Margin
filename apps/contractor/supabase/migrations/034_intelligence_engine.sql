-- 034_intelligence_engine.sql
-- Intelligence Engine: Outcome Tracking & Carrier Intelligence
-- Tracks adjuster responses at supplement and line-item level,
-- aggregates carrier patterns for confidence scoring and rebuttal strategy.

-- =============================================================
-- 1. supplement_outcomes — tracks adjuster response per supplement
-- =============================================================
CREATE TABLE IF NOT EXISTS supplement_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  carrier_name TEXT,
  county_name TEXT,
  -- Overall outcome
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'partially_approved', 'denied', 'pending')),
  adjuster_response_date TIMESTAMPTZ,
  -- Financials
  amount_requested NUMERIC(12,2),
  amount_approved NUMERIC(12,2),
  -- Denial info
  denial_reason TEXT,
  denial_letter_url TEXT,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. item_outcomes — tracks adjuster response per line item
-- =============================================================
CREATE TABLE IF NOT EXISTS item_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_outcome_id UUID NOT NULL REFERENCES supplement_outcomes(id) ON DELETE CASCADE,
  supplement_item_id UUID NOT NULL REFERENCES supplement_items(id) ON DELETE CASCADE,
  xactimate_code TEXT NOT NULL,
  category TEXT,
  carrier_name TEXT,
  county_name TEXT,
  -- Per-item outcome
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'partially_approved', 'denied')),
  amount_requested NUMERIC(12,2),
  amount_approved NUMERIC(12,2),
  -- Denial detail
  denial_language TEXT,
  -- Rebuttal tracking
  rebuttal_submitted BOOLEAN DEFAULT false,
  rebuttal_text TEXT,
  rebuttal_outcome TEXT CHECK (rebuttal_outcome IN ('approved', 'denied', NULL)),
  -- Confidence at time of submission
  confidence_score INTEGER,
  confidence_tier TEXT,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. carrier_patterns — aggregated carrier intelligence
-- =============================================================
CREATE TABLE IF NOT EXISTS carrier_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_name TEXT NOT NULL,
  xactimate_code TEXT,
  county_name TEXT,
  -- Aggregated stats (updated via trigger or batch job)
  total_submissions INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  total_denied INTEGER DEFAULT 0,
  total_partially_approved INTEGER DEFAULT 0,
  approval_rate NUMERIC(5,4),  -- 0.0000 to 1.0000
  avg_amount_requested NUMERIC(12,2),
  avg_amount_approved NUMERIC(12,2),
  -- Denial patterns
  common_denial_language TEXT[],
  -- Rebuttal effectiveness
  rebuttal_attempts INTEGER DEFAULT 0,
  rebuttal_successes INTEGER DEFAULT 0,
  rebuttal_success_rate NUMERIC(5,4),
  best_rebuttal_text TEXT,
  -- Supporting citations
  supporting_citations TEXT[],
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(carrier_name, xactimate_code, county_name)
);

-- =============================================================
-- 4. Indexes
-- =============================================================

-- supplement_outcomes indexes
CREATE INDEX IF NOT EXISTS idx_supplement_outcomes_supplement ON supplement_outcomes(supplement_id);
CREATE INDEX IF NOT EXISTS idx_supplement_outcomes_carrier ON supplement_outcomes(carrier_name);
CREATE INDEX IF NOT EXISTS idx_supplement_outcomes_company ON supplement_outcomes(company_id);

-- item_outcomes indexes
CREATE INDEX IF NOT EXISTS idx_item_outcomes_supplement_outcome ON item_outcomes(supplement_outcome_id);
CREATE INDEX IF NOT EXISTS idx_item_outcomes_code ON item_outcomes(xactimate_code);
CREATE INDEX IF NOT EXISTS idx_item_outcomes_carrier_code ON item_outcomes(carrier_name, xactimate_code);

-- carrier_patterns indexes
CREATE INDEX IF NOT EXISTS idx_carrier_patterns_carrier ON carrier_patterns(carrier_name);
CREATE INDEX IF NOT EXISTS idx_carrier_patterns_code ON carrier_patterns(xactimate_code);
CREATE INDEX IF NOT EXISTS idx_carrier_patterns_lookup ON carrier_patterns(carrier_name, xactimate_code, county_name);

-- =============================================================
-- 5. Row Level Security
-- =============================================================

-- supplement_outcomes: company members can view and insert
ALTER TABLE supplement_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company outcomes" ON supplement_outcomes
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company outcomes" ON supplement_outcomes
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- item_outcomes: accessible via supplement_outcome join
ALTER TABLE item_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view item outcomes" ON item_outcomes
  FOR SELECT USING (supplement_outcome_id IN (
    SELECT id FROM supplement_outcomes WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert item outcomes" ON item_outcomes
  FOR INSERT WITH CHECK (supplement_outcome_id IN (
    SELECT id FROM supplement_outcomes WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ));

-- carrier_patterns: read-only for all authenticated users (cross-company intelligence)
ALTER TABLE carrier_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view carrier patterns" ON carrier_patterns
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================
-- 6. Add confidence columns to supplement_items
-- =============================================================
ALTER TABLE supplement_items ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
ALTER TABLE supplement_items ADD COLUMN IF NOT EXISTS confidence_tier TEXT;
ALTER TABLE supplement_items ADD COLUMN IF NOT EXISTS confidence_details JSONB;
