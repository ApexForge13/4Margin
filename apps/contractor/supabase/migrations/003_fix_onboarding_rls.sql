-- ============================================================
-- FIX: Allow new users to create company + profile during onboarding
-- The original RLS policies blocked INSERT because get_user_company_id()
-- returns null for users who haven't completed onboarding yet.
-- ============================================================

-- Allow authenticated users to create a company (onboarding)
create policy "Authenticated users can create a company"
  on companies for insert
  with check (auth.uid() is not null);

-- Allow authenticated users to create their own profile (onboarding)
create policy "Users can create own profile"
  on users for insert
  with check (
    auth.uid() is not null
    and id = auth.uid()
  );
