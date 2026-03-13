# Phase 1A: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the claims-centric architecture with a Jobs-based passive CRM, enhance the decoder to produce two reports, add a document template system with brand color extraction, add a global document library, and wire EagleView measurements into the Job model.

**Architecture:** The `claims` table is renamed to `jobs` with a lean core + JSONB bucket schema. All existing FK references (supplements, photos, outcomes) are updated. The supplement wizard and dashboard are refactored to use Jobs. The decoder produces two simultaneous reports (contractor + homeowner). A brand color extraction utility powers all PDF generation. A global document library provides sidebar-level document storage.

**Tech Stack:** Next.js 15, TypeScript, Supabase PostgreSQL, Tailwind + shadcn/ui, jsPDF (@4margin/pdf), Claude API (Sonnet + Vision)

**Dependency Order:**
```
Task 1: DB Migration (jobs table) ─────────────────────────┐
Task 2: TypeScript types + Zod schemas ────────────────────┤
Task 3: Job matching service ──────────────────────────────┤
Task 4: Update supplement creation flow ───────────────────┤── Foundation
Task 5: Update supplement list/detail queries ─────────────┤
Task 6: Update dashboard to Jobs pipeline ─────────────────┘
Task 7: Brand color extraction utility ────────────────────┐
Task 8: Document template system (PDF) ────────────────────┤── Documents
Task 9: Global document library (DB + UI) ─────────────────┘
Task 10: Contractor decode report (new PDF) ───────────────┐
Task 11: Homeowner decode report (new PDF) ────────────────┤── Decode
Task 12: Decode UI (two-report display + battle card) ─────┤
Task 13: Wire decode to Jobs ──────────────────────────────┘
Task 14: Wire EagleView parser into Jobs ──────────────────── EV
Task 15: Skill updater ───────────────────────────────────── Meta
```

---

### Task 1: Database Migration — Claims to Jobs

**Files:**
- Create: `apps/contractor/supabase/migrations/039_claims_to_jobs.sql`

**Step 1: Write the migration**

```sql
-- 039_claims_to_jobs.sql
-- Renames claims -> jobs, adds JSONB buckets, adds new columns for Job architecture

-- ══════════════════════════════════════════════════════════
-- 1. Rename table
-- ══════════════════════════════════════════════════════════
ALTER TABLE claims RENAME TO jobs;

-- ══════════════════════════════════════════════════════════
-- 2. Add new core columns
-- ══════════════════════════════════════════════════════════

-- Job type enum
CREATE TYPE job_type AS ENUM ('insurance', 'retail', 'hybrid', 'repair');
ALTER TABLE jobs ADD COLUMN job_type job_type NOT NULL DEFAULT 'insurance';

-- Job status enum (replaces implicit status from supplement)
CREATE TYPE job_status AS ENUM (
  'lead',
  'qualified',
  'inspected',
  'claim_filed',
  'adjuster_scheduled',
  'estimate_received',
  'supplement_sent',
  'revised_estimate',
  'approved',
  'sold',
  'materials_ordered',
  'work_scheduled',
  'in_progress',
  'install_complete',
  'depreciation_collected',
  'closed_won',
  'closed_lost'
);
ALTER TABLE jobs ADD COLUMN job_status job_status NOT NULL DEFAULT 'lead';

-- Homeowner contact (may differ from property info already on table)
ALTER TABLE jobs ADD COLUMN homeowner_name TEXT;
ALTER TABLE jobs ADD COLUMN homeowner_phone TEXT;
ALTER TABLE jobs ADD COLUMN homeowner_email TEXT;

-- Lead source
CREATE TYPE lead_source AS ENUM (
  'door_knock', 'referral', 'inbound_call', 'website', 'dc_lead', 'other'
);
ALTER TABLE jobs ADD COLUMN source lead_source;

-- Assignment
ALTER TABLE jobs ADD COLUMN assigned_to UUID REFERENCES users(id);

-- ══════════════════════════════════════════════════════════
-- 3. Add JSONB buckets
-- ══════════════════════════════════════════════════════════
ALTER TABLE jobs ADD COLUMN insurance_data JSONB DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN financials JSONB DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN job_metadata JSONB DEFAULT '{}';
-- NOTE: measurements already exist as typed columns from EagleView migrations.
-- We keep those columns as-is (already promoted). No JSONB bucket for measurements.

-- ══════════════════════════════════════════════════════════
-- 4. Migrate existing data into new columns
-- ══════════════════════════════════════════════════════════

-- All existing records are insurance jobs
UPDATE jobs SET job_type = 'insurance';

-- Populate insurance_data from existing columns
UPDATE jobs SET insurance_data = jsonb_build_object(
  'carrier_id', carrier_id::text,
  'claim_number', claim_number,
  'policy_number', policy_number,
  'date_of_loss', date_of_loss::text,
  'adjuster_name', adjuster_name,
  'adjuster_email', adjuster_email,
  'adjuster_phone', adjuster_phone,
  'damage_type', damage_type::text,
  'roof_type', roof_type::text
)
WHERE carrier_id IS NOT NULL OR claim_number IS NOT NULL;

-- Populate job_metadata from intake questions
UPDATE jobs SET job_metadata = jsonb_build_object(
  'gutters_nailed_through_drip_edge', gutters_nailed_through_drip_edge,
  'roof_under_warranty', roof_under_warranty,
  'pre_existing_conditions', pre_existing_conditions,
  'description', description,
  'adjuster_scope_notes', adjuster_scope_notes,
  'items_believed_missing', items_believed_missing,
  'prior_supplement_history', prior_supplement_history
)
WHERE description IS NOT NULL
   OR gutters_nailed_through_drip_edge IS NOT NULL
   OR roof_under_warranty IS NOT NULL;

-- Set job_status based on supplement status for existing records
-- We'll infer from the most recent supplement's status
UPDATE jobs j SET job_status =
  CASE
    WHEN EXISTS (
      SELECT 1 FROM supplements s
      WHERE s.claim_id = j.id AND s.status IN ('approved', 'partially_approved')
    ) THEN 'approved'::job_status
    WHEN EXISTS (
      SELECT 1 FROM supplements s
      WHERE s.claim_id = j.id AND s.status = 'denied'
    ) THEN 'closed_lost'::job_status
    WHEN EXISTS (
      SELECT 1 FROM supplements s
      WHERE s.claim_id = j.id AND s.status = 'submitted'
    ) THEN 'supplement_sent'::job_status
    WHEN EXISTS (
      SELECT 1 FROM supplements s
      WHERE s.claim_id = j.id AND s.status IN ('complete', 'generating')
    ) THEN 'estimate_received'::job_status
    ELSE 'lead'::job_status
  END;

-- ══════════════════════════════════════════════════════════
-- 5. Rename FK columns on referencing tables
-- ══════════════════════════════════════════════════════════
ALTER TABLE supplements RENAME COLUMN claim_id TO job_id;
ALTER TABLE photos RENAME COLUMN claim_id TO job_id;
ALTER TABLE supplement_outcomes RENAME COLUMN claim_id TO job_id;

-- ══════════════════════════════════════════════════════════
-- 6. Rename indexes
-- ══════════════════════════════════════════════════════════
ALTER INDEX IF EXISTS idx_claims_company RENAME TO idx_jobs_company;
ALTER INDEX IF EXISTS idx_claims_carrier RENAME TO idx_jobs_carrier;
ALTER INDEX IF EXISTS idx_claims_archived RENAME TO idx_jobs_archived;
ALTER INDEX IF EXISTS idx_photos_claim RENAME TO idx_photos_job;
ALTER INDEX IF EXISTS idx_supplements_claim RENAME TO idx_supplements_job;

-- New indexes for Job queries
CREATE INDEX idx_jobs_status ON jobs(company_id, job_status) WHERE archived_at IS NULL;
CREATE INDEX idx_jobs_type ON jobs(company_id, job_type) WHERE archived_at IS NULL;
CREATE INDEX idx_jobs_assigned ON jobs(assigned_to) WHERE archived_at IS NULL;
CREATE INDEX idx_jobs_address ON jobs(property_address, property_city, property_state);

-- ══════════════════════════════════════════════════════════
-- 7. Update RLS policies (rename references)
-- ══════════════════════════════════════════════════════════
-- RLS policies on 'claims' auto-transfer when table is renamed.
-- We just need to ensure the policy names make sense.
-- Drop and recreate with updated names:
DROP POLICY IF EXISTS "Users can view own company claims" ON jobs;
DROP POLICY IF EXISTS "Users can insert own company claims" ON jobs;
DROP POLICY IF EXISTS "Users can update own company claims" ON jobs;

CREATE POLICY "Users can view own company jobs" ON jobs
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company jobs" ON jobs
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own company jobs" ON jobs
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- ══════════════════════════════════════════════════════════
-- 8. Add policy_decoding link to jobs
-- ══════════════════════════════════════════════════════════
ALTER TABLE policy_decodings ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX idx_policy_decodings_job ON policy_decodings(job_id) WHERE job_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════
-- 9. Global document library table
-- ══════════════════════════════════════════════════════════
CREATE TABLE company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_documents_company ON company_documents(company_id);

ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company documents" ON company_documents
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company documents" ON company_documents
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own company documents" ON company_documents
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own company documents" ON company_documents
  FOR DELETE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER trg_company_documents_updated
  BEFORE UPDATE ON company_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════
-- 10. Brand settings on companies table
-- ══════════════════════════════════════════════════════════
ALTER TABLE companies ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{}';
-- Expected shape: { primary: "#hex", secondary: "#hex", accent: "#hex" }
-- Auto-extracted from logo_url when logo is uploaded
```

**Step 2: Test migration locally**

Run: `cd apps/contractor && npx supabase db reset`
Expected: All tables created successfully, existing data migrated, no errors.

**Step 3: Commit**

```bash
git add apps/contractor/supabase/migrations/039_claims_to_jobs.sql
git commit -m "feat: migration 039 — rename claims to jobs, add JSONB buckets, global doc library, brand colors"
```

---

### Task 2: TypeScript Types + Zod Schemas

**Files:**
- Create: `apps/contractor/src/types/job.ts`
- Modify: `apps/contractor/src/types/wizard.ts`
- Modify: `apps/contractor/src/lib/validations/schemas.ts`

**Step 1: Create Job type definitions**

```typescript
// apps/contractor/src/types/job.ts

export type JobType = 'insurance' | 'retail' | 'hybrid' | 'repair';

export type JobStatus =
  | 'lead'
  | 'qualified'
  | 'inspected'
  | 'claim_filed'
  | 'adjuster_scheduled'
  | 'estimate_received'
  | 'supplement_sent'
  | 'revised_estimate'
  | 'approved'
  | 'sold'
  | 'materials_ordered'
  | 'work_scheduled'
  | 'in_progress'
  | 'install_complete'
  | 'depreciation_collected'
  | 'closed_won'
  | 'closed_lost';

export type LeadSource =
  | 'door_knock'
  | 'referral'
  | 'inbound_call'
  | 'website'
  | 'dc_lead'
  | 'other';

export interface InsuranceData {
  carrier_id?: string;
  claim_number?: string;
  policy_number?: string;
  date_of_loss?: string;
  adjuster_name?: string;
  adjuster_email?: string;
  adjuster_phone?: string;
  damage_type?: string;
  roof_type?: string;
}

export interface JobFinancials {
  estimate_amount?: number;
  supplement_requested?: number;
  supplement_approved?: number;
  approved_amount?: number;
  depreciation_total?: number;
  depreciation_recoverable?: number;
  depreciation_collected?: number;
  deductible_amount?: number;
  contract_price?: number;
  material_cost?: number;
  labor_cost?: number;
}

export interface JobMetadata {
  gutters_nailed_through_drip_edge?: string;
  roof_under_warranty?: string;
  pre_existing_conditions?: string;
  description?: string;
  adjuster_scope_notes?: string;
  items_believed_missing?: string;
  prior_supplement_history?: string;
  notes?: string;
}

export interface Job {
  id: string;
  company_id: string;
  created_by: string | null;
  assigned_to: string | null;

  // Core
  job_type: JobType;
  job_status: JobStatus;
  source: LeadSource | null;

  // Property
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;

  // Homeowner
  homeowner_name: string | null;
  homeowner_phone: string | null;
  homeowner_email: string | null;

  // JSONB buckets
  insurance_data: InsuranceData;
  financials: JobFinancials;
  job_metadata: JobMetadata;

  // Measurements (typed columns from EV migrations)
  waste_percent: number | null;
  suggested_squares: number | null;
  ft_ridges: number | null;
  ft_hips: number | null;
  ft_valleys: number | null;
  ft_rakes: number | null;
  ft_eaves: number | null;
  ft_drip_edge: number | null;
  ft_flashing: number | null;
  ft_step_flashing: number | null;
  steep_squares: number | null;
  high_story_squares: number | null;
  pitch_breakdown: unknown | null;
  structure_complexity: string | null;
  total_roof_area: number | null;
  accessories: string | null;

  // Timestamps
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// Status transitions — defines which statuses can move to which
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  lead: ['qualified', 'inspected', 'claim_filed', 'closed_lost'],
  qualified: ['inspected', 'claim_filed', 'closed_lost'],
  inspected: ['claim_filed', 'quoted', 'sold', 'closed_lost'] as JobStatus[],
  claim_filed: ['adjuster_scheduled', 'estimate_received', 'closed_lost'],
  adjuster_scheduled: ['estimate_received', 'closed_lost'],
  estimate_received: ['supplement_sent', 'approved', 'closed_lost'],
  supplement_sent: ['revised_estimate', 'approved', 'closed_lost'],
  revised_estimate: ['supplement_sent', 'approved', 'closed_lost'],
  approved: ['sold', 'closed_lost'],
  sold: ['materials_ordered', 'work_scheduled', 'closed_lost'],
  materials_ordered: ['work_scheduled', 'in_progress'],
  work_scheduled: ['in_progress'],
  in_progress: ['install_complete'],
  install_complete: ['depreciation_collected', 'closed_won'],
  depreciation_collected: ['closed_won'],
  closed_won: [],
  closed_lost: [],
};

// Pipeline stage labels for display
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  inspected: 'Inspected',
  claim_filed: 'Claim Filed',
  adjuster_scheduled: 'Adjuster Scheduled',
  estimate_received: 'Estimate Received',
  supplement_sent: 'Supplement Sent',
  revised_estimate: 'Revised Estimate',
  approved: 'Approved',
  sold: 'Sold',
  materials_ordered: 'Materials Ordered',
  work_scheduled: 'Work Scheduled',
  in_progress: 'In Progress',
  install_complete: 'Install Complete',
  depreciation_collected: 'Depreciation Collected',
  closed_won: 'Closed (Won)',
  closed_lost: 'Closed (Lost)',
};

// Insurance pipeline stages (in order)
export const INSURANCE_PIPELINE: JobStatus[] = [
  'lead', 'inspected', 'claim_filed', 'adjuster_scheduled',
  'estimate_received', 'supplement_sent', 'revised_estimate',
  'approved', 'sold', 'materials_ordered', 'work_scheduled',
  'in_progress', 'install_complete', 'depreciation_collected', 'closed_won',
];

// Retail pipeline stages (in order)
export const RETAIL_PIPELINE: JobStatus[] = [
  'lead', 'inspected', 'sold', 'materials_ordered',
  'work_scheduled', 'in_progress', 'install_complete', 'closed_won',
];
```

**Step 2: Update wizard types**

In `apps/contractor/src/types/wizard.ts`, rename `ClaimDetails` to `JobDetails` and update field names. The wizard still collects the same data, but the types reflect the new naming.

**Step 3: Update Zod schemas**

In `apps/contractor/src/lib/validations/schemas.ts`, rename `claimDetailsSchema` to `jobDetailsSchema`, `createClaimInputSchema` to `createJobInputSchema`, `updateClaimSchema` to `updateJobSchema`. Update field names to match new types.

**Step 4: Run type check**

Run: `cd apps/contractor && npx tsc --noEmit`
Expected: Type errors in files still referencing `claims` (expected — will fix in Tasks 4-5)

**Step 5: Commit**

```bash
git add apps/contractor/src/types/job.ts apps/contractor/src/types/wizard.ts apps/contractor/src/lib/validations/schemas.ts
git commit -m "feat: add Job types, status machine, pipeline definitions, rename ClaimDetails to JobDetails"
```

---

### Task 3: Job Matching Service

**Files:**
- Create: `apps/contractor/src/lib/jobs/matching.ts`
- Create: `apps/contractor/src/lib/jobs/auto-create.ts`

**Step 1: Write the matching service**

```typescript
// apps/contractor/src/lib/jobs/matching.ts

import { SupabaseClient } from '@supabase/supabase-js';

interface MatchCriteria {
  companyId: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  claimNumber?: string;
  homeownerName?: string;
}

interface MatchResult {
  matched: boolean;
  jobId: string | null;
  confidence: 'exact' | 'fuzzy' | null;
  matchType: 'address' | 'claim_number' | 'homeowner' | null;
}

/**
 * Attempts to match incoming data to an existing Job.
 * Priority: claim number > exact address > fuzzy homeowner + address
 */
export async function findMatchingJob(
  supabase: SupabaseClient,
  criteria: MatchCriteria
): Promise<MatchResult> {
  const noMatch: MatchResult = { matched: false, jobId: null, confidence: null, matchType: null };

  // 1. Claim number match (most specific)
  if (criteria.claimNumber?.trim()) {
    const { data } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', criteria.companyId)
      .contains('insurance_data', { claim_number: criteria.claimNumber.trim() })
      .is('archived_at', null)
      .limit(1)
      .single();

    if (data) {
      return { matched: true, jobId: data.id, confidence: 'exact', matchType: 'claim_number' };
    }
  }

  // 2. Exact address match
  if (criteria.propertyAddress?.trim()) {
    const normalized = normalizeAddress(criteria.propertyAddress);
    const { data } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', criteria.companyId)
      .eq('property_address', normalized)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return { matched: true, jobId: data.id, confidence: 'exact', matchType: 'address' };
    }
  }

  return noMatch;
}

/**
 * Normalize address for matching. Basic normalization:
 * trim, lowercase, collapse whitespace, standardize abbreviations.
 */
export function normalizeAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bapartment\b/g, 'apt')
    .replace(/\bsuite\b/g, 'ste')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\beast\b/g, 'e')
    .replace(/\bwest\b/g, 'w');
}
```

**Step 2: Write the auto-create service**

```typescript
// apps/contractor/src/lib/jobs/auto-create.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { findMatchingJob, normalizeAddress } from './matching';
import type { JobType, LeadSource, InsuranceData, JobMetadata } from '@/types/job';

interface AutoCreateInput {
  companyId: string;
  createdBy: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  homeownerName?: string;
  homeownerPhone?: string;
  homeownerEmail?: string;
  jobType?: JobType;
  source?: LeadSource;
  insuranceData?: InsuranceData;
  metadata?: JobMetadata;
}

interface AutoCreateResult {
  jobId: string;
  created: boolean; // true if new, false if matched existing
}

/**
 * Find-or-create a Job. Used by all tool entry points
 * (supplement wizard, decoder, photo upload, email parsing).
 */
export async function findOrCreateJob(
  supabase: SupabaseClient,
  input: AutoCreateInput
): Promise<AutoCreateResult> {
  // Try to match existing
  const match = await findMatchingJob(supabase, {
    companyId: input.companyId,
    propertyAddress: input.propertyAddress,
    propertyCity: input.propertyCity,
    propertyState: input.propertyState,
    propertyZip: input.propertyZip,
    claimNumber: input.insuranceData?.claim_number,
    homeownerName: input.homeownerName,
  });

  if (match.matched && match.jobId) {
    // Update existing job with any new data
    const updates: Record<string, unknown> = {};
    if (input.homeownerName && input.homeownerName.trim()) {
      updates.homeowner_name = input.homeownerName;
    }
    if (input.homeownerPhone) updates.homeowner_phone = input.homeownerPhone;
    if (input.homeownerEmail) updates.homeowner_email = input.homeownerEmail;
    if (input.insuranceData) {
      // Merge insurance data, don't overwrite
      updates.insurance_data = input.insuranceData;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('jobs')
        .update(updates)
        .eq('id', match.jobId);
    }

    return { jobId: match.jobId, created: false };
  }

  // Create new job
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      company_id: input.companyId,
      created_by: input.createdBy,
      job_type: input.jobType || 'insurance',
      job_status: 'lead',
      source: input.source || null,
      property_address: normalizeAddress(input.propertyAddress),
      property_city: input.propertyCity || null,
      property_state: input.propertyState || null,
      property_zip: input.propertyZip || null,
      homeowner_name: input.homeownerName || null,
      homeowner_phone: input.homeownerPhone || null,
      homeowner_email: input.homeownerEmail || null,
      insurance_data: input.insuranceData || {},
      financials: {},
      job_metadata: input.metadata || {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create job: ${error?.message}`);
  }

  return { jobId: data.id, created: true };
}
```

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/jobs/
git commit -m "feat: add Job matching service and find-or-create auto-creation"
```

---

### Task 4: Update Supplement Creation Flow

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/upload/actions.ts`
- Modify: `apps/contractor/src/components/wizard/wizard-context.tsx`
- Modify: `apps/contractor/src/components/wizard/step-estimate.tsx`

**Step 1: Update `createClaimAndSupplement` to `createJobAndSupplement`**

Rename the function. Replace `claims` table references with `jobs`. Use `findOrCreateJob` instead of direct insert. Update all field mappings from ClaimDetails to JobDetails. The supplement still gets created and linked via `job_id` (formerly `claim_id`).

**Step 2: Update wizard context**

In `wizard-context.tsx`, rename all `claim` references to `job`. Update reducer actions, localStorage keys (migration note: clear old localStorage key on first load to avoid stale data), and default state.

**Step 3: Update step components**

In step-estimate.tsx and other step components, rename any `claim` references in UI labels and field names. "Claim Details" becomes "Job Details" in the UI where appropriate — but keep "Claim Number" as-is for insurance fields since that's the actual insurance term.

**Step 4: Verify wizard still works end-to-end**

Run: `cd apps/contractor && npm run dev`
Test: Go through the full 4-step wizard, submit, verify a `jobs` record and `supplements` record are created.

**Step 5: Commit**

```bash
git add apps/contractor/src/app/(dashboard)/dashboard/upload/ apps/contractor/src/components/wizard/
git commit -m "refactor: update supplement wizard to use jobs table instead of claims"
```

---

### Task 5: Update Supplement List/Detail Queries

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/page.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/supplements-table.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`

**Step 1: Update all Supabase queries**

Every query that references `claims` or `claim_id` needs updating:
- `.from('claims')` -> `.from('jobs')`
- `.select('..., claims(...)')` -> `.select('..., jobs(...)')`
- `claim_id` -> `job_id`
- `claim.property_address` -> `job.property_address`
- etc.

**Step 2: Update the supplements table component**

The table columns reference claim data (carrier, property, claim #). Update these to read from the joined `jobs` table. Insurance-specific fields (carrier, claim number) read from `jobs.insurance_data` JSONB.

**Step 3: Update the supplement detail page**

This is the most complex — 771 lines. Every reference to `claim` needs updating. The policy analysis card, weather card, measurements card, claim overview card all read from what was `claims` and is now `jobs`.

**Step 4: Verify supplements display correctly**

Run: `npm run dev`
Test: View supplement list, view supplement detail, verify all data displays correctly.

**Step 5: Commit**

```bash
git add apps/contractor/src/app/(dashboard)/dashboard/supplements/
git commit -m "refactor: update supplement list and detail pages to use jobs table"
```

---

### Task 6: Update Dashboard to Jobs Pipeline

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/page.tsx`
- Create: `apps/contractor/src/components/dashboard/jobs-pipeline.tsx`
- Modify: `apps/contractor/src/components/dashboard/dashboard-client.tsx`
- Modify: `apps/contractor/src/components/dashboard/shell.tsx`

**Step 1: Update dashboard data fetching**

Replace supplement-centric queries with Job-centric queries. The dashboard should:
- Count Jobs by status (for pipeline view)
- Calculate pipeline value (sum of financials.approved_amount or financials.contract_price by status)
- Keep supplement-specific stats (recovery amount, approval rate) as secondary metrics
- Build action items from Job status + time in status

**Step 2: Create Jobs pipeline component**

A list view (not kanban yet — simpler to build, more data-dense) showing all active Jobs grouped by pipeline stage. Insurance and retail separated. Each row: homeowner + address, carrier/type, dollar value, days in status, next action badge.

**Step 3: Update sidebar navigation**

In `shell.tsx`, update nav items:
- "Dashboard" stays
- "Supplements" becomes "Jobs" (shows the pipeline)
- "New Supplement" becomes "New Job" (still goes to wizard for now)
- "Policy Decoder" stays
- "Documents" added (global document library — Task 9)
- "Knowledge Base" stays
- "Settings" stays

**Step 4: Update dashboard client**

Replace the current layout (KPI cards + pipeline donut + recovery chart + action items + activity feed) with:
- Pipeline summary (counts per status stage)
- Revenue this month
- Action feed (Job-based, not supplement-based)
- Recent activity (Job events, not just supplement events)

**Step 5: Verify dashboard works**

Run: `npm run dev`
Test: Dashboard loads, pipeline shows correct counts, navigation works.

**Step 6: Commit**

```bash
git add apps/contractor/src/app/(dashboard)/dashboard/ apps/contractor/src/components/dashboard/
git commit -m "feat: replace supplement-centric dashboard with Jobs pipeline view"
```

---

### Task 7: Brand Color Extraction Utility

**Files:**
- Create: `packages/pdf/src/brand-colors.ts`

**Step 1: Write color extraction utility**

```typescript
// packages/pdf/src/brand-colors.ts

/**
 * Extract dominant colors from a logo image.
 * Uses canvas-based pixel sampling to find primary and accent colors.
 *
 * For server-side usage (Node.js), requires 'canvas' package.
 * Returns RGB arrays compatible with jsPDF.
 */

interface BrandColors {
  primary: [number, number, number];   // Dominant color
  secondary: [number, number, number]; // Second most common
  accent: [number, number, number];    // Contrasting accent
}

const DEFAULT_BRAND: BrandColors = {
  primary: [30, 58, 138],    // Blue-900 (4Margin default)
  secondary: [51, 65, 85],   // Slate-700
  accent: [59, 130, 246],    // Blue-500
};

/**
 * Extract brand colors from a logo image buffer.
 * Uses k-means-style clustering on pixel data to find dominant colors.
 */
export async function extractBrandColors(
  imageBuffer: Buffer
): Promise<BrandColors> {
  try {
    // Dynamic import for server-side canvas
    const { createCanvas, loadImage } = await import('canvas');

    const img = await loadImage(imageBuffer);
    const canvas = createCanvas(100, 100); // Downsample for speed
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 100, 100);

    const imageData = ctx.getImageData(0, 0, 100, 100);
    const pixels = imageData.data;

    // Collect non-white, non-black, non-transparent pixels
    const colorCounts = new Map<string, { r: number; g: number; b: number; count: number }>();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent, near-white, near-black pixels
      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;

      // Quantize to reduce unique colors (bucket into 32-step ranges)
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;

      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
        // Running average for more accurate color
        existing.r = Math.round((existing.r * (existing.count - 1) + r) / existing.count);
        existing.g = Math.round((existing.g * (existing.count - 1) + g) / existing.count);
        existing.b = Math.round((existing.b * (existing.count - 1) + b) / existing.count);
      } else {
        colorCounts.set(key, { r, g, b, count: 1 });
      }
    }

    // Sort by frequency
    const sorted = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

    if (sorted.length === 0) return DEFAULT_BRAND;

    const primary: [number, number, number] = [sorted[0].r, sorted[0].g, sorted[0].b];
    const secondary: [number, number, number] = sorted.length > 1
      ? [sorted[1].r, sorted[1].g, sorted[1].b]
      : darken(primary, 0.3);
    const accent: [number, number, number] = sorted.length > 2
      ? [sorted[2].r, sorted[2].g, sorted[2].b]
      : lighten(primary, 0.3);

    return { primary, secondary, accent };
  } catch {
    return DEFAULT_BRAND;
  }
}

function darken(color: [number, number, number], amount: number): [number, number, number] {
  return [
    Math.round(color[0] * (1 - amount)),
    Math.round(color[1] * (1 - amount)),
    Math.round(color[2] * (1 - amount)),
  ];
}

function lighten(color: [number, number, number], amount: number): [number, number, number] {
  return [
    Math.round(color[0] + (255 - color[0]) * amount),
    Math.round(color[1] + (255 - color[1]) * amount),
    Math.round(color[2] + (255 - color[2]) * amount),
  ];
}

export { DEFAULT_BRAND };
export type { BrandColors };
```

**Step 2: Add canvas dependency**

Run: `cd packages/pdf && npm install canvas`

**Step 3: Wire into logo upload flow**

In `apps/contractor/src/components/settings/logo-upload.tsx`, after successful logo upload, call an API route that:
1. Downloads the logo from Supabase storage
2. Runs `extractBrandColors(buffer)`
3. Saves the result to `companies.brand_colors` JSONB

**Step 4: Commit**

```bash
git add packages/pdf/src/brand-colors.ts packages/pdf/package.json
git commit -m "feat: add brand color extraction from logo images"
```

---

### Task 8: Document Template System (PDF)

**Files:**
- Create: `packages/pdf/src/template.ts`
- Modify: `packages/pdf/src/decoder-pdf.ts`

**Step 1: Create reusable PDF template**

```typescript
// packages/pdf/src/template.ts

import jsPDF from 'jspdf';
import type { BrandColors } from './brand-colors';
import { DEFAULT_BRAND } from './brand-colors';

export interface DocumentBrand {
  companyName: string;
  logoImageBase64?: string; // PNG/JPG as base64
  colors: BrandColors;
  disclaimer?: string;
}

const FALLBACK_BRAND: DocumentBrand = {
  companyName: '4Margin',
  colors: DEFAULT_BRAND,
};

/**
 * Creates a branded jsPDF document with standard header and footer.
 * All 4Margin PDFs use this as their base.
 */
export function createBrandedDocument(
  brand: DocumentBrand = FALLBACK_BRAND,
  options?: { orientation?: 'portrait' | 'landscape' }
): jsPDF {
  const doc = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // Store brand data for use by addHeader/addFooter
  (doc as any).__brand = brand;

  return doc;
}

/**
 * Add branded header to current page.
 * Call this at the top of each new page.
 */
export function addBrandedHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string
): number {
  const brand: DocumentBrand = (doc as any).__brand || FALLBACK_BRAND;
  const pageWidth = doc.internal.pageSize.getWidth();
  const { primary } = brand.colors;

  // Header background bar
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Logo (if available)
  let textStartX = 15;
  if (brand.logoImageBase64) {
    try {
      doc.addImage(brand.logoImageBase64, 'PNG', 10, 3, 16, 16);
      textStartX = 30;
    } catch {
      // Logo failed to load, skip
    }
  }

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), textStartX, 10);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, textStartX, 16);
  }

  // Company name (right-aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(brand.companyName, pageWidth - 15, 10, { align: 'right' });

  // Reset text color
  doc.setTextColor(15, 23, 42);

  // Return Y position after header
  return 28;
}

/**
 * Add branded footer to current page.
 * Call this at the bottom of each page.
 */
export function addBrandedFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages?: number
): void {
  const brand: DocumentBrand = (doc as any).__brand || FALLBACK_BRAND;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { accent } = brand.colors;

  // Thin accent line
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');

  const footerLeft = brand.companyName === '4Margin'
    ? '4Margin'
    : `${brand.companyName}  |  Powered by 4Margin`;
  doc.text(footerLeft, 15, pageHeight - 10);

  const pageText = totalPages
    ? `Page ${pageNumber} of ${totalPages}`
    : `Page ${pageNumber}`;
  doc.text(pageText, pageWidth - 15, pageHeight - 10, { align: 'right' });

  // Reset
  doc.setTextColor(15, 23, 42);
}

/**
 * Add a section header with accent-colored left bar.
 */
export function addSectionHeader(
  doc: jsPDF,
  y: number,
  title: string,
  color?: [number, number, number]
): number {
  const brand: DocumentBrand = (doc as any).__brand || FALLBACK_BRAND;
  const barColor = color || brand.colors.accent;

  // Accent bar
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(15, y, 3, 7, 'F');

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, 22, y + 5);

  return y + 12;
}

export { FALLBACK_BRAND };
```

**Step 2: Update existing decoder PDF to use template**

Refactor `packages/pdf/src/decoder-pdf.ts` to use `createBrandedDocument`, `addBrandedHeader`, `addBrandedFooter` instead of its current hardcoded header/footer logic. This is a refactor — same visual output but using the shared template system.

**Step 3: Export from package index**

In `packages/pdf/src/index.ts`, add exports for the template system and brand colors.

**Step 4: Commit**

```bash
git add packages/pdf/src/template.ts packages/pdf/src/index.ts packages/pdf/src/decoder-pdf.ts
git commit -m "feat: add branded PDF template system with reusable header/footer/sections"
```

---

### Task 9: Global Document Library (DB + UI)

**Files:**
- Create: `apps/contractor/src/app/(dashboard)/dashboard/documents/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/documents/document-library.tsx`
- Create: `apps/contractor/src/app/api/documents/route.ts`

**Step 1: Create the documents page (server component)**

Fetches all `company_documents` for the company. Renders the document library component.

**Step 2: Create the document library client component**

- File upload area (drag & drop)
- Category selector: Authorization Forms, Contracts, Licenses & Certifications, Financial (W-9, COI), Lien Waivers, Other
- Document list grouped by category
- Each document: name, description, upload date, file size, download link, delete button
- Edit name/description/category inline

**Step 3: Create the API route**

POST: Upload document to Supabase storage (`company-documents/{companyId}/{filename}`), create `company_documents` record.
DELETE: Remove storage file and DB record.

**Step 4: Add "Documents" to sidebar navigation**

In `shell.tsx`, add "Documents" nav item between "Policy Decoder" and "Knowledge Base".

**Step 5: Verify**

Run: `npm run dev`
Test: Navigate to Documents, upload a file, verify it appears in the list, download it, delete it.

**Step 6: Commit**

```bash
git add apps/contractor/src/app/(dashboard)/dashboard/documents/ apps/contractor/src/app/api/documents/ apps/contractor/src/components/dashboard/shell.tsx
git commit -m "feat: add global document library with upload, categorize, and manage"
```

---

### Task 10: Contractor Decode Report (New PDF)

**Files:**
- Create: `packages/pdf/src/contractor-decode-pdf.ts`

**Step 1: Build the contractor-facing decode PDF**

Uses the template system from Task 8. Takes `PolicyAnalysis` data (same as existing decoder). Produces a dense, technical PDF with:

1. **Header** — branded with contractor's logo/colors
2. **Go/No-Go Signal** — large colored badge (green/yellow/red) based on risk level + coverage type + deductible analysis
3. **Coverage Summary** — RCV/ACV, deductible, dwelling limit in a summary box
4. **Exclusions & Landmines** — red/amber severity bars, plain language impact, strategic notes
5. **Favorable Provisions** — green bars, how-to-leverage notes
6. **O&P Indicators** — based on policy language analysis
7. **Depreciation Details** — method, recoverable amount, triggers
8. **Carrier Battle Card** — carrier name, profile summary, known tactics. Marked as "EDITABLE — add your notes in the app"
9. **Key Dates & Deadlines** — filing deadline, proof of loss window
10. **Full Coverage Detail** — all coverages, deductibles, endorsements, exclusions (collapsible sections equivalent in PDF = separate pages or dense tables)
11. **Disclaimer + Footer**

**Step 2: Export from package**

Add `generateContractorDecodePdf` to `packages/pdf/src/index.ts`.

**Step 3: Commit**

```bash
git add packages/pdf/src/contractor-decode-pdf.ts packages/pdf/src/index.ts
git commit -m "feat: add contractor-facing decode PDF with Go/No-Go, battle card, strategy notes"
```

---

### Task 11: Homeowner Decode Report (New PDF)

**Files:**
- Create: `packages/pdf/src/homeowner-decode-pdf.ts`

**Step 1: Build the homeowner-facing decode PDF**

Uses the template system. Takes the same `PolicyAnalysis` data but renders it completely differently — clean, professional, easy to read.

1. **Header** — contractor's branding (logo, colors)
2. **Your Coverage at a Glance** — 2-3 sentence plain English summary
3. **What's Covered** — green-themed section, simple bullet points
4. **What's Not Covered** — neutral-themed section (not red/scary), soft language for each exclusion
   - Transform each exclusion into homeowner-friendly language
   - Include dollar impact where calculable (percentage deductible → approximate dollar amount)
5. **Your Deductible** — clear explanation with dollar amount
6. **What Happens Next** — the claim process in 4-5 simple steps
7. **Disclaimer** — educational framing, contractor branding
8. **Footer** — contractor name, phone, "Powered by 4Margin"

**Key: This PDF must look like a professional report, not a technical document.** More whitespace, larger fonts, fewer sections, friendlier language. The homeowner should feel informed, not overwhelmed.

**Step 2: Export from package**

Add `generateHomeownerDecodePdf` to `packages/pdf/src/index.ts`.

**Step 3: Commit**

```bash
git add packages/pdf/src/homeowner-decode-pdf.ts packages/pdf/src/index.ts
git commit -m "feat: add homeowner-facing decode PDF with soft exclusion language and clean design"
```

---

### Task 12: Decode UI — Two-Report Display + Editable Battle Card

**Files:**
- Modify: `apps/contractor/src/components/policy-decoder/decoder-results.tsx`
- Create: `apps/contractor/src/components/policy-decoder/go-no-go-signal.tsx`
- Create: `apps/contractor/src/components/policy-decoder/carrier-battle-card.tsx`
- Modify: `apps/contractor/src/app/api/policy-decoder/[id]/download/route.ts`

**Step 1: Add Go/No-Go signal component**

A prominent visual indicator at the top of decode results:
- **Green (GO):** RCV coverage, no cosmetic exclusion, flat deductible ≤ $2,500, favorable provisions present
- **Yellow (CAUTION):** ACV or high deductible or some exclusions but workable
- **Red (NO-GO):** Cosmetic exclusion + high percentage deductible + unfavorable coverage = claim not worth pursuing

Logic based on: `depreciationMethod`, exclusions severity, deductible type/amount, favorable provisions count.

**Step 2: Add editable carrier battle card component**

Displays carrier profile data (from `CARRIER_PROFILES` in policy-engine) plus an editable notes field. Notes save to a new column on `policy_decodings` or a separate `carrier_notes` table keyed by (company_id, carrier_name). Notes persist across all future decodes with the same carrier.

**Step 3: Update decode results display**

Add tabs or sections: "Contractor View" and "Homeowner View". Contractor view shows the full technical breakdown (current display + Go/No-Go + battle card). Homeowner view shows a preview of the HO report content in-app.

**Step 4: Update download route**

The download API route now accepts a `type` query param:
- `?type=contractor` → generates contractor decode PDF
- `?type=homeowner` → generates homeowner decode PDF
- Default (no param) → generates contractor decode PDF for backwards compatibility

**Step 5: Add download buttons to UI**

Two download buttons on the decode results page:
- "Download Contractor Report" → contractor PDF
- "Download Homeowner Report" → homeowner PDF

**Step 6: Commit**

```bash
git add apps/contractor/src/components/policy-decoder/ apps/contractor/src/app/api/policy-decoder/
git commit -m "feat: two-report decode UI with Go/No-Go signal, editable battle card, and dual download"
```

---

### Task 13: Wire Decode to Jobs

**Files:**
- Modify: `apps/contractor/src/app/api/parse/policy-standalone/route.ts`
- Modify: `apps/contractor/src/components/policy-decoder/decoder-flow.tsx`

**Step 1: After decode completes, find-or-create a Job**

In the parse API route, after `parsePolicyPdfV2` returns successfully:

1. Extract `namedInsured` and `propertyAddress` from the `PolicyAnalysis` result
2. Call `findOrCreateJob()` with that data + carrier info
3. Update `policy_decodings.job_id` with the matched/created Job ID
4. If Job was created, set `job_status` to `'qualified'` (policy decoded = qualified lead)
5. Store the policy analysis on the Job as well (or reference the `policy_decodings` record)

**Step 2: Show Job link in decode UI**

In `decoder-flow.tsx`, after decode completes, show a link: "This decode is linked to Job: [address]" with a link to the Job detail page (future — for now, link to the supplement detail if one exists).

**Step 3: Commit**

```bash
git add apps/contractor/src/app/api/parse/ apps/contractor/src/components/policy-decoder/
git commit -m "feat: wire policy decode to Job auto-creation via find-or-create"
```

---

### Task 14: Wire EagleView Parser Into Jobs

**Files:**
- Modify: `apps/contractor/src/lib/parsers/claude.ts`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/upload/actions.ts`

**Step 1: Ensure EV measurements save to Job (not claim)**

The existing `parseMeasurementWithClaude` returns measurement data. In `createJobAndSupplement` (Task 4 renamed this), the measurement data gets saved to the `jobs` table's typed measurement columns. Verify this still works after the rename.

The measurement columns (`waste_percent`, `ft_ridges`, `ft_hips`, etc.) were on the `claims` table and transferred to `jobs` via the rename. The parser output should map directly to these columns without changes.

**Step 2: Verify measurement data flows through**

Run: `npm run dev`
Test: Upload an EagleView PDF in the wizard Step 3, verify measurements parse and save to the `jobs` record.

**Step 3: Commit (if any changes needed)**

```bash
git add apps/contractor/src/lib/parsers/ apps/contractor/src/app/(dashboard)/dashboard/upload/
git commit -m "fix: verify EagleView parser wires into jobs table correctly"
```

---

### Task 15: Skill Updater

**Files:**
- Create: `C:\Users\New User\.claude\skills\4margin-skill-updater\SKILL.md`

**Step 1: Write the skill updater skill**

This skill runs at session end. It:
1. Reads the git diff of the session (`git diff HEAD~N` where N = number of commits this session)
2. Checks if changes conflict with or extend existing skills/agents
3. Proposes specific updates to affected skills
4. Applies updates after approval

**Step 2: Commit the skill**

```bash
git add .claude/skills/4margin-skill-updater/
git commit -m "feat: add session-end skill updater for maintaining skill accuracy"
```

---

## Execution Order Summary

The tasks should be executed in this order due to dependencies:

1. **Task 1** — DB migration (everything depends on this)
2. **Task 2** — Types + schemas (code depends on this)
3. **Task 3** — Job matching (used by Tasks 4, 13)
4. **Task 4** — Update supplement creation
5. **Task 5** — Update supplement queries
6. **Task 6** — Dashboard pipeline
7. **Task 7** — Brand color extraction (needed by Task 8)
8. **Task 8** — PDF template system (needed by Tasks 10, 11)
9. **Task 9** — Document library (independent, can run parallel with 7-8)
10. **Task 10** — Contractor decode PDF
11. **Task 11** — Homeowner decode PDF
12. **Task 12** — Decode UI (needs Tasks 10, 11)
13. **Task 13** — Wire decode to Jobs (needs Task 3)
14. **Task 14** — EagleView verification (needs Task 1)
15. **Task 15** — Skill updater (independent)

**Parallelizable groups:**
- Tasks 7, 8, 9 can run in parallel after Task 6
- Tasks 10, 11 can run in parallel after Task 8
- Task 14 can run anytime after Task 1
- Task 15 is fully independent
