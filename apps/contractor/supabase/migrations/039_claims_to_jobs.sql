-- ============================================================
-- Migration 039: claims → jobs (passive CRM foundation)
-- Renames the claims table to jobs and expands it into a full
-- passive CRM: multiple job types, pipeline status tracking,
-- homeowner contact storage, lead source, team assignment,
-- and JSONB buckets for insurance and financial data.
-- Also links policy_decodings to jobs, creates a global
-- company_documents table, and adds brand_colors to companies.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SECTION 1: New enum types
-- ─────────────────────────────────────────────────────────────

CREATE TYPE job_type AS ENUM (
  'insurance',
  'retail',
  'hybrid',
  'repair'
);

CREATE TYPE job_status AS ENUM (
  'lead',
  'qualified',
  'inspected',
  'claim_filed',
  'adjuster_scheduled',
  'estimate_received',
  'supplement_sent',
  'revised_estimate',
  'approved',
  'sold',
  'materials_ordered',
  'work_scheduled',
  'in_progress',
  'install_complete',
  'depreciation_collected',
  'closed_won',
  'closed_lost'
);

CREATE TYPE lead_source AS ENUM (
  'door_knock',
  'referral',
  'inbound_call',
  'website',
  'dc_lead',
  'other'
);

-- ─────────────────────────────────────────────────────────────
-- SECTION 2: Rename table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE claims RENAME TO jobs;

-- Rename the updated_at trigger to match new table name
ALTER TRIGGER trg_claims_updated ON jobs RENAME TO trg_jobs_updated;

-- ─────────────────────────────────────────────────────────────
-- SECTION 3: Add new core columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_type    job_type   NOT NULL DEFAULT 'insurance',
  ADD COLUMN IF NOT EXISTS job_status  job_status NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS homeowner_name  TEXT,
  ADD COLUMN IF NOT EXISTS homeowner_phone TEXT,
  ADD COLUMN IF NOT EXISTS homeowner_email TEXT,
  ADD COLUMN IF NOT EXISTS source      lead_source,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

-- ─────────────────────────────────────────────────────────────
-- SECTION 4: Add JSONB buckets
-- ─────────────────────────────────────────────────────────────

-- insurance_data: carrier, claim/policy numbers, adjuster, damage context
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS insurance_data JSONB NOT NULL DEFAULT '{}';

-- financials: adjuster total, supplement total, approved amount, depreciation
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS financials JSONB NOT NULL DEFAULT '{}';

-- job_metadata: contractor notes, scope notes, intake answers, prior history
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_metadata JSONB NOT NULL DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────
-- SECTION 5: Migrate existing data into new columns / buckets
-- ─────────────────────────────────────────────────────────────

-- All existing records were insurance jobs
UPDATE jobs
  SET job_type = 'insurance'
  WHERE job_type IS DISTINCT FROM 'insurance';

-- Populate insurance_data from typed columns
UPDATE jobs
  SET insurance_data = jsonb_strip_nulls(jsonb_build_object(
    'carrier_id',          carrier_id,
    'claim_number',        claim_number,
    'policy_number',       policy_number,
    'date_of_loss',        date_of_loss,
    'adjuster_name',       adjuster_name,
    'adjuster_email',      adjuster_email,
    'adjuster_phone',      adjuster_phone,
    'damage_type',         damage_type,
    'roof_type',           roof_type
  ))
  WHERE insurance_data = '{}';

-- Populate job_metadata from typed columns
UPDATE jobs
  SET job_metadata = jsonb_strip_nulls(jsonb_build_object(
    'description',                     description,
    'adjuster_scope_notes',            adjuster_scope_notes,
    'items_believed_missing',          items_believed_missing,
    'prior_supplement_history',        prior_supplement_history,
    'gutters_nailed_through_drip_edge', gutters_nailed_through_drip_edge,
    'roof_under_warranty',             roof_under_warranty,
    'pre_existing_conditions',         pre_existing_conditions
  ))
  WHERE job_metadata = '{}';

-- Derive job_status from the most recent supplement for each job.
-- Precedence: approved/partially_approved → 'approved'
--             denied                      → 'closed_lost'
--             submitted                   → 'supplement_sent'
--             complete / generating       → 'estimate_received'
--             anything else               → 'lead'
UPDATE jobs j
  SET job_status = (
    SELECT
      CASE s.status
        WHEN 'approved'           THEN 'approved'::job_status
        WHEN 'partially_approved' THEN 'approved'::job_status
        WHEN 'denied'             THEN 'closed_lost'::job_status
        WHEN 'submitted'          THEN 'supplement_sent'::job_status
        WHEN 'complete'           THEN 'estimate_received'::job_status
        WHEN 'generating'         THEN 'estimate_received'::job_status
        ELSE                           'lead'::job_status
      END
    FROM supplements s
    WHERE s.claim_id = j.id
    ORDER BY s.created_at DESC
    LIMIT 1
  )
  WHERE EXISTS (
    SELECT 1 FROM supplements s WHERE s.claim_id = j.id
  );

-- ─────────────────────────────────────────────────────────────
-- SECTION 6: Rename FK columns on referencing tables
-- ─────────────────────────────────────────────────────────────

-- supplements.claim_id → supplements.job_id
ALTER TABLE supplements RENAME COLUMN claim_id TO job_id;

-- photos.claim_id → photos.job_id
ALTER TABLE photos RENAME COLUMN claim_id TO job_id;

-- supplement_outcomes.claim_id → supplement_outcomes.job_id
ALTER TABLE supplement_outcomes RENAME COLUMN claim_id TO job_id;

-- ─────────────────────────────────────────────────────────────
-- SECTION 7: Rename existing indexes, create new indexes
-- ─────────────────────────────────────────────────────────────

-- Rename table-level indexes
ALTER INDEX IF EXISTS idx_claims_company  RENAME TO idx_jobs_company;
ALTER INDEX IF EXISTS idx_claims_carrier  RENAME TO idx_jobs_carrier;
ALTER INDEX IF EXISTS idx_claims_archived RENAME TO idx_jobs_archived;

-- Rename FK indexes on referencing tables
ALTER INDEX IF EXISTS idx_photos_claim      RENAME TO idx_photos_job;
ALTER INDEX IF EXISTS idx_supplements_claim RENAME TO idx_supplements_job;

-- New pipeline/CRM indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON jobs (company_id, job_status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_type
  ON jobs (company_id, job_type)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_assigned
  ON jobs (assigned_to)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_address
  ON jobs (property_address, property_city, property_state);

-- ─────────────────────────────────────────────────────────────
-- SECTION 8: Update RLS policies on jobs table
-- ─────────────────────────────────────────────────────────────

-- Drop old claim-named policies (they still exist under the renamed table)
DROP POLICY IF EXISTS "Users can view company claims"  ON jobs;
DROP POLICY IF EXISTS "Users can create company claims" ON jobs;
DROP POLICY IF EXISTS "Users can update company claims" ON jobs;
DROP POLICY IF EXISTS "Users can delete company claims" ON jobs;

-- Recreate with jobs naming, same logic
CREATE POLICY "Users can view company jobs"
  ON jobs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can create company jobs"
  ON jobs FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update company jobs"
  ON jobs FOR UPDATE
  USING  (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete company jobs"
  ON jobs FOR DELETE
  USING (company_id = get_user_company_id());

-- ─────────────────────────────────────────────────────────────
-- SECTION 9: Link policy_decodings to jobs
-- ─────────────────────────────────────────────────────────────

ALTER TABLE policy_decodings
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_policy_decodings_job
  ON policy_decodings (job_id)
  WHERE job_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- SECTION 10: Global company document library
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_documents (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  category     TEXT        NOT NULL DEFAULT 'other',
  storage_path TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  file_size    INTEGER,
  mime_type    TEXT,
  uploaded_by  UUID        REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company documents"
  ON company_documents FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert own company documents"
  ON company_documents FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update own company documents"
  ON company_documents FOR UPDATE
  USING  (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can delete own company documents"
  ON company_documents FOR DELETE
  USING (company_id = get_user_company_id());

CREATE TRIGGER trg_company_documents_updated
  BEFORE UPDATE ON company_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_company_documents_company
  ON company_documents (company_id);

-- ─────────────────────────────────────────────────────────────
-- SECTION 11: Brand settings on companies
-- ─────────────────────────────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS brand_colors JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN companies.brand_colors IS 'Brand color palette — e.g. {"primary":"#0f172a","accent":"#2563eb"}';
