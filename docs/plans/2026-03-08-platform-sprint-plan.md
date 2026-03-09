# 4Margin Platform Sprint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the finalize/PDF bug, restructure sidebar UI, add zip validation, overhaul dashboard with charts, migrate knowledge base to Supabase with admin editing, add bulk CSV invite, and verify DC consumer leads.

**Architecture:** Eight independent work items executed in priority order. P0 items (bug fix, DC verification) first, then UI restructuring (sidebar, dashboard), then data migration (KB to Supabase), then features (bulk invite). Each task produces a commit.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase PostgreSQL, Tailwind CSS, shadcn/ui, jsPDF, Recharts (new), Sonner toasts

---

## Task 1: Fix Finalize/PDF Generation Bug (P0)

The supplement finalize route works server-side but the client may not be triggering it correctly, or errors are swallowed. The "Generate Supplement" button in `line-items-review.tsx` calls `handleFinalize()` which POSTs to `/api/supplements/[id]/finalize`.

**Files:**
- Debug: `apps/contractor/src/components/supplements/line-items-review.tsx` (handleFinalize ~line 117-147)
- Debug: `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`
- Debug: `apps/contractor/src/lib/pdf/generate-supplement.ts`
- Debug: `apps/contractor/src/lib/pdf/generate-cover-letter.ts`

**Step 1: Add detailed error logging to finalize route**

In `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`, wrap each major section in try/catch with specific error messages. The current outer try/catch loses context of WHERE it fails.

```typescript
// Around PDF generation (~line 225):
let pdfBuffer: ArrayBuffer;
try {
  pdfBuffer = generateSupplementPdf(pdfData);
  console.log("[finalize] Supplement PDF generated:", pdfBuffer.byteLength, "bytes");
} catch (pdfErr) {
  console.error("[finalize] PDF generation failed:", pdfErr);
  return NextResponse.json(
    { error: "Failed to generate supplement PDF", details: String(pdfErr) },
    { status: 500 }
  );
}

// Around storage upload (~line 228):
try {
  const { error: uploadError } = await adminClient.storage
    .from("supplements")
    .upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;
  console.log("[finalize] PDF uploaded to:", pdfPath);
} catch (uploadErr) {
  console.error("[finalize] Storage upload failed:", uploadErr);
  return NextResponse.json(
    { error: "Failed to upload PDF to storage", details: String(uploadErr) },
    { status: 500 }
  );
}

// Same pattern for cover letter generation + upload
```

**Step 2: Add client-side error surfacing to line-items-review.tsx**

In `handleFinalize()` (~line 117-147), ensure errors are visible:

```typescript
const handleFinalize = async () => {
  setFinalizing(true);
  try {
    const res = await fetch(`/api/supplements/${supplementId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedItemIds: Array.from(selected) }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[finalize] Server error:", data);
      toast.error(data.error || `Finalization failed (${res.status})`);
      return;
    }

    toast.success(`Supplement generated — ${data.itemCount} items, $${data.supplementTotal}`);
    router.refresh();
  } catch (err) {
    console.error("[finalize] Network error:", err);
    toast.error("Network error during finalization. Please try again.");
  } finally {
    setFinalizing(false);
  }
};
```

**Step 3: Verify storage bucket exists**

Check Supabase dashboard or run SQL:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'supplements';
```

If missing, the upload will fail silently. Create it:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplements', 'supplements', false)
ON CONFLICT (id) DO NOTHING;
```

Also verify storage RLS policies exist (from migration 017):
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'supplements';
```

**Step 4: Test end-to-end locally**

Run the contractor app, navigate to a supplement with status "complete", select items, click "Generate Supplement". Watch browser console + server logs for the `[finalize]` prefixed messages.

**Step 5: Commit**

```bash
git add apps/contractor/src/app/api/supplements/[id]/finalize/route.ts apps/contractor/src/components/supplements/line-items-review.tsx
git commit -m "fix: add detailed error handling to finalize/PDF generation flow"
```

---

## Task 2: Verify DC Consumer Leads (P0)

Consumer leads code IS wired (20+ references). Verify the infrastructure is in place.

**Files:**
- Check: `apps/contractor/supabase/migrations/022_consumer_leads.sql`
- Check: `apps/decodecoverage/src/app/api/analyze/route.ts`
- Check: `apps/decodecoverage/src/app/api/upload/route.ts`

**Step 1: Verify migration 022 is applied**

Run against Supabase:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'consumer_leads' ORDER BY ordinal_position;
```

If the table doesn't exist, apply migration 022.

**Step 2: Verify consumer-policies storage bucket**

```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'consumer-policies';
```

If missing, create it (migration 022 includes this INSERT).

**Step 3: Verify DC environment variables**

Check that DecodeCoverage has all required env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (NOT the anon key — DC uses service role for writes without RLS)
- `ANTHROPIC_API_KEY` (for policy analysis)
- `RESEND_API_KEY` (for email)

**Step 4: Smoke test DC flow locally**

```bash
cd apps/decodecoverage && npm run dev
```

Navigate to localhost:3001, submit the 3-step form with a test policy PDF, verify:
1. Row created in `consumer_leads` table
2. PDF uploaded to `consumer-policies` bucket
3. Analysis completes (status → "complete")
4. Results page renders at `/results/[id]`

**Step 5: Commit any fixes**

```bash
git commit -m "fix: verify DC consumer leads pipeline end-to-end"
```

---

## Task 3: Sidebar + Button Restructure (P1)

Remove floating "New Decode" from header, move profile avatar to header, add "New Decoder" sidebar nav item.

**Files:**
- Modify: `apps/contractor/src/components/dashboard/shell.tsx`

**Step 1: Remove the "New Decode" floating button from the header**

In `shell.tsx`, find the header section with the "New Decode" link (it's a cyan gradient button linking to `/dashboard/policy-decoder`). Remove it entirely.

Look for something like:
```tsx
<Link href="/dashboard/policy-decoder" className="... bg-gradient-to-br from-[#00BFFF] ...">
  New Decode
</Link>
```

Delete that entire Link element.

**Step 2: Move profile avatar to the header (top-right)**

The profile avatar button is currently in the sidebar header (next to the 4M logo). Move it to the main page header bar where "New Decode" was.

Cut the profile button + dropdown from the sidebar logo area. Paste it into the header area, positioned `ml-auto` (right-aligned).

Keep the dropdown behavior (click to toggle, click-outside to close, shows name/email/company/settings/signout).

**Step 3: Add "New Decoder" nav item in sidebar**

In the nav items array, add a new entry after "Policy Decoder":

```typescript
{
  name: "New Decoder",
  href: "/dashboard/policy-decoder",
  icon: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
}
```

**Step 4: Verify sidebar renders correctly**

Expected sidebar order:
1. Dashboard
2. Supplements
3. New Supplement
4. Policy Decoder
5. New Decoder (NEW)
6. Knowledge Base
7. Settings
8. Enterprise (conditional)
9. Admin (conditional)

Header: page title + profile avatar (right)

**Step 5: TypeScript check + commit**

```bash
npx tsc --noEmit --project apps/contractor/tsconfig.json
git add apps/contractor/src/components/dashboard/shell.tsx
git commit -m "feat: restructure sidebar — move profile to header, add New Decoder nav item"
```

---

## Task 4: Zip Code Validation in Upload Wizard (P1)

Add real-time zip → county lookup in the supplement upload wizard Step 1.

**Files:**
- Modify: `apps/contractor/src/components/wizard/step-estimate.tsx`
- Read: `apps/contractor/src/data/county-jurisdictions.ts` (lookupCountyByZip)

**Step 1: Import lookupCountyByZip in step-estimate.tsx**

```typescript
import { lookupCountyByZip } from "@/data/county-jurisdictions";
import type { CountyJurisdiction } from "@/data/county-jurisdictions";
```

**Step 2: Add county resolution state**

```typescript
const [resolvedCounty, setResolvedCounty] = useState<CountyJurisdiction | null>(null);
const [zipChecked, setZipChecked] = useState(false);
```

**Step 3: Add zip validation effect**

```typescript
useEffect(() => {
  const zip = claimDetails.propertyZip?.trim();
  if (zip && zip.length === 5 && /^\d{5}$/.test(zip)) {
    const county = lookupCountyByZip(zip) || null;
    setResolvedCounty(county);
    setZipChecked(true);
  } else {
    setResolvedCounty(null);
    setZipChecked(false);
  }
}, [claimDetails.propertyZip]);
```

**Step 4: Add county badge below ZIP input**

After the ZIP input field, add:

```tsx
{zipChecked && (
  <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
    resolvedCounty
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-amber-50 text-amber-700 border border-amber-200"
  }`}>
    {resolvedCounty ? (
      <>
        <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {resolvedCounty.county}, {resolvedCounty.state} — Zone {resolvedCounty.climateZone} — {resolvedCounty.state === "DE" ? "2021 IRC" : "2018 IRC"}
      </>
    ) : (
      <>
        <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        Outside coverage area (MD/PA/DE). Supplement will generate without jurisdiction-specific code authority.
      </>
    )}
  </div>
)}
```

**Step 5: TypeScript check + commit**

```bash
npx tsc --noEmit --project apps/contractor/tsconfig.json
git add apps/contractor/src/components/wizard/step-estimate.tsx
git commit -m "feat: add zip code validation with county lookup in upload wizard"
```

---

## Task 5: Install Recharts + Dashboard Overhaul (P2)

Complete rewrite of the dashboard page with KPI cards, charts, activity feed, and period toggles.

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/page.tsx`
- Create: `apps/contractor/src/components/dashboard/dashboard-stats.tsx`
- Create: `apps/contractor/src/components/dashboard/pipeline-chart.tsx`
- Create: `apps/contractor/src/components/dashboard/recovery-chart.tsx`
- Create: `apps/contractor/src/components/dashboard/action-items.tsx`
- Create: `apps/contractor/src/components/dashboard/activity-feed.tsx`

**Step 1: Install Recharts**

```bash
cd apps/contractor && npm install recharts
```

Commit:
```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for dashboard charts"
```

**Step 2: Create dashboard-stats.tsx (KPI cards)**

Client component that receives aggregated data and renders 4 KPI cards:

```typescript
"use client";

interface DashboardStatsProps {
  totalSupplements: number;
  supplementsTrend: number; // +/- vs previous period
  totalRecovery: number;
  recoveryTrend: number;
  approvalRate: number; // 0-100
  approvalTrend: number;
  totalDecodes: number;
  decodesTrend: number;
}
```

Each card: icon, label, big number (formatted), trend arrow (green up / red down), sparkline optional.

Style matching existing app: white cards, rounded-2xl, `boxShadow: "0 4px 14px rgba(0,0,0,0.04)"`, cyan accents.

**Step 3: Create pipeline-chart.tsx (status breakdown)**

Client component using Recharts `<PieChart>` or `<BarChart>`:

```typescript
"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PipelineChartProps {
  data: { status: string; count: number }[];
}
```

Status colors: draft=#94a3b8, generating=#00BFFF, complete=#3b82f6, approved=#10b981, denied=#ef4444.

**Step 4: Create recovery-chart.tsx (monthly trends)**

```typescript
"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";

interface RecoveryChartProps {
  data: { month: string; amount: number; count: number }[];
}
```

Composed chart: bars for dollar amount, line overlay for count. Cyan color scheme.

**Step 5: Create action-items.tsx**

```typescript
"use client";

interface ActionItemsProps {
  stuckGenerating: { id: string; claimName: string; createdAt: string }[];
  needsReview: { id: string; claimName: string; itemCount: number }[];
  pendingPayment: { id: string; claimName: string; total: number }[];
}
```

Lists action items with status badges and links to supplement detail pages.

**Step 6: Create activity-feed.tsx**

```typescript
"use client";

interface ActivityItem {
  id: string;
  type: "created" | "finalized" | "approved" | "denied";
  claimName: string;
  timestamp: string;
  amount?: number;
}
```

Timeline-style feed with relative timestamps ("2 hours ago").

**Step 7: Rewrite dashboard page.tsx**

Server component that:
1. Fetches supplement counts by status (single query with GROUP BY)
2. Fetches supplement totals for KPI cards (SUM, COUNT with date filters)
3. Fetches monthly recovery data (GROUP BY month)
4. Fetches action items (stuck, needs review, pending payment)
5. Fetches recent activity (last 20 supplements ordered by updated_at)
6. Fetches policy decoding counts
7. Passes all data to client components

Add a period toggle (month/quarter/year/all time) as a client-side state that re-fetches via searchParams or client state.

```typescript
// Key queries:
const { data: statusCounts } = await supabase
  .from("supplements")
  .select("status")
  .eq("company_id", user.company_id);

const { data: supplements } = await supabase
  .from("supplements")
  .select("id, supplement_total, status, created_at, updated_at, claims(claim_name, claim_number)")
  .eq("company_id", user.company_id)
  .order("updated_at", { ascending: false });
```

**Step 8: TypeScript check + commit**

```bash
npx tsc --noEmit --project apps/contractor/tsconfig.json
git add apps/contractor/src/app/\(dashboard\)/dashboard/page.tsx apps/contractor/src/components/dashboard/
git commit -m "feat: dashboard overhaul with KPI cards, pipeline chart, recovery trends, activity feed"
```

---

## Task 6: Knowledge Base → Supabase Migration (P2)

Migrate county jurisdictions + building codes from TypeScript files to Supabase tables. Add admin editing UI. Add source URLs to supplement PDF.

### Step 6a: Create migration 035

**Files:**
- Create: `apps/contractor/supabase/migrations/035_knowledge_base_tables.sql`

```sql
-- Knowledge Base tables: county jurisdictions + building codes
-- Replaces TypeScript static data with database-backed records

-- Counties / Jurisdictions
CREATE TABLE kb_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  state VARCHAR(2) NOT NULL CHECK (state IN ('MD', 'PA', 'DE', 'VA', 'DC')),
  climate_zone VARCHAR(4) NOT NULL,
  design_wind_speed INTEGER NOT NULL,
  high_wind_zone BOOLEAN NOT NULL DEFAULT false,
  ice_barrier_requirement VARCHAR(50) NOT NULL,
  permit_required BOOLEAN NOT NULL DEFAULT true,
  permit_fee_range TEXT,
  ahj_name TEXT,
  ahj_phone TEXT,
  ahj_url TEXT,
  permit_notes TEXT,
  local_amendments JSONB DEFAULT '[]',
  fips_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_kb_counties_county_state ON kb_counties (county, state);

-- Building Codes
CREATE TABLE kb_building_codes (
  id TEXT PRIMARY KEY,
  section VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  requirement TEXT NOT NULL,
  justification_text TEXT NOT NULL,
  category VARCHAR(30) NOT NULL,
  xactimate_codes TEXT[] DEFAULT '{}',
  carrier_objection_rate VARCHAR(10) NOT NULL DEFAULT 'medium',
  typical_objection TEXT,
  rebuttal TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: codes × jurisdictions (with source URLs)
CREATE TABLE kb_code_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id TEXT NOT NULL REFERENCES kb_building_codes(id) ON DELETE CASCADE,
  state VARCHAR(2) NOT NULL,
  irc_edition VARCHAR(20) NOT NULL DEFAULT '2018 IRC',
  has_amendment BOOLEAN DEFAULT false,
  amendment_note TEXT,
  source_ref TEXT,
  source_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (code_id, state)
);

-- ZIP → County lookup
CREATE TABLE kb_zip_to_county (
  zip VARCHAR(5) PRIMARY KEY,
  county TEXT NOT NULL,
  state VARCHAR(2) NOT NULL,
  county_id UUID REFERENCES kb_counties(id)
);

-- Indexes
CREATE INDEX idx_kb_code_jurisdictions_state ON kb_code_jurisdictions (state);
CREATE INDEX idx_kb_zip_to_county_state ON kb_zip_to_county (state);
```

### Step 6b: Create seed script

**Files:**
- Create: `apps/contractor/supabase/seed-knowledge-base.ts`

A Node script that reads from the existing TypeScript data files and INSERTs into the new tables:

```typescript
// Read MD_COUNTIES, PA_COUNTIES, DE_COUNTIES, BUILDING_CODES, ZIP_TO_COUNTY
// For each county → INSERT INTO kb_counties
// For each building code → INSERT INTO kb_building_codes
// For each jurisdiction entry → INSERT INTO kb_code_jurisdictions
// For each zip mapping → INSERT INTO kb_zip_to_county (with county_id FK)
```

### Step 6c: Create server actions for KB editing

**Files:**
- Create: `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/actions.ts`

```typescript
"use server";

export async function updateCounty(id: string, data: Partial<CountyUpdate>) { ... }
export async function updateBuildingCode(id: string, data: Partial<CodeUpdate>) { ... }
export async function updateCodeJurisdiction(id: string, data: Partial<JurisdictionUpdate>) { ... }
export async function addSourceUrl(jurisdictionId: string, url: string) { ... }
export async function removeSourceUrl(jurisdictionId: string, url: string) { ... }
```

### Step 6d: Add edit dialogs to codes-tab

**Files:**
- Create: `apps/contractor/src/components/knowledge-base/county-edit-dialog.tsx`
- Create: `apps/contractor/src/components/knowledge-base/code-edit-dialog.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/codes-tab.tsx`

County edit dialog: form with all permit fields + AHJ URL + wind speed + ice barrier requirement.
Code edit dialog: form with requirement, justification, objection/rebuttal, and per-jurisdiction source URLs (array with add/remove).

Add "Edit" buttons (pencil icon) to county header and code expanded rows. Only visible for admin users.

### Step 6e: Update codes-tab to read from Supabase

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/page.tsx`

Change from importing TS constants to fetching from Supabase:

```typescript
const { data: counties } = await supabase.from("kb_counties").select("*").order("state, county");
const { data: codes } = await supabase.from("kb_building_codes").select("*, kb_code_jurisdictions(*)");
```

### Step 6f: Update pipeline to read from Supabase

**Files:**
- Modify: `apps/contractor/src/lib/ai/pipeline.ts`
- Modify: `apps/contractor/src/data/county-jurisdictions.ts` (keep as fallback)

Add a new function `lookupCountyFromDb(zip)` that queries `kb_zip_to_county` → `kb_counties`. Falls back to TS lookup if DB query fails.

### Step 6g: Add source URLs to supplement PDF

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts`
- Modify: `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`

In the finalize route, for each accepted item with an `irc_reference`, query `kb_code_jurisdictions` to get `source_urls`. Pass these URLs into the PDF data.

In the PDF generator, add a "Code Authority References" section at the end of the supporting arguments page listing each IRC section with its source URLs as clickable links.

### Step 6h: Apply migration + seed + commit

```bash
# Apply migration
npx supabase db push

# Run seed script
npx tsx apps/contractor/supabase/seed-knowledge-base.ts

# Verify
npx supabase db dump --schema public | grep kb_

# Commit
git add apps/contractor/supabase/migrations/035_knowledge_base_tables.sql apps/contractor/supabase/seed-knowledge-base.ts apps/contractor/src/
git commit -m "feat: migrate knowledge base to Supabase — admin editing + source URLs on PDFs"
```

---

## Task 7: Bulk Invite via CSV (P3)

Add CSV upload capability to the team invite flow.

**Files:**
- Create: `apps/contractor/src/components/admin/bulk-invite-dialog.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/admin/team-table.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/admin/actions.ts` (add batch invite action)

**Step 1: Create bulk-invite-dialog.tsx**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inviteTeamMember } from "@/app/(dashboard)/dashboard/admin/actions";
import { toast } from "sonner";

interface ParsedRow {
  email: string;
  role: "user" | "admin";
  valid: boolean;
  error?: string;
}

export function BulkInviteDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      // Skip header if present
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const parsed: ParsedRow[] = lines.slice(start).map((line) => {
        const [email, role] = line.split(",").map((s) => s.trim().replace(/"/g, ""));
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const validRole = !role || role === "user" || role === "admin";
        return {
          email,
          role: (role === "admin" ? "admin" : "user") as "user" | "admin",
          valid: validEmail && validRole,
          error: !validEmail ? "Invalid email" : !validRole ? "Role must be user or admin" : undefined,
        };
      });
      setRows(parsed);
      setResults(null);
    };
    reader.readAsText(file);
  }, []);

  const handleSendAll = async () => {
    setSending(true);
    const validRows = rows.filter((r) => r.valid);
    const batchResults: typeof results = [];
    for (const row of validRows) {
      const result = await inviteTeamMember({ email: row.email, role: row.role });
      batchResults.push({
        email: row.email,
        success: !result.error,
        error: result.error || undefined,
      });
    }
    setResults(batchResults);
    setSending(false);
    const sent = batchResults.filter((r) => r.success).length;
    const failed = batchResults.filter((r) => !r.success).length;
    toast.success(`${sent} invites sent${failed > 0 ? `, ${failed} failed` : ""}`);
  };

  // Render: file drop zone → preview table → send button → results summary
}
```

**Step 2: Add "Bulk Import" button to team-table.tsx**

Next to the existing `<InviteDialog />`, add `<BulkInviteDialog />`:

```tsx
<div className="flex items-center gap-2">
  <BulkInviteDialog />
  <InviteDialog />
</div>
```

**Step 3: TypeScript check + commit**

```bash
npx tsc --noEmit --project apps/contractor/tsconfig.json
git add apps/contractor/src/components/admin/bulk-invite-dialog.tsx apps/contractor/src/app/\(dashboard\)/dashboard/admin/team-table.tsx
git commit -m "feat: bulk invite team members via CSV upload"
```

---

## Task 8: DC Consumer Leads Verification (P0 — parallel with Task 2)

This is effectively the same as Task 2. Verify migration, bucket, env vars, smoke test.

**Files:**
- Check: `apps/contractor/supabase/migrations/022_consumer_leads.sql`
- Check: `apps/decodecoverage/src/app/api/upload/route.ts`
- Check: `apps/decodecoverage/src/app/api/analyze/route.ts`

See Task 2 for detailed steps.

---

## Execution Order Summary

| Order | Task | Type | Est. Time |
|-------|------|------|-----------|
| 1 | Task 1: Finalize/PDF bug | Debug + fix | 30-60 min |
| 2 | Task 2: DC leads verify | Verification | 15-30 min |
| 3 | Task 3: Sidebar restructure | UI edit | 20-30 min |
| 4 | Task 4: Zip validation | Feature | 20-30 min |
| 5 | Task 5: Dashboard overhaul | UI rewrite | 2-3 hours |
| 6 | Task 6: KB Supabase migration | Data + feature | 3-4 hours |
| 7 | Task 7: Bulk CSV invite | Feature | 45-60 min |

Tasks 1-4 can be done in one session. Tasks 5-7 are larger and benefit from subagent-driven execution.
