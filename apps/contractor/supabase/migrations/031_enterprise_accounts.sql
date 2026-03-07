-- Enterprise accounts: add account_type + Stripe subscription columns to companies,
-- offices table, company_email_domains for auto-join, office_manager role,
-- office_id on users, and usage_records for metered billing.

-- ── Companies: enterprise columns ─────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (account_type IN ('individual', 'enterprise')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL
    CHECK (subscription_status IS NULL OR subscription_status IN
      ('active', 'past_due', 'canceled', 'trialing', 'unpaid')),
  ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMPTZ,

  -- Per-client pricing (set when enterprise deal is provisioned)
  ADD COLUMN IF NOT EXISTS base_monthly_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_decode_limit INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_supplement_limit INTEGER,
  ADD COLUMN IF NOT EXISTS overage_decode_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS overage_supplement_price_cents INTEGER,

  -- Stripe Price + SubscriptionItem IDs (unique per client)
  ADD COLUMN IF NOT EXISTS stripe_base_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_overage_decode_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_overage_supplement_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_sub_item_base TEXT,
  ADD COLUMN IF NOT EXISTS stripe_sub_item_decode TEXT,
  ADD COLUMN IF NOT EXISTS stripe_sub_item_supplement TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_stripe_customer
  ON companies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── Offices ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offices_company ON offices (company_id);

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

-- All company members can view offices
CREATE POLICY "Users can view company offices"
  ON offices FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Only owners can manage offices
CREATE POLICY "Owners can insert offices"
  ON offices FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

CREATE POLICY "Owners can update offices"
  ON offices FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

CREATE POLICY "Owners can delete offices"
  ON offices FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

-- updated_at trigger
CREATE TRIGGER trg_offices_updated BEFORE UPDATE ON offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Company Email Domains (for auto-join) ─────────────────────────────

CREATE TABLE IF NOT EXISTS company_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_email_domains_domain ON company_email_domains (domain);

ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;

-- All company members can view domains
CREATE POLICY "Users can view company domains"
  ON company_email_domains FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Only owners can manage domains
CREATE POLICY "Owners can insert domains"
  ON company_email_domains FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

CREATE POLICY "Owners can delete domains"
  ON company_email_domains FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'owner'
  );

-- ── Users: add office_id ──────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_office ON users (office_id)
  WHERE office_id IS NOT NULL;

-- ── Expand role enum ──────────────────────────────────────────────────

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'office_manager';

-- ── Usage Records ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('decode', 'supplement', 'policy_check')),
  reference_id UUID NOT NULL,
  billing_period_start DATE NOT NULL,
  is_overage BOOLEAN NOT NULL DEFAULT false,
  stripe_usage_record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_company_period
  ON usage_records (company_id, billing_period_start, record_type);

CREATE INDEX IF NOT EXISTS idx_usage_records_user
  ON usage_records (user_id);

CREATE INDEX IF NOT EXISTS idx_usage_records_office
  ON usage_records (office_id)
  WHERE office_id IS NOT NULL;

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Company members can view usage (owners see all, scoping in Phase 2)
CREATE POLICY "Users can view company usage"
  ON usage_records FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Server-side only for inserts (via admin client)
-- No INSERT policy — usage is recorded server-side with admin client

COMMENT ON TABLE offices IS 'Enterprise company offices for multi-location role-based scoping';
COMMENT ON TABLE company_email_domains IS 'Allowed email domains for self-serve enterprise signup';
COMMENT ON TABLE usage_records IS 'Metered usage tracking for enterprise billing (decodes, supplements, policy checks)';
