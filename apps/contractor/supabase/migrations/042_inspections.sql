-- Inspections table for roof inspection workflow
CREATE TABLE inspections (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES users(id),
  status          TEXT        NOT NULL DEFAULT 'draft',
  assessment_data JSONB       NOT NULL DEFAULT '{}',
  report_pdf_url  TEXT,
  inspected_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inspections"
  ON inspections FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company inspections"
  ON inspections FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company inspections"
  ON inspections FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can delete company inspections"
  ON inspections FOR DELETE USING (company_id = get_user_company_id());

CREATE TRIGGER trg_inspections_updated
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_inspections_company ON inspections (company_id);
CREATE INDEX idx_inspections_job ON inspections (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_inspections_status ON inspections (company_id, status);
