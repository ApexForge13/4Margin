-- ============================================================
-- TEMP PARSING BUCKET
-- Temporary storage for PDFs during Claude AI parsing.
-- Files are uploaded by the client, processed server-side,
-- then deleted after parsing completes.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('temp-parsing', 'temp-parsing', false, 26214400, array['application/pdf']);

-- Any authenticated user can upload temp files
create policy "Authenticated users can upload temp files"
  on storage.objects for insert
  with check (
    bucket_id = 'temp-parsing'
    and auth.uid() is not null
  );

-- Any authenticated user can read temp files (needed for signed URLs)
create policy "Authenticated users can read temp files"
  on storage.objects for select
  using (
    bucket_id = 'temp-parsing'
    and auth.uid() is not null
  );

-- Any authenticated user can delete their temp files
create policy "Authenticated users can delete temp files"
  on storage.objects for delete
  using (
    bucket_id = 'temp-parsing'
    and auth.uid() is not null
  );
