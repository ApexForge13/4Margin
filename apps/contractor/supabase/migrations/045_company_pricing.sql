-- Company pricing configuration for quote tiers
CREATE TABLE company_pricing (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  good_tier         JSONB       NOT NULL DEFAULT '{}',
  better_tier       JSONB       NOT NULL DEFAULT '{}',
  best_tier         JSONB       NOT NULL DEFAULT '{}',
  default_line_items JSONB      NOT NULL DEFAULT '[]',
  addon_templates   JSONB       NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company pricing"
  ON company_pricing FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company pricing"
  ON company_pricing FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company pricing"
  ON company_pricing FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER trg_company_pricing_updated
  BEFORE UPDATE ON company_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
