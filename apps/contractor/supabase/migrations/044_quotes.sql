-- Quotes table for retail quote workflow
CREATE TABLE quotes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES users(id),
  status          TEXT        NOT NULL DEFAULT 'draft',
  total_squares   NUMERIC,
  good_tier       JSONB       NOT NULL DEFAULT '{}',
  better_tier     JSONB       NOT NULL DEFAULT '{}',
  best_tier       JSONB       NOT NULL DEFAULT '{}',
  add_ons         JSONB       NOT NULL DEFAULT '[]',
  discounts       JSONB       NOT NULL DEFAULT '[]',
  line_items      JSONB       NOT NULL DEFAULT '[]',
  selected_tier   TEXT,
  quote_pdf_url   TEXT,
  homeowner_name  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company quotes"
  ON quotes FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company quotes"
  ON quotes FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company quotes"
  ON quotes FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can delete company quotes"
  ON quotes FOR DELETE USING (company_id = get_user_company_id());

CREATE TRIGGER trg_quotes_updated
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_quotes_company ON quotes (company_id);
CREATE INDEX idx_quotes_job ON quotes (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_quotes_status ON quotes (company_id, status);
