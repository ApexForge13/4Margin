-- Add policy_pdf_url to supplements table
-- Stores the Supabase Storage path to the uploaded policy PDF.
-- Policy analysis is now deferred to the pipeline phase so the AI
-- has full claim context (description, damage types, etc.) when parsing.

ALTER TABLE supplements
  ADD COLUMN IF NOT EXISTS policy_pdf_url TEXT DEFAULT NULL;
