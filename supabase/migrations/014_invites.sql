-- ── Team Invites ──────────────────────────────────────────────
-- Allows admins/owners to invite new users to their company.

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  email       text not null,
  role        text not null default 'user' check (role in ('user', 'admin')),
  invited_by  uuid not null references public.users(id) on delete cascade,
  token       uuid not null unique default gen_random_uuid(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_invites_company on public.invites(company_id);
create index if not exists idx_invites_token   on public.invites(token);
create index if not exists idx_invites_email   on public.invites(email);

-- RLS
alter table public.invites enable row level security;

-- Company members can view their company's invites
create policy "Company members can view invites"
  on public.invites for select
  using (
    company_id in (
      select company_id from public.users where id = auth.uid()
    )
  );

-- Admins/owners can insert invites for their company
create policy "Admins can create invites"
  on public.invites for insert
  with check (
    company_id in (
      select company_id from public.users
      where id = auth.uid() and role in ('admin', 'owner')
    )
  );

-- Allow anyone to read an invite by token (for acceptance flow)
-- This is done via service role (admin client) in the application
