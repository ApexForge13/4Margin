-- 037_rebuttal_support.sql
-- Adds rebuttal PDF URL column for supplement denial responses

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS rebuttal_pdf_url TEXT;

COMMENT ON COLUMN supplements.rebuttal_pdf_url IS 'Storage path for generated rebuttal letter PDF';
