# Platform Workflow Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the 4Margin contractor app from supplement-first to service-agnostic architecture with four independent services (Inspection, Policy Decode, Supplement, Quote) and passive CRM.

**Architecture:** Service-agnostic platform where four services operate independently on a shared Job container. Each service can be the entry point, passively enriching the CRM. New sidebar, global "New" button, job detail page with collapsible sections, inspection flow (6 steps), quote flow (single page), refined policy decode + supplement flows.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind + shadcn/ui, Supabase (PostgreSQL + Storage + RLS), Claude API (Haiku Vision for photos), Resend (email), jsPDF (@4margin/pdf package)

**Design Document:** `docs/plans/2026-03-13-platform-workflow-design.md` — the source of truth for all decisions.

---

## Phase 1: Foundation (DB + Types + Sidebar)

### Task 1: Create TypeScript Types

**Files:**
- Create: `apps/contractor/src/types/inspection.ts`
- Create: `apps/contractor/src/types/quote.ts`
- Create: `apps/contractor/src/types/pricing.ts`
- Create: `apps/contractor/src/types/activity.ts`

**Step 1: Create inspection types**

Create `apps/contractor/src/types/inspection.ts`:

```typescript
export type InspectionStatus = 'draft' | 'processing' | 'complete';

export interface RoofDetails {
  approximate_squares: number | null;
  predominant_pitch: string;
  number_of_layers: number;
  shingle_type: string;
  structure_complexity: 'Simple' | 'Normal' | 'Complex' | '';
}

export interface DamageEntry {
  type: 'hail' | 'wind' | 'mechanical' | 'wear_tear' | 'tree' | 'animal' | 'other';
  severity: 'minor' | 'moderate' | 'severe';
}

export type ComponentCondition = 'good' | 'fair' | 'poor' | 'needs_replacement';

export interface AssessmentData {
  roof_details: RoofDetails;
  damage_observed: {
    types: DamageEntry[];
    notes: string;
  };
  component_conditions: {
    shingles: ComponentCondition | '';
    ridge_cap: ComponentCondition | '';
    flashing: ComponentCondition | '';
    pipe_boots: ComponentCondition | '';
    vents: ComponentCondition | '';
    gutters: ComponentCondition | '';
    drip_edge: ComponentCondition | '';
    skylights: ComponentCondition | '';
    chimney: ComponentCondition | '';
    soffit_fascia: ComponentCondition | '';
  };
  confidence_analysis: {
    level: 'high' | 'moderate' | 'low' | 'uncertain' | '';
    notes: string;
  };
  general_notes: string;
}

export interface Inspection {
  id: string;
  company_id: string;
  job_id: string | null;
  created_by: string;
  status: InspectionStatus;
  assessment_data: AssessmentData;
  report_pdf_url: string | null;
  inspected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PhotoCategory =
  | 'elevation'
  | 'roof_overview'
  | 'damage'
  | 'component'
  | 'interior_damage'
  | 'install'
  | 'other';

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  company_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number | null;
  mime_type: string | null;
  ai_category: PhotoCategory;
  ai_subcategory: string | null;
  ai_confidence: number | null;
  contractor_category: PhotoCategory | null;
  contractor_subcategory: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export const EMPTY_ASSESSMENT: AssessmentData = {
  roof_details: {
    approximate_squares: null,
    predominant_pitch: '',
    number_of_layers: 1,
    shingle_type: '',
    structure_complexity: '',
  },
  damage_observed: {
    types: [],
    notes: '',
  },
  component_conditions: {
    shingles: '',
    ridge_cap: '',
    flashing: '',
    pipe_boots: '',
    vents: '',
    gutters: '',
    drip_edge: '',
    skylights: '',
    chimney: '',
    soffit_fascia: '',
  },
  confidence_analysis: {
    level: '',
    notes: '',
  },
  general_notes: '',
};
```

**Step 2: Create quote types**

Create `apps/contractor/src/types/quote.ts`:

```typescript
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface TierConfig {
  label: string;
  manufacturer: string;
  product_line: string;
  price_per_square: number;
}

export interface TierCalculated extends TierConfig {
  subtotal: number;
  total: number;
}

export interface QuoteAddOn {
  description: string;
  price: number;
}

export interface QuoteDiscount {
  type: '$' | '%';
  amount: number;
  reason: string;
}

export interface Quote {
  id: string;
  company_id: string;
  job_id: string | null;
  created_by: string;
  status: QuoteStatus;
  total_squares: number | null;
  good_tier: TierCalculated;
  better_tier: TierCalculated;
  best_tier: TierCalculated;
  add_ons: QuoteAddOn[];
  discounts: QuoteDiscount[];
  line_items: { description: string }[];
  selected_tier: 'good' | 'better' | 'best' | null;
  quote_pdf_url: string | null;
  homeowner_name: string | null;
  created_at: string;
  updated_at: string;
}

export const EMPTY_TIER: TierCalculated = {
  label: '',
  manufacturer: '',
  product_line: '',
  price_per_square: 0,
  subtotal: 0,
  total: 0,
};
```

**Step 3: Create pricing types**

Create `apps/contractor/src/types/pricing.ts`:

```typescript
import type { TierConfig } from './quote';

export interface CompanyPricing {
  id: string;
  company_id: string;
  good_tier: TierConfig;
  better_tier: TierConfig;
  best_tier: TierConfig;
  default_line_items: { description: string }[];
  addon_templates: { description: string; default_price: number }[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_LINE_ITEMS: { description: string }[] = [
  { description: 'Tear-off existing roofing system' },
  { description: 'Install synthetic underlayment' },
  { description: 'Install starter strip at eaves and rakes' },
  { description: 'Install shingles per manufacturer specifications' },
  { description: 'Install ridge cap ventilation' },
  { description: 'Install ice & water shield per local building code' },
  { description: 'Install drip edge at eaves and rakes' },
  { description: 'Replace pipe boots and penetration flashings' },
  { description: 'Replace step and counter flashing as needed' },
  { description: 'Final cleanup and debris haul-off' },
];
```

**Step 4: Create activity types**

Create `apps/contractor/src/types/activity.ts`:

```typescript
export type ActivityAction =
  | 'job_created'
  | 'inspection_completed'
  | 'policy_decoded'
  | 'supplement_generated'
  | 'supplement_status_changed'
  | 'quote_generated'
  | 'quote_sent'
  | 'status_changed'
  | 'data_updated'
  | 'document_uploaded';

export interface ActivityLogEntry {
  id: string;
  job_id: string;
  company_id: string;
  user_id: string | null;
  action: ActivityAction;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
```

**Step 5: Commit**

```bash
git add apps/contractor/src/types/inspection.ts apps/contractor/src/types/quote.ts apps/contractor/src/types/pricing.ts apps/contractor/src/types/activity.ts
git commit -m "feat: add TypeScript types for inspection, quote, pricing, and activity"
```

---

### Task 2: Database Migrations (042-048)

**Files:**
- Create: `apps/contractor/supabase/migrations/042_inspections.sql`
- Create: `apps/contractor/supabase/migrations/043_inspection_photos.sql`
- Create: `apps/contractor/supabase/migrations/044_quotes.sql`
- Create: `apps/contractor/supabase/migrations/045_company_pricing.sql`
- Create: `apps/contractor/supabase/migrations/046_job_activity_log.sql`
- Create: `apps/contractor/supabase/migrations/047_policy_decodings_damage_context.sql`
- Create: `apps/contractor/supabase/migrations/048_manufacturer_product_lines.sql`

**Step 1: Create inspections table migration**

Create `apps/contractor/supabase/migrations/042_inspections.sql`:

```sql
-- Inspections table for roof inspection workflow
CREATE TABLE inspections (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES users(id),
  status          TEXT        NOT NULL DEFAULT 'draft',
  assessment_data JSONB       NOT NULL DEFAULT '{}',
  report_pdf_url  TEXT,
  inspected_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inspections"
  ON inspections FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company inspections"
  ON inspections FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company inspections"
  ON inspections FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can delete company inspections"
  ON inspections FOR DELETE USING (company_id = get_user_company_id());

CREATE TRIGGER trg_inspections_updated
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_inspections_company ON inspections (company_id);
CREATE INDEX idx_inspections_job ON inspections (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_inspections_status ON inspections (company_id, status);
```

**Step 2: Create inspection_photos table migration**

Create `apps/contractor/supabase/migrations/043_inspection_photos.sql`:

```sql
-- Inspection photos with AI classification
CREATE TABLE inspection_photos (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id         UUID        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  company_id            UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  storage_path          TEXT        NOT NULL,
  original_filename     TEXT        NOT NULL,
  file_size             INTEGER,
  mime_type             TEXT,
  ai_category           TEXT        NOT NULL DEFAULT 'other',
  ai_subcategory        TEXT,
  ai_confidence         REAL,
  contractor_category   TEXT,
  contractor_subcategory TEXT,
  caption               TEXT,
  sort_order            INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inspection photos"
  ON inspection_photos FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company inspection photos"
  ON inspection_photos FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company inspection photos"
  ON inspection_photos FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can delete company inspection photos"
  ON inspection_photos FOR DELETE USING (company_id = get_user_company_id());

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos (inspection_id);
CREATE INDEX idx_inspection_photos_category ON inspection_photos (ai_category);
CREATE INDEX idx_inspection_photos_company ON inspection_photos (company_id);
```

**Step 3: Create quotes table migration**

Create `apps/contractor/supabase/migrations/044_quotes.sql`:

```sql
-- Quotes table for retail quote workflow
CREATE TABLE quotes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES users(id),
  status          TEXT        NOT NULL DEFAULT 'draft',
  total_squares   NUMERIC,
  good_tier       JSONB       NOT NULL DEFAULT '{}',
  better_tier     JSONB       NOT NULL DEFAULT '{}',
  best_tier       JSONB       NOT NULL DEFAULT '{}',
  add_ons         JSONB       NOT NULL DEFAULT '[]',
  discounts       JSONB       NOT NULL DEFAULT '[]',
  line_items      JSONB       NOT NULL DEFAULT '[]',
  selected_tier   TEXT,
  quote_pdf_url   TEXT,
  homeowner_name  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company quotes"
  ON quotes FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company quotes"
  ON quotes FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company quotes"
  ON quotes FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can delete company quotes"
  ON quotes FOR DELETE USING (company_id = get_user_company_id());

CREATE TRIGGER trg_quotes_updated
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_quotes_company ON quotes (company_id);
CREATE INDEX idx_quotes_job ON quotes (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_quotes_status ON quotes (company_id, status);
```

**Step 4: Create company_pricing table migration**

Create `apps/contractor/supabase/migrations/045_company_pricing.sql`:

```sql
-- Company pricing configuration for quote tiers
CREATE TABLE company_pricing (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  good_tier         JSONB       NOT NULL DEFAULT '{}',
  better_tier       JSONB       NOT NULL DEFAULT '{}',
  best_tier         JSONB       NOT NULL DEFAULT '{}',
  default_line_items JSONB      NOT NULL DEFAULT '[]',
  addon_templates   JSONB       NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company pricing"
  ON company_pricing FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company pricing"
  ON company_pricing FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can update company pricing"
  ON company_pricing FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER trg_company_pricing_updated
  BEFORE UPDATE ON company_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Step 5: Create job_activity_log table migration**

Create `apps/contractor/supabase/migrations/046_job_activity_log.sql`:

```sql
-- Job activity log for CRM timeline
CREATE TABLE job_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id),
  action      TEXT        NOT NULL,
  description TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company activity"
  ON job_activity_log FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can create company activity"
  ON job_activity_log FOR INSERT WITH CHECK (company_id = get_user_company_id());

CREATE INDEX idx_activity_log_job ON job_activity_log (job_id);
CREATE INDEX idx_activity_log_company ON job_activity_log (company_id, created_at DESC);
```

**Step 6: Create policy_decodings damage_context + storage buckets migration**

Create `apps/contractor/supabase/migrations/047_policy_decodings_damage_context.sql`:

```sql
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
```

**Step 7: Create manufacturer_product_lines table migration**

Create `apps/contractor/supabase/migrations/048_manufacturer_product_lines.sql`:

```sql
-- Manufacturer product lines reference table (platform-wide, no RLS)
CREATE TABLE manufacturer_product_lines (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer    TEXT        NOT NULL,
  product_line    TEXT        NOT NULL,
  tier_level      TEXT,
  warranty_years  INTEGER,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manufacturer, product_line)
);

-- Seed with known product lines from KB
INSERT INTO manufacturer_product_lines (manufacturer, product_line, tier_level, warranty_years) VALUES
  -- GAF
  ('GAF', 'Royal Sovereign', 'good', 25),
  ('GAF', 'Timberline HDZ', 'better', 50),
  ('GAF', 'Timberline AS II', 'best', 50),
  ('GAF', 'Timberline Ultra HDZ', 'premium', 50),
  ('GAF', 'Grand Sequoia', 'premium', 50),
  ('GAF', 'Camelot II', 'premium', 50),
  -- CertainTeed
  ('CertainTeed', 'XT 25', 'good', 25),
  ('CertainTeed', 'XT 30', 'good', 30),
  ('CertainTeed', 'Landmark', 'better', 50),
  ('CertainTeed', 'Landmark Pro', 'better', 50),
  ('CertainTeed', 'Landmark Premium', 'best', 50),
  ('CertainTeed', 'NorthGate', 'best', 50),
  ('CertainTeed', 'Grand Manor', 'premium', 50),
  ('CertainTeed', 'Presidential Shake', 'premium', 50),
  -- Owens Corning
  ('Owens Corning', 'Supreme', 'good', 25),
  ('Owens Corning', 'Oakridge', 'good', 50),
  ('Owens Corning', 'Duration', 'better', 50),
  ('Owens Corning', 'Duration FLEX', 'better', 50),
  ('Owens Corning', 'Duration STORM', 'best', 50),
  ('Owens Corning', 'Berkshire', 'premium', 50),
  ('Owens Corning', 'Woodcrest', 'premium', 50),
  ('Owens Corning', 'Woodmoor', 'premium', 50),
  -- IKO
  ('IKO', 'Marathon', 'good', 25),
  ('IKO', 'Cambridge', 'better', 50),
  ('IKO', 'Dynasty', 'best', 50),
  ('IKO', 'Nordic', 'best', 50),
  ('IKO', 'Crowne Slate', 'premium', 50),
  -- Atlas
  ('Atlas', 'GlassMaster', 'good', 30),
  ('Atlas', 'StormMaster Shake', 'better', 50),
  ('Atlas', 'StormMaster Slate', 'best', 50),
  ('Atlas', 'Pinnacle Pristine', 'better', 50),
  -- Tamko
  ('Tamko', 'Elite Glass-Seal', 'good', 25),
  ('Tamko', 'Heritage', 'better', 30),
  ('Tamko', 'Heritage Vintage', 'better', 30),
  ('Tamko', 'Titan XT', 'best', 50),
  ('Tamko', 'Lamarite', 'premium', 50)
ON CONFLICT (manufacturer, product_line) DO NOTHING;
```

**Step 8: Commit all migrations**

```bash
git add apps/contractor/supabase/migrations/042_inspections.sql apps/contractor/supabase/migrations/043_inspection_photos.sql apps/contractor/supabase/migrations/044_quotes.sql apps/contractor/supabase/migrations/045_company_pricing.sql apps/contractor/supabase/migrations/046_job_activity_log.sql apps/contractor/supabase/migrations/047_policy_decodings_damage_context.sql apps/contractor/supabase/migrations/048_manufacturer_product_lines.sql
git commit -m "feat: add database migrations for inspections, quotes, pricing, activity log, and manufacturer products"
```

---

### Task 3: Update Sidebar Navigation

**Files:**
- Modify: `apps/contractor/src/components/dashboard/shell.tsx`

**Context:** The current shell.tsx has inline SVG icons for navigation items. We need to:
1. Update navItems to new structure (Dashboard, Jobs, Inspections, Policies, Supplements, Quotes, Documents, KB, Settings, Admin)
2. Move profile to sidebar bottom
3. Add "New" button to header (right side)
4. Keep mobile responsive behavior

**Step 1: Read current shell.tsx**

Read `apps/contractor/src/components/dashboard/shell.tsx` to understand the full current structure before modifying.

**Step 2: Update the navItems array**

Replace the current navItems definition. The exact replacement depends on how icons are currently defined, but the new items should be:

```typescript
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboardIcon /> },
  { label: "Jobs", href: "/dashboard/jobs", icon: <BriefcaseIcon /> },
  { label: "Inspections", href: "/dashboard/inspections", icon: <ClipboardCheckIcon /> },
  { label: "Policies", href: "/dashboard/policies", icon: <ShieldIcon /> },
  { label: "Supplements", href: "/dashboard/supplements", icon: <FileTextIcon /> },
  { label: "Quotes", href: "/dashboard/quotes", icon: <CalculatorIcon /> },
  { label: "Documents", href: "/dashboard/documents", icon: <FolderIcon /> },
  { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: <BookOpenIcon /> },
  { label: "Settings", href: "/dashboard/settings", icon: <SettingsIcon /> },
];
```

Add admin items conditionally:
```typescript
if (isAdmin) {
  navItems.push({ label: "Admin", href: "/dashboard/admin", icon: <ShieldAlertIcon /> });
}
```

Remove "New Job", "New Decoder", "Enterprise", and "Photo Review" as standalone nav items.

**Step 3: Move profile dropdown to sidebar bottom**

Currently the profile/sign-out dropdown is in the header. Move it to a fixed-bottom section of the sidebar:

```tsx
{/* Bottom of sidebar - Profile */}
<div className="mt-auto border-t p-4">
  <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-3 w-full">
    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
      {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
    <div className="text-left text-sm">
      <div className="font-medium truncate">{user?.full_name}</div>
      <div className="text-muted-foreground text-xs truncate">{user?.companies?.name}</div>
    </div>
  </button>
  {profileOpen && (
    <div className="mt-2 space-y-1">
      <Link href="/dashboard/settings" className="block px-3 py-1.5 text-sm rounded hover:bg-accent">Settings</Link>
      <button onClick={handleSignOut} className="block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent text-red-600">Sign Out</button>
    </div>
  )}
</div>
```

**Step 4: Add "New" button to header**

Replace the profile icon location in the header with a "New" button:

```tsx
<Button onClick={() => setNewModalOpen(true)} className="gap-2">
  <PlusIcon className="h-4 w-4" />
  New
</Button>
```

The modal component will be built in Task 4.

**Step 5: Verify the build compiles**

Run: `cd apps/contractor && npx next build`
Expected: Build succeeds (new routes don't exist yet, but sidebar changes should compile)

**Step 6: Commit**

```bash
git add apps/contractor/src/components/dashboard/shell.tsx
git commit -m "feat: restructure sidebar navigation with new service categories"
```

---

### Task 4: Create NewServiceModal + JobPicker Components

**Files:**
- Create: `apps/contractor/src/components/dashboard/new-service-modal.tsx`
- Create: `apps/contractor/src/components/dashboard/job-picker.tsx`
- Modify: `apps/contractor/src/components/dashboard/shell.tsx` (import and render modal)

**Step 1: Create JobPicker component**

Create `apps/contractor/src/components/dashboard/job-picker.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MapPin } from 'lucide-react';

interface JobRow {
  id: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  homeowner_name: string | null;
  job_type: string;
  updated_at: string;
}

interface JobPickerProps {
  onSelectJob: (jobId: string) => void;
  onStartFresh: () => void;
}

export function JobPicker({ onSelectJob, onStartFresh }: JobPickerProps) {
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function fetchJobs() {
      setLoading(true);
      let query = supabase
        .from('jobs')
        .select('id, property_address, property_city, property_state, homeowner_name, job_type, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (search.trim()) {
        query = query.or(`property_address.ilike.%${search}%,homeowner_name.ilike.%${search}%`);
      }

      const { data } = await query;
      setJobs(data || []);
      setLoading(false);
    }
    fetchJobs();
  }, [search]);

  const jobTypeBadgeColor: Record<string, string> = {
    insurance: 'bg-blue-100 text-blue-800',
    retail: 'bg-green-100 text-green-800',
    hybrid: 'bg-purple-100 text-purple-800',
    repair: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address or homeowner name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-[320px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No jobs found</div>
        ) : (
          jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors flex items-start gap-3"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{job.property_address}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {job.homeowner_name && <span>{job.homeowner_name}</span>}
                  {job.property_city && job.property_state && (
                    <span>{job.property_city}, {job.property_state}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${jobTypeBadgeColor[job.job_type] || 'bg-gray-100 text-gray-800'}`}>
                {job.job_type}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="border-t pt-3">
        <Button variant="outline" onClick={onStartFresh} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Start Fresh
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Create NewServiceModal component**

Create `apps/contractor/src/components/dashboard/new-service-modal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardCheck, Shield, FileText, Calculator } from 'lucide-react';
import { JobPicker } from './job-picker';

interface NewServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ServiceType = 'inspection' | 'policy' | 'supplement' | 'quote';

const SERVICES: { type: ServiceType; label: string; description: string; icon: React.ReactNode; route: string }[] = [
  { type: 'inspection', label: 'Inspection', description: 'Start a new roof inspection', icon: <ClipboardCheck className="h-6 w-6" />, route: '/dashboard/inspections/new' },
  { type: 'policy', label: 'Policy Decode', description: 'Decode an insurance policy', icon: <Shield className="h-6 w-6" />, route: '/dashboard/policies/new' },
  { type: 'supplement', label: 'Supplement', description: 'Generate a supplement', icon: <FileText className="h-6 w-6" />, route: '/dashboard/supplements/new' },
  { type: 'quote', label: 'Quote', description: 'Create a retail quote', icon: <Calculator className="h-6 w-6" />, route: '/dashboard/quotes/new' },
];

export function NewServiceModal({ open, onOpenChange }: NewServiceModalProps) {
  const router = useRouter();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

  const handleSelectService = (type: ServiceType) => {
    setSelectedService(type);
  };

  const handleSelectJob = (jobId: string) => {
    const service = SERVICES.find((s) => s.type === selectedService);
    if (service) {
      router.push(`${service.route}?jobId=${jobId}`);
      onOpenChange(false);
      setSelectedService(null);
    }
  };

  const handleStartFresh = () => {
    const service = SERVICES.find((s) => s.type === selectedService);
    if (service) {
      router.push(service.route);
      onOpenChange(false);
      setSelectedService(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedService(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{selectedService ? 'Select a Job' : 'What would you like to do?'}</DialogTitle>
        </DialogHeader>

        {!selectedService ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {SERVICES.map((service) => (
              <button
                key={service.type}
                onClick={() => handleSelectService(service.type)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors text-center"
              >
                <div className="text-primary">{service.icon}</div>
                <div className="font-medium text-sm">{service.label}</div>
                <div className="text-xs text-muted-foreground">{service.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedService(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
            >
              ← Back to services
            </button>
            <JobPicker onSelectJob={handleSelectJob} onStartFresh={handleStartFresh} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Wire modal into shell.tsx**

Import and render the modal in shell.tsx. Add state:
```tsx
const [newModalOpen, setNewModalOpen] = useState(false);
```

Render the modal:
```tsx
<NewServiceModal open={newModalOpen} onOpenChange={setNewModalOpen} />
```

**Step 4: Verify the build compiles**

Run: `cd apps/contractor && npx next build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add apps/contractor/src/components/dashboard/new-service-modal.tsx apps/contractor/src/components/dashboard/job-picker.tsx apps/contractor/src/components/dashboard/shell.tsx
git commit -m "feat: add NewServiceModal and JobPicker for service-agnostic entry point"
```

---

### Task 5: Create Route Scaffolding

**Files:**
- Create: `apps/contractor/src/app/(dashboard)/dashboard/jobs/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/inspections/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/inspections/new/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/inspections/[id]/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/policies/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/policies/new/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/policies/[id]/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/quotes/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/quotes/new/page.tsx`
- Create: `apps/contractor/src/app/(dashboard)/dashboard/quotes/[id]/page.tsx`

**Step 1: Create all route placeholder pages**

Each page should be a minimal server component with a heading indicating what will go there. For example:

```tsx
// apps/contractor/src/app/(dashboard)/dashboard/jobs/page.tsx
export default function JobsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Jobs</h1>
      <p className="text-muted-foreground mt-2">Job list coming soon.</p>
    </div>
  );
}
```

Create similar placeholders for all routes listed above. The key pages that need real content in later phases:
- `jobs/page.tsx` — "Jobs" list
- `jobs/[id]/page.tsx` — "Job Detail" (Phase 2)
- `inspections/page.tsx` — "Inspections" list
- `inspections/new/page.tsx` — "New Inspection" (Phase 3)
- `inspections/[id]/page.tsx` — "Inspection Detail" (Phase 3)
- `policies/page.tsx` — "Policies" list (redirect from current policy-decoder)
- `policies/new/page.tsx` — "New Policy Decode"
- `policies/[id]/page.tsx` — "Policy Detail"
- `quotes/page.tsx` — "Quotes" list
- `quotes/new/page.tsx` — "New Quote" (Phase 4)
- `quotes/[id]/page.tsx` — "Quote Detail" (Phase 4)

**Step 2: Verify the build compiles with all new routes**

Run: `cd apps/contractor && npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/contractor/src/app/\(dashboard\)/dashboard/jobs/ apps/contractor/src/app/\(dashboard\)/dashboard/inspections/ apps/contractor/src/app/\(dashboard\)/dashboard/policies/ apps/contractor/src/app/\(dashboard\)/dashboard/quotes/
git commit -m "feat: scaffold route pages for jobs, inspections, policies, and quotes"
```

---

### Task 6: Create Shared Components

**Files:**
- Create: `apps/contractor/src/components/shared/collapsible-section.tsx`
- Create: `apps/contractor/src/components/shared/inline-edit-field.tsx`
- Create: `apps/contractor/src/components/shared/service-cta.tsx`

**Step 1: Create CollapsibleSection**

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({ title, icon, badge, defaultOpen = true, children, className }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm">{title}</h3>
          {badge}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
```

**Step 2: Create InlineEditField**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';

interface InlineEditFieldProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}

export function InlineEditField({ value, placeholder, onSave, className, inputClassName }: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    if (editValue.trim() === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue.trim());
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') { setEditValue(value); setEditing(false); }
        }}
        disabled={saving}
        className={inputClassName}
      />
    );
  }

  return (
    <button
      onClick={() => { setEditValue(value); setEditing(true); }}
      className={`group flex items-center gap-1 text-left hover:text-primary transition-colors ${className || ''}`}
    >
      <span className={value ? '' : 'text-muted-foreground italic'}>
        {value || placeholder || 'Click to add'}
      </span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
```

**Step 3: Create ServiceCTA**

```tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ServiceCTAProps {
  icon: React.ReactNode;
  message: string;
  actionLabel: string;
  href: string;
  greyedOut?: boolean;
}

export function ServiceCTA({ icon, message, actionLabel, href, greyedOut }: ServiceCTAProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-center ${greyedOut ? 'opacity-40' : ''}`}>
      <div className="text-muted-foreground mb-3">{icon}</div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {!greyedOut && (
        <Button asChild variant="outline">
          <Link href={href}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/contractor/src/components/shared/
git commit -m "feat: add shared components (CollapsibleSection, InlineEditField, ServiceCTA)"
```

---

### Task 7: Create Activity Log Helper

**Files:**
- Create: `apps/contractor/src/lib/jobs/activity-log.ts`

**Step 1: Create activity log utility**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityAction } from '@/types/activity';

interface LogActivityInput {
  jobId: string;
  companyId: string;
  userId?: string;
  action: ActivityAction;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<void> {
  const { error } = await supabase.from('job_activity_log').insert({
    job_id: input.jobId,
    company_id: input.companyId,
    user_id: input.userId || null,
    action: input.action,
    description: input.description,
    metadata: input.metadata || {},
  });
  if (error) {
    console.error('Failed to log activity:', error);
    // Non-blocking — don't throw, just log
  }
}

export async function getActivityLog(
  supabase: SupabaseClient,
  jobId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('job_activity_log')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
```

**Step 2: Commit**

```bash
git add apps/contractor/src/lib/jobs/activity-log.ts
git commit -m "feat: add activity log helper for job timeline tracking"
```

---

### Task 8: Create Jobs API Route

**Files:**
- Create: `apps/contractor/src/app/api/jobs/[id]/route.ts`
- Create: `apps/contractor/src/app/api/jobs/[id]/activity/route.ts`

**Step 1: Create job PATCH route for inline editing**

```typescript
// apps/contractor/src/app/api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const body = await request.json();

  // Only allow updating specific fields
  const allowedFields = [
    'property_address', 'property_city', 'property_state', 'property_zip',
    'homeowner_name', 'homeowner_phone', 'homeowner_email',
    'job_type', 'job_status', 'source',
    'insurance_data', 'financials', 'job_metadata',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

**Step 2: Create activity log GET route**

```typescript
// apps/contractor/src/app/api/jobs/[id]/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('job_activity_log')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

**Step 3: Commit**

```bash
git add apps/contractor/src/app/api/jobs/
git commit -m "feat: add job PATCH and activity log API routes"
```

---

## Phase 2: Job Detail Page

### Task 9: Build Jobs List Page

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/jobs/page.tsx`

Build a server component that fetches jobs for the company, displays them in a table with columns: Address, Homeowner, Type (badge), Status (badge), Last Updated, and a link to the job detail page. Add filter tabs (All, Insurance, Retail) and a search bar. Add a "New" button that opens the same service modal pattern.

**Step 1: Implement the jobs list page**

This is a server component querying `jobs` table filtered by `company_id`, with client-side filter/search components.

**Step 2: Commit**

---

### Task 10: Build Job Detail Page (Header + Sections)

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/jobs/[id]/page.tsx`
- Create: `apps/contractor/src/components/jobs/job-header.tsx`
- Create: `apps/contractor/src/components/jobs/stage-progress-tracker.tsx`
- Create: `apps/contractor/src/components/jobs/job-info-section.tsx`
- Create: `apps/contractor/src/components/jobs/job-inspection-section.tsx`
- Create: `apps/contractor/src/components/jobs/job-policy-section.tsx`
- Create: `apps/contractor/src/components/jobs/job-supplement-section.tsx`
- Create: `apps/contractor/src/components/jobs/job-quote-section.tsx`
- Create: `apps/contractor/src/components/jobs/job-documents-section.tsx`
- Create: `apps/contractor/src/components/jobs/job-activity-log.tsx`

The job detail page is a server component that fetches the job + related data (inspections, policy_decodings, supplements, quotes, activity log, documents) and renders:
1. **Sticky header:** Address heading, homeowner subtitle, job type badge (editable), source badge, status dropdown, stage progress tracker (4 service indicators), homeowner info row (inline editable)
2. **Collapsible sections:** Job Info, Inspection, Policy Decode, Supplement, Quote, Documents, Activity Log

Each section uses `CollapsibleSection` wrapper and either shows the service data summary or a `ServiceCTA` if not started. Retail jobs grey out (not hide) Policy Decode and Supplement sections.

Reference design doc Section 2 for exact layout.

**Step 1-2: Build each component following the design doc Section 2**

**Step 3: Commit**

---

## Phase 3: Inspection Flow

### Task 11: Create Inspection API Routes

**Files:**
- Create: `apps/contractor/src/app/api/inspections/route.ts` (POST)
- Create: `apps/contractor/src/app/api/inspections/[id]/route.ts` (GET, PATCH)
- Create: `apps/contractor/src/app/api/inspections/[id]/classify/route.ts` (POST)
- Create: `apps/contractor/src/app/api/inspections/[id]/generate/route.ts` (POST)
- Create: `apps/contractor/src/app/api/inspections/[id]/finalize/route.ts` (POST)
- Create: `apps/contractor/src/app/api/inspections/[id]/email/route.ts` (POST)

POST `/api/inspections` creates an inspection record. PATCH updates assessment_data. `/classify` triggers Haiku Vision on uploaded photos. `/generate` creates the branded PDF. `/finalize` marks complete and triggers auto-actions (save to documents, advance job status, log activity). `/email` sends to homeowner via Resend.

### Task 12: Build Inspection Flow UI (Steps A-F)

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/inspections/new/page.tsx`
- Create: `apps/contractor/src/components/inspections/inspection-wizard.tsx`
- Create: `apps/contractor/src/components/inspections/step-job-info.tsx`
- Create: `apps/contractor/src/components/inspections/step-assessment.tsx`
- Create: `apps/contractor/src/components/inspections/step-photos.tsx`
- Create: `apps/contractor/src/components/inspections/photo-classification-grid.tsx`
- Create: `apps/contractor/src/components/inspections/step-generate.tsx`
- Create: `apps/contractor/src/components/inspections/step-review.tsx`
- Create: `apps/contractor/src/components/inspections/step-finalized.tsx`

Multi-step client component wizard. Step A: address + job type + HO info. Step B: assessment form (roof details, damage checkboxes with severity, component condition matrix, confidence analysis, general notes). Step C: batch photo upload + AI classification + review grid. Step D: pre-generation summary + generate button. Step E: review data + edit/regenerate buttons. Step F: finalized state with download/email/next-step prompts.

Reference design doc Section 3 for exact field specs.

### Task 13: Build Inspection PDF Generation

**Files:**
- Create: `packages/pdf/src/inspection-pdf.ts`
- Modify: `packages/pdf/src/index.ts` (add export)

Use the existing `@4margin/pdf` template system (`createBrandedDocument`, `addBrandedHeader`, etc.) to generate branded inspection report PDFs containing: header, property info, roof details table, damage assessment, component condition checklist (color-coded), categorized photos, general notes, disclaimer footer.

### Task 14: Build Inspections List Page

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/inspections/page.tsx`

Server component showing all inspections for the company. Table columns: Address, Status, Date, Linked Job. Filter tabs: All / Draft / Complete. "New Inspection" button.

---

## Phase 4: Quote Flow

### Task 15: Create Company Pricing API Route

**Files:**
- Create: `apps/contractor/src/app/api/company/pricing/route.ts` (GET, PUT)

GET returns the company_pricing row (or default values if none exists). PUT upserts pricing configuration.

### Task 16: Build Pricing Settings Tab

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/settings/settings-form.tsx`

Add a "Pricing" tab to the existing settings page. Contains: 3 tier config rows (label, manufacturer dropdown from `manufacturer_product_lines`, product line dropdown, price per square), default line items editor (drag-and-drop reorder, add/remove), add-on templates table.

### Task 17: Create Quote API Routes

**Files:**
- Create: `apps/contractor/src/app/api/quotes/route.ts` (POST)
- Create: `apps/contractor/src/app/api/quotes/[id]/route.ts` (GET, PATCH)
- Create: `apps/contractor/src/app/api/quotes/[id]/generate/route.ts` (POST)
- Create: `apps/contractor/src/app/api/quotes/[id]/email/route.ts` (POST)

### Task 18: Build Quote Flow UI

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/quotes/new/page.tsx`
- Create: `apps/contractor/src/components/quotes/quote-builder.tsx`
- Create: `apps/contractor/src/components/quotes/quote-tier-preview.tsx`
- Create: `apps/contractor/src/components/quotes/quote-addon-editor.tsx`
- Create: `apps/contractor/src/components/quotes/quote-discount-editor.tsx`

Single-page form. Pre-filled from job data. HO name required. EagleView upload. Total squares input. Add-on line items with example placeholder. Discounts. Live 3-column preview (Good/Better/Best). Generate + Save Draft buttons. Post-generation: download + email actions.

Reference design doc Section 4 for exact specs.

### Task 19: Build Quote PDF Generation

**Files:**
- Create: `packages/pdf/src/quote-pdf.ts`
- Modify: `packages/pdf/src/index.ts` (add export)

Three-tier comparison layout. Company branding header. Line item descriptions (no prices). Add-ons with prices. Subtotals, discounts, totals. Standard terms. Disclaimer footer.

### Task 20: Build Quotes List Page

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/quotes/page.tsx`

---

## Phase 5: Policy Decode & Supplement Refinements

### Task 21: Refine Policy Decode Flow (Job Integration)

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/policies/new/page.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/policies/page.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/policies/[id]/page.tsx`

Wire the existing `DecoderFlow` component into the new `/policies/` routes. When `jobId` query param is present, pre-fill carrier, claim number, date of loss from the job. On decode completion, enrich the linked job (homeowner info, carrier, policy number). Add Inspection -> Decode data flow (pass assessment damage context). Generate TWO PDF reports (homeowner-facing + contractor-facing, already supported by `@4margin/pdf`).

Keep existing `/dashboard/policy-decoder/` routes working as redirects to `/dashboard/policies/` for backwards compatibility.

### Task 22: Refine Supplement Flow (Job Integration)

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/new/page.tsx` (or create if new route)

When `jobId` is provided (Path A), show streamlined single-page form with pre-filled data from job. Only estimate upload is required. Pull inspection photos, policy analysis, assessment data, measurements from the job. When no `jobId` (Path B), show existing 4-step wizard.

Add explicit Baltimore pricing disclaimer to all supplement outputs.

---

## Phase 6: Polish & Integration

### Task 23: Wire All Auto-CRM Enrichment

Ensure `findOrCreateJob()` is called from all service entry points (inspection Step A, policy decode submit, quote generate, supplement submit). Verify only empty fields are enriched, never overwritten.

### Task 24: Wire Activity Log

Add `logActivity()` calls to all service completion endpoints (inspection finalize, policy decode complete, supplement generate, quote generate, status changes, data updates).

### Task 25: Wire Job Status Auto-Advancement

When inspection completes: if status is `lead` or `qualified`, advance to `inspected`. When supplement generates: if status is `estimate_received` or earlier, advance to `supplement_sent`. Use `JOB_STATUS_TRANSITIONS` to validate.

### Task 26: Final Build Verification

Run full build: `cd apps/contractor && npx next build`
Verify all routes compile. Test navigation between all pages. Verify sidebar links, "New" button modal, job picker search.

---

*End of implementation plan. Phases 1-6 cover the complete platform workflow redesign. Each phase builds on the previous. Phase 1 is the foundation (no UI dependencies). Phases 2-4 can be partially parallelized after Phase 1 is complete.*
