-- Inspection photos with AI classification
CREATE TABLE inspection_photos (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id         UUID        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  company_id            UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  storage_path          TEXT        NOT NULL,
  original_filename     TEXT        NOT NULL,
  file_size             INTEGER,
  mime_type             TEXT,
  ai_category           TEXT        NOT NULL DEFAULT 'other',
  ai_subcategory        TEXT,
  ai_confidence         REAL,
  contractor_category   TEXT,
  contractor_subcategory TEXT,
  caption               TEXT,
  sort_order            INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inspection photos"
  ON inspection_photos FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company inspection photos"
  ON inspection_photos FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company inspection photos"
  ON inspection_photos FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can delete company inspection photos"
  ON inspection_photos FOR DELETE USING (company_id = get_user_company_id());

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos (inspection_id);
CREATE INDEX idx_inspection_photos_category ON inspection_photos (ai_category);
CREATE INDEX idx_inspection_photos_company ON inspection_photos (company_id);
