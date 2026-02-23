-- ============================================================
-- Migration 007: Supplement status overhaul
-- Replaces 9-status enum with streamlined 6-status pipeline,
-- adds carrier response columns, creates storage bucket
-- ============================================================

-- ─── STEP 1: Create new enum ───────────────────────────────

CREATE TYPE supplement_status_new AS ENUM (
  'generating',
  'complete',
  'submitted',
  'approved',
  'partially_approved',
  'denied'
);

-- ─── STEP 2: Migrate column to new enum ────────────────────

ALTER TABLE supplements
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE supplements
  ALTER COLUMN status TYPE supplement_status_new
  USING (
    CASE status::text
      WHEN 'draft'              THEN 'generating'::supplement_status_new
      WHEN 'analyzing'          THEN 'generating'::supplement_status_new
      WHEN 'review'             THEN 'generating'::supplement_status_new
      WHEN 'generated'          THEN 'complete'::supplement_status_new
      WHEN 'submitted'          THEN 'submitted'::supplement_status_new
      WHEN 'under_review'       THEN 'submitted'::supplement_status_new
      WHEN 'approved'           THEN 'approved'::supplement_status_new
      WHEN 'partially_approved' THEN 'partially_approved'::supplement_status_new
      WHEN 'denied'             THEN 'denied'::supplement_status_new
    END
  );

ALTER TABLE supplements
  ALTER COLUMN status SET DEFAULT 'generating'::supplement_status_new;

-- ─── STEP 3: Swap enum types ───────────────────────────────

DROP TYPE supplement_status;
ALTER TYPE supplement_status_new RENAME TO supplement_status;

-- ─── STEP 4: Add new columns ───────────────────────────────

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS carrier_response_url TEXT;
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(10,2);
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- ─── STEP 5: Create carrier-responses storage bucket ───────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carrier-responses',
  'carrier-responses',
  false,
  26214400,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- ─── STEP 6: Storage policies for carrier-responses ────────

CREATE POLICY "Users can upload carrier responses"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'carrier-responses'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view own carrier responses"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'carrier-responses'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own carrier responses"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'carrier-responses'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );
