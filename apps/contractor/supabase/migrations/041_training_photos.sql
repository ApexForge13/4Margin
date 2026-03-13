-- ============================================================
-- Migration 041: Training photos table for photo AI pipeline
-- Stores Haiku Vision classification results for bulk training
-- data. Platform-level (no company_id), no RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS training_photos (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path      TEXT        NOT NULL,
  original_filename TEXT        NOT NULL,
  file_size         INTEGER,
  mime_type         TEXT,
  category          TEXT        NOT NULL DEFAULT 'other',
  subcategory       TEXT,
  damage_severity   TEXT,
  components_visible JSONB      NOT NULL DEFAULT '[]',
  description       TEXT,
  confidence        REAL,
  reviewed          BOOLEAN     NOT NULL DEFAULT false,
  reviewed_by       UUID        REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  source            TEXT        NOT NULL DEFAULT 'highmark_historical',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — platform-level training data, accessed via service role key only
-- (same pattern as consumer_leads in decodecoverage)

CREATE INDEX IF NOT EXISTS idx_training_photos_category
  ON training_photos (category);

CREATE INDEX IF NOT EXISTS idx_training_photos_confidence
  ON training_photos (confidence)
  WHERE category != 'non_roofing';

CREATE INDEX IF NOT EXISTS idx_training_photos_review
  ON training_photos (reviewed)
  WHERE category != 'non_roofing';

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_photos_filename
  ON training_photos (original_filename);
