-- ============================================================
-- POLICIES + MEASUREMENTS STORAGE BUCKETS
-- Buckets for insurance policy docs and roof measurement reports
-- ============================================================

-- Create both storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('policies', 'policies', false, 26214400, array['application/pdf']),
  ('measurements', 'measurements', false, 26214400, array['application/pdf']);

-- ========== POLICIES BUCKET POLICIES ==========

-- Users can upload to their company's folder
create policy "Users can upload policies"
  on storage.objects for insert
  with check (
    bucket_id = 'policies'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can view their company's policies
create policy "Users can view own policies"
  on storage.objects for select
  using (
    bucket_id = 'policies'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can delete their company's policies
create policy "Users can delete own policies"
  on storage.objects for delete
  using (
    bucket_id = 'policies'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- ========== MEASUREMENTS BUCKET POLICIES ==========

-- Users can upload to their company's folder
create policy "Users can upload measurements"
  on storage.objects for insert
  with check (
    bucket_id = 'measurements'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can view their company's measurements
create policy "Users can view own measurements"
  on storage.objects for select
  using (
    bucket_id = 'measurements'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );

-- Users can delete their company's measurements
create policy "Users can delete own measurements"
  on storage.objects for delete
  using (
    bucket_id = 'measurements'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = (select company_id::text from public.users where id = auth.uid())
  );
