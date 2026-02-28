-- Add switching_interest column for DecodeCoverage lead conversion
-- Tracks homeowners who opted in for a professional policy review
-- after seeing their Policy Health Score on the results page.
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS switching_interest BOOLEAN DEFAULT FALSE;
