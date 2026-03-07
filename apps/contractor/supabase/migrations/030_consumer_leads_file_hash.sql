-- Add file_hash column for duplicate PDF detection
ALTER TABLE consumer_leads ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Partial index: only index completed rows (the only ones we deduplicate against)
CREATE INDEX IF NOT EXISTS idx_consumer_leads_file_hash
  ON consumer_leads(file_hash)
  WHERE status = 'complete';
