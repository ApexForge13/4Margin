-- Job activity log for CRM timeline
CREATE TABLE job_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id),
  action      TEXT        NOT NULL,
  description TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company activity"
  ON job_activity_log FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company activity"
  ON job_activity_log FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE INDEX idx_activity_log_job ON job_activity_log (job_id);
CREATE INDEX idx_activity_log_company ON job_activity_log (company_id, created_at DESC);
