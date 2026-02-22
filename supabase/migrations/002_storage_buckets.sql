-- ============================================================
-- STORAGE BUCKETS + POLICIES
-- Buckets for adjuster estimates (PDFs) and inspection photos
-- ============================================================

-- Create storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('estimates', 'estimates', false, 26214400, array['application/pdf']),
  ('photos', 'photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

-- ESTIMATES BUCKET POLICIES
-- Users can upload to their company's folder
create policy "Users can upload estimates"
  on storage.objects for insert
  with check (
    bucket_id = 'estimates'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can view their company's estimates
create policy "Users can view own estimates"
  on storage.objects for select
  using (
    bucket_id = 'estimates'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can delete their company's estimates
create policy "Users can delete own estimates"
  on storage.objects for delete
  using (
    bucket_id = 'estimates'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- PHOTOS BUCKET POLICIES
-- Users can upload to their company's folder
create policy "Users can upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can view their company's photos
create policy "Users can view own photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can delete their company's photos
create policy "Users can delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );
