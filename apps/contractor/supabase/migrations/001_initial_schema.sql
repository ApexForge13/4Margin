-- ============================================================
-- 4MARGIN SUPPLEMENT ENGINE — INITIAL SCHEMA
-- Multi-tenant SaaS for insurance claim supplement generation
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────

create type user_role as enum ('owner', 'admin', 'member');
create type supplement_status as enum (
  'draft',
  'analyzing',
  'review',
  'generated',
  'submitted',
  'under_review',
  'approved',
  'partially_approved',
  'denied'
);
create type line_item_status as enum ('detected', 'accepted', 'rejected', 'modified');
create type roof_type as enum ('gable', 'hip', 'hip_and_valley', 'flat', 'mansard', 'gambrel', 'shed', 'other');
create type damage_type as enum ('hail', 'wind', 'fire', 'water', 'impact', 'age', 'other');

-- ─── COMPANIES ───────────────────────────────────────────────
-- Multi-tenant root. Every record in the system belongs to a company.

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  logo_url text,
  license_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── USERS ───────────────────────────────────────────────────
-- Linked to Supabase Auth (auth.users). Each user belongs to one company.

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_company on users(company_id);

-- ─── CARRIERS ────────────────────────────────────────────────
-- Insurance carrier directory with claims department contacts.

create table carriers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  claims_email text,
  claims_phone text,
  claims_fax text,
  claims_portal_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ─── XACTIMATE CODES ─────────────────────────────────────────
-- Curated database of Xactimate line item codes.
-- This is the rules engine — NOT AI generated, human-verified.

create table xactimate_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  category text not null,
  description text not null,
  unit text not null,
  default_justification text,
  irc_reference text,
  commonly_missed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_xactimate_codes_category on xactimate_codes(category);
create index idx_xactimate_codes_commonly_missed on xactimate_codes(commonly_missed) where commonly_missed = true;

-- ─── CLAIMS ──────────────────────────────────────────────────
-- An insurance claim tied to a property. One claim can have multiple supplements.

create table claims (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  carrier_id uuid references carriers(id),
  claim_number text,
  policy_number text,
  property_address text not null,
  property_city text,
  property_state text,
  property_zip text,
  date_of_loss date,
  roof_type roof_type,
  damage_type damage_type,
  roof_squares numeric(6,2),
  roof_pitch text,
  num_stories integer,
  num_valleys integer,
  num_hips integer,
  num_ridges integer,
  num_dormers integer,
  adjuster_name text,
  adjuster_email text,
  adjuster_phone text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_claims_company on claims(company_id);
create index idx_claims_carrier on claims(carrier_id);

-- ─── SUPPLEMENTS ─────────────────────────────────────────────
-- A supplement document generated for a claim.

create table supplements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  claim_id uuid not null references claims(id) on delete cascade,
  status supplement_status not null default 'draft',
  adjuster_estimate_url text,
  adjuster_estimate_parsed jsonb,
  adjuster_total numeric(10,2),
  supplement_total numeric(10,2),
  recovery_estimate numeric(10,2),
  waste_calculated numeric(5,2),
  waste_adjuster numeric(5,2),
  generated_pdf_url text,
  submitted_at timestamptz,
  submitted_to text,
  carrier_response text,
  carrier_responded_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_supplements_company on supplements(company_id);
create index idx_supplements_claim on supplements(claim_id);
create index idx_supplements_status on supplements(status);

-- ─── SUPPLEMENT ITEMS ────────────────────────────────────────
-- Individual line items detected or added to a supplement.

create table supplement_items (
  id uuid primary key default uuid_generate_v4(),
  supplement_id uuid not null references supplements(id) on delete cascade,
  xactimate_code_id uuid references xactimate_codes(id),
  xactimate_code text not null,
  description text not null,
  category text,
  quantity numeric(10,2),
  unit text,
  unit_price numeric(10,2),
  total_price numeric(10,2),
  justification text,
  irc_reference text,
  photo_references text[],
  status line_item_status not null default 'detected',
  confidence numeric(3,2),
  detection_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_supplement_items_supplement on supplement_items(supplement_id);
create index idx_supplement_items_status on supplement_items(status);

-- ─── PHOTOS ──────────────────────────────────────────────────
-- Inspection photos uploaded by contractor, analyzed by Vision AI.

create table photos (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null references claims(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  storage_path text not null,
  file_name text,
  file_size integer,
  mime_type text,
  vision_analysis jsonb,
  tags text[],
  notes text,
  created_at timestamptz not null default now()
);

create index idx_photos_claim on photos(claim_id);
create index idx_photos_company on photos(company_id);

-- ─── CARRIER PATTERNS ────────────────────────────────────────
-- Tracks approval/rejection data per carrier per item type.
-- THIS IS THE DATA MOAT — grows more valuable with every supplement.

create table carrier_patterns (
  id uuid primary key default uuid_generate_v4(),
  carrier_id uuid not null references carriers(id),
  xactimate_code text not null,
  region text,
  times_submitted integer not null default 0,
  times_approved integer not null default 0,
  times_denied integer not null default 0,
  avg_approved_amount numeric(10,2),
  best_justification text,
  notes text,
  updated_at timestamptz not null default now()
);

create unique index idx_carrier_patterns_unique on carrier_patterns(carrier_id, xactimate_code, coalesce(region, ''));
create index idx_carrier_patterns_carrier on carrier_patterns(carrier_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_companies_updated before update on companies
  for each row execute function update_updated_at();
create trigger trg_users_updated before update on users
  for each row execute function update_updated_at();
create trigger trg_claims_updated before update on claims
  for each row execute function update_updated_at();
create trigger trg_supplements_updated before update on supplements
  for each row execute function update_updated_at();
create trigger trg_supplement_items_updated before update on supplement_items
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Multi-tenant isolation: users can only access their company's data
-- ============================================================

alter table companies enable row level security;
alter table users enable row level security;
alter table claims enable row level security;
alter table supplements enable row level security;
alter table supplement_items enable row level security;
alter table photos enable row level security;

-- Helper: get current user's company_id
create or replace function get_user_company_id()
returns uuid as $$
  select company_id from users where id = auth.uid();
$$ language sql security definer stable;

-- COMPANIES: users can only see/edit their own company
create policy "Users can view own company"
  on companies for select
  using (id = get_user_company_id());

create policy "Owners can update own company"
  on companies for update
  using (id = get_user_company_id())
  with check (id = get_user_company_id());

-- USERS: users can see teammates, only owners can manage
create policy "Users can view company members"
  on users for select
  using (company_id = get_user_company_id());

create policy "Users can update own profile"
  on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- CLAIMS: company-scoped
create policy "Users can view company claims"
  on claims for select
  using (company_id = get_user_company_id());

create policy "Users can create company claims"
  on claims for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company claims"
  on claims for update
  using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

create policy "Users can delete company claims"
  on claims for delete
  using (company_id = get_user_company_id());

-- SUPPLEMENTS: company-scoped
create policy "Users can view company supplements"
  on supplements for select
  using (company_id = get_user_company_id());

create policy "Users can create company supplements"
  on supplements for insert
  with check (company_id = get_user_company_id());

create policy "Users can update company supplements"
  on supplements for update
  using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

create policy "Users can delete company supplements"
  on supplements for delete
  using (company_id = get_user_company_id());

-- SUPPLEMENT ITEMS: access via supplement's company
create policy "Users can view supplement items"
  on supplement_items for select
  using (
    exists (
      select 1 from supplements s
      where s.id = supplement_items.supplement_id
      and s.company_id = get_user_company_id()
    )
  );

create policy "Users can create supplement items"
  on supplement_items for insert
  with check (
    exists (
      select 1 from supplements s
      where s.id = supplement_items.supplement_id
      and s.company_id = get_user_company_id()
    )
  );

create policy "Users can update supplement items"
  on supplement_items for update
  using (
    exists (
      select 1 from supplements s
      where s.id = supplement_items.supplement_id
      and s.company_id = get_user_company_id()
    )
  );

create policy "Users can delete supplement items"
  on supplement_items for delete
  using (
    exists (
      select 1 from supplements s
      where s.id = supplement_items.supplement_id
      and s.company_id = get_user_company_id()
    )
  );

-- PHOTOS: company-scoped
create policy "Users can view company photos"
  on photos for select
  using (company_id = get_user_company_id());

create policy "Users can upload company photos"
  on photos for insert
  with check (company_id = get_user_company_id());

create policy "Users can delete company photos"
  on photos for delete
  using (company_id = get_user_company_id());

-- CARRIERS: public read (shared across all tenants)
-- No RLS needed — carriers are global reference data
-- xactimate_codes: same — global reference data

-- CARRIER PATTERNS: read-only for all authenticated users
-- (aggregated anonymized data benefits everyone)
alter table carrier_patterns enable row level security;

create policy "Authenticated users can view carrier patterns"
  on carrier_patterns for select
  using (auth.uid() is not null);
