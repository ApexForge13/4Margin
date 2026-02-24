-- Migration 011: Add weather verification columns to supplements
--
-- weather_data: JSONB storing the full Visual Crossing API response
--               (conditions, wind, hail, hourly breakdown, verdict)
-- weather_pdf_url: Storage path for the generated Weather Verification Report PDF

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS weather_data jsonb;
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS weather_pdf_url text;
