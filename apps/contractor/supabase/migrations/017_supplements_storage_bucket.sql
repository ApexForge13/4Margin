-- ============================================================
-- SUPPLEMENTS STORAGE BUCKET
-- Stores generated supplement PDFs and weather report PDFs.
-- Pipeline uploads via service_role (admin client) so no
-- INSERT/UPDATE policies needed for regular users — only SELECT.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('supplements', 'supplements', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Users can view/download their company's supplement files
CREATE POLICY "Users can view own supplement files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'supplements'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Service role handles all uploads (pipeline + finalize),
-- but add a user delete policy for cleanup
CREATE POLICY "Users can delete own supplement files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'supplements'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );
