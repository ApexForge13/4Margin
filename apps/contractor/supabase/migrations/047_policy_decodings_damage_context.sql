-- Add damage context to policy decodings
ALTER TABLE policy_decodings
  ADD COLUMN IF NOT EXISTS damage_context TEXT;

-- Create new storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('inspection-reports', 'inspection-reports', false),
  ('inspection-photos', 'inspection-photos', false),
  ('quotes', 'quotes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inspection-reports
CREATE POLICY "Company users can upload inspection reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspection-reports' AND auth.role() = 'authenticated');

CREATE POLICY "Company users can view inspection reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-reports' AND auth.role() = 'authenticated');

-- Storage policies for inspection-photos
CREATE POLICY "Company users can upload inspection photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspection-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Company users can view inspection photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Company users can delete inspection photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'inspection-photos' AND auth.role() = 'authenticated');

-- Storage policies for quotes
CREATE POLICY "Company users can upload quotes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quotes' AND auth.role() = 'authenticated');

CREATE POLICY "Company users can view quotes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quotes' AND auth.role() = 'authenticated');
