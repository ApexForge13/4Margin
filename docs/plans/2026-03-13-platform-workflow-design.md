# 4Margin Platform Workflow Redesign — Phase 1 Design

**Date:** 2026-03-13
**Status:** Design Document — Blueprint for Implementation
**Author:** 4Margin Engineering

---

## Context

4Margin is a B2B platform for roofing contractors. It currently has a supplement-first architecture: the primary entry point is "New Job" which opens a 4-step wizard (estimate upload, photos, measurements, review) that creates a job record and triggers the supplement pipeline. Policy decoding exists as a separate sidebar item. There is no inspection flow, no quoting capability, and the CRM is tightly coupled to the supplement lifecycle.

The redesign makes the platform **service-agnostic**. Four independent services — Inspection, Policy Decode, Supplement, and Quote — can be used in any order, any combination. Each service passively builds a CRM job record as data accumulates. The job is a container, not a workflow.

### Current State (What Exists Today)

**Navigation sidebar** (from `shell.tsx`):
- Dashboard, Jobs, New Job, Policy Decoder, New Decoder, Documents, Knowledge Base, Settings, Enterprise (role-gated), Admin + Photo Review (admin-only)

**New Job wizard** (from `wizard-context.tsx` / `wizard.ts`):
- Step 1: Upload adjuster estimate PDF + policy PDF, fill claim details (carrier, claim #, property address, date of loss, adjuster info, intake questions)
- Step 2: Upload photos with notes
- Step 3: Upload measurements (EagleView format) with manual entry fields
- Step 4: Name the job, review, submit
- All fields are supplement-centric (estimate is required, measurements are recommended)

**Job type system** (from `job.ts`):
- Types: `insurance | retail | hybrid | repair`
- Statuses: 16-step pipeline from `lead` through `closed_won/closed_lost`
- Separate insurance pipeline (16 stages) and retail pipeline (8 stages)
- JSONB buckets: `insurance_data`, `financials`, `job_metadata`
- Measurement columns on the jobs table (from EagleView migration)

**Passive CRM** (from `auto-create.ts`):
- `findOrCreateJob()` matches by address + city/state, claim number, or homeowner name (fuzzy)
- Only enriches empty fields — never overwrites existing data
- Currently called from supplement wizard and policy decoder

**Policy decoder** (from `decoder-flow.tsx`):
- Standalone flow: upload PDF, optional claim context (damage type, description), payment, AI processing, results
- Links to job via `jobId` when one exists
- Has pre-inspection prep script generation after decode

**Supplement detail page** (from `[id]/page.tsx`):
- Shows status tracker, line items review, policy analysis, weather verification, downloads, photos, claim details, measurements
- Rebuttal tools and advocacy scripts for denied supplements
- Chat co-pilot for supplement refinement

**Database schema** (from migration 039):
- `jobs` table (renamed from `claims`) with full CRM columns
- `policy_decodings` linked to jobs via `job_id`
- `company_documents` table for global document library
- `brand_colors` on companies table

**Photo training pipeline** (from migration 041):
- `training_photos` table with AI classification categories
- Categories: elevation (8-point), roof_overview, damage (subtypes), component (subtypes), interior_damage, install, other
- Haiku Vision classification with confidence scores and contractor review

---

## Design Decisions (from brainstorming session)

These are the exact decisions that were made. Implementation must follow these precisely.

1. **No universal entry point** — any service can be the starting point. Each feeds the job passively.
2. **Job = container** — created automatically the first time any service touches a property address. CRM is fully passive.
3. **Inspection flow**: Address + job type (retail/insurance) -> quick assessment form -> batch photo upload -> AI classifies/organizes photos -> contractor reviews classifications -> generate branded PDF -> review data and regenerate if needed -> finalized PDF (download/email, auto-saved to job)
4. **Photo upload**: Batch upload from camera roll (Phase 1). In-app camera hybrid for future native app.
5. **AI role in inspection**: Phase 1 = classify/organize photos only. No AI recommendations or damage assessment. Contractor fills in assessment manually.
6. **Assessment form before photos**: Contractor fills in observations while fresh, then uploads photos to back it up. Assessment form should include basic notes field for high-level confidence analysis (contractor's gut feel on the claim/job).
7. **Homeowner data**: Minimal at inspection start (address + job type, phone/email optional). For retail: collect HO name after report, before quote. For insurance: parse from policy PDF to auto-fill CRM.
8. **Quote pricing**: Good/Better/Best tiers. Contractor configures manufacturer + product line + price per square for each tier in Settings. Quote shows total squares, add-ons, discounts, and total price only — NO per-square rate, NO line item pricing. Line item descriptions of work included but without prices. **Need a database of manufacturer product lines** so contractors can select from a dropdown rather than free-typing (reduces errors, enables analytics).
9. **Discounts on quotes**: Manual by $ or %, with a reason field shown on quote (e.g., "5% discount for same day decision").
10. **Policy decode in job context**: Contractor uploads policy PDF + provides context (damage type, etc). AI extracts everything possible (homeowner info, carrier, policy details) to auto-fill CRM. Claim number provided later when it exists.
11. **Supplement from existing job**: Pull all known data from job, contractor reviews/edits, uploads estimate, generate. No redundant wizard steps.
12. **Supplement fresh (no job)**: Full 4-step wizard. Estimate + measurements required. Policy strongly recommended with warning messages about decreased efficiency without it.
13. **Job detail page**: Single scrollable page. Timeline/progress tracker fixed at top showing what stages are complete. Collapsible sections below for each service's data.
14. **Edit flow for reports**: Edit the underlying data and regenerate — no WYSIWYG/inline PDF editing.
15. **Each list page** (Inspections, Policies, Supplements, Quotes) has its own "New X" button with same pattern: pick existing job or start fresh.

---

## Section 1: Navigation & Layout

### Current Navigation (being replaced)

```
Dashboard
Jobs                    (/dashboard/supplements)
New Job                 (/dashboard/upload)
Policy Decoder          (/dashboard/policy-decoder)
New Decoder             (/dashboard/policy-decoder/new)
Documents               (/dashboard/documents)
Knowledge Base          (/dashboard/knowledge-base)
Settings                (/dashboard/settings)
Enterprise              (role-gated: owner + enterprise account)
Admin                   (role-gated: admin)
Photo Review            (role-gated: admin)
```

### New Sidebar (top to bottom)

```
1. Dashboard            (/dashboard)
2. Jobs                 (/dashboard/jobs)
3. Inspections          (/dashboard/inspections)
4. Policies             (/dashboard/policies)
5. Supplements          (/dashboard/supplements)
6. Quotes               (/dashboard/quotes)
7. Documents            (/dashboard/documents)
8. Knowledge Base       (/dashboard/knowledge-base)
9. Settings             (/dashboard/settings)
10. Admin               (/dashboard/admin)          — role-gated
11. [Profile icon]      — pinned to sidebar bottom
```

**What was removed:**
- "New Job" and "New Decoder" sidebar items — replaced by the global "New" button
- "Enterprise" — folded into Settings or Admin

**What was added:**
- Inspections, Policies, Quotes as top-level nav items
- Profile/account icon pinned to sidebar bottom (currently in the header as a dropdown; move into the sidebar for consistency)

### Implementation: `shell.tsx` Changes

Update the `navItems` array in `DashboardShell`:

```
navItems = [
  { label: "Dashboard",     href: "/dashboard",               icon: NAV_ICONS.dashboard },
  { label: "Jobs",           href: "/dashboard/jobs",           icon: NAV_ICONS.jobs },
  { label: "Inspections",   href: "/dashboard/inspections",    icon: NAV_ICONS.inspections },
  { label: "Policies",      href: "/dashboard/policies",       icon: NAV_ICONS.policies },
  { label: "Supplements",   href: "/dashboard/supplements",    icon: NAV_ICONS.supplements },
  { label: "Quotes",        href: "/dashboard/quotes",         icon: NAV_ICONS.quotes },
  { label: "Documents",     href: "/dashboard/documents",      icon: NAV_ICONS.documents },
  { label: "Knowledge Base", href: "/dashboard/knowledge-base", icon: NAV_ICONS.knowledgeBase },
  { label: "Settings",      href: "/dashboard/settings",       icon: NAV_ICONS.settings },
  ...(isAdmin ? [{ label: "Admin", href: "/dashboard/admin", icon: NAV_ICONS.admin }] : []),
]
```

New icons needed: `jobs` (briefcase or folder), `inspections` (clipboard-check), `policies` (shield), `quotes` (calculator or receipt).

The profile dropdown currently in the header should be moved to a fixed-bottom section of the sidebar. Show the user's initials in a circular avatar, with the same dropdown (Settings link + Sign Out) on click.

### "New" Button

**Position:** Fixed top-right corner of the main content area, visible on every page. Positioned in the header bar, right side, replacing the current profile icon location (since profile moves to sidebar).

**Behavior:**
1. Click opens a modal/popup with four service choices displayed as cards:
   - **Inspection** — icon + "Start a new roof inspection"
   - **Policy Decode** — icon + "Decode an insurance policy"
   - **Supplement** — icon + "Generate a supplement"
   - **Quote** — icon + "Create a retail quote"

2. **Inspection** path:
   - Shows the same job picker as other services (search + recent jobs + "Start Fresh")
   - Contractor may have already done a supplement, policy decode, etc. on a job and is now doing the inspection — needs to be assignable to existing job
   - "Start Fresh" goes directly to `/dashboard/inspections/new`
   - Select existing job goes to `/dashboard/inspections/new?jobId=xxx`

3. **Policy Decode, Supplement, Quote** paths:
   - Shows a job picker overlay:
     - Search bar at top (searches by property address or homeowner name)
     - List of last 20 recent jobs (most recently updated first)
     - Each job row shows: address, homeowner name (if known), job type badge, last activity date
     - "Start Fresh" button at the bottom
   - **Select existing job** -> navigates to the service flow pre-filled with that job's data
   - **Start Fresh** -> navigates to the service flow with empty state; job created passively

**Implementation notes:**
- Create a `NewServiceModal` component rendered in `shell.tsx`, triggered by the "New" button
- The `JobPicker` sub-component queries `jobs` table filtered by `company_id`, ordered by `updated_at DESC`, limit 20
- Search uses `ilike` on `property_address` and `homeowner_name`

### Route Structure

```
/dashboard/jobs                         — Jobs list (CRM)
/dashboard/jobs/[id]                    — Job detail page

/dashboard/inspections                  — Inspections list
/dashboard/inspections/new              — New inspection (standalone)
/dashboard/inspections/new?jobId=xxx    — New inspection (from existing job)
/dashboard/inspections/[id]             — Inspection detail/edit

/dashboard/policies                     — Policy decodings list
/dashboard/policies/new                 — New decode (standalone)
/dashboard/policies/new?jobId=xxx       — New decode (from existing job)
/dashboard/policies/[id]                — Decode detail

/dashboard/supplements                  — Supplements list
/dashboard/supplements/new              — New supplement (standalone, full wizard)
/dashboard/supplements/new?jobId=xxx    — New supplement (from existing job, streamlined)
/dashboard/supplements/[id]             — Supplement detail (existing page, mostly unchanged)

/dashboard/quotes                       — Quotes list
/dashboard/quotes/new                   — New quote (standalone)
/dashboard/quotes/new?jobId=xxx         — New quote (from existing job)
/dashboard/quotes/[id]                  — Quote detail
```

### List Pages

Each list page (Inspections, Policies, Supplements, Quotes) follows the same pattern:

- **Header:** Title + "New X" button (top-right, follows same existing-job-or-fresh pattern as the global New button)
- **Filters:** Status filter tabs (e.g., All / Draft / Complete / Sent), date range, search
- **Table/Grid:** All items of that type across all jobs for the company
  - Columns: Property address, homeowner name, status, date created, linked job (click to go to job detail)
  - Click a row -> goes to that specific report detail page
  - Breadcrumb in detail view: "Inspections > 123 Main St" with link back to list and to parent job

---

## Section 2: Job Detail Page

### URL
`/dashboard/jobs/[id]`

### Layout

Single scrollable page with two zones:

**Zone 1: Fixed Header/Timeline Area (sticky top)**

This area stays visible as the user scrolls through the collapsible sections below.

**Job Identity:**
- Job name: property address as the primary heading (e.g., "123 Main St, Baltimore MD 21201")
  - If homeowner name is known, show it as subtitle: "John Smith"
  - Editable inline (click to edit)
- **Job type badge:** Retail / Insurance / Hybrid / Repair — colored badge, clickable to change
- **Source badge:** Door Knock / Referral / Inbound / Website / DecodeCoverage Lead / Other — secondary badge
- **Status in pipeline:** Current status label with dropdown to advance (uses existing `JOB_STATUS_TRANSITIONS` from `job.ts`)

**Stage Progress Tracker:**
Horizontal row of four service indicators:

```
[ Inspection ]  ----  [ Policy Decode ]  ----  [ Supplement ]  ----  [ Quote ]
     (check)              (check)              (empty)            (empty)
```

- Each stage shows one of three states:
  - Checkmark (green) — service completed for this job
  - Empty circle (gray) — service not started
  - Dash (—) — service not applicable (e.g., Policy Decode and Supplement for a retail job)
- Each incomplete stage is a clickable link that navigates to start that service for this job (e.g., clicking empty "Supplement" goes to `/dashboard/supplements/new?jobId=xxx`)
- Each completed stage is a clickable link to the most recent report of that type

**Homeowner Info Summary:**
- Compact row: Name | Phone | Email | Address
- Each field is editable inline (click to edit, blur to save)
- Empty fields show placeholder text: "Add phone number"

**Implementation:** Create a `JobHeader` component that receives the full `Job` object plus related service completion status. Use `position: sticky; top: 0;` with a background color and shadow to indicate it's floating.

### Zone 2: Collapsible Sections

Each section is a card that can be expanded/collapsed. Default state: all sections expanded on first load. Sections with no data show a CTA to start that service.

#### Section 2.1: Job Info

**Always visible.** Contains all metadata about the job.

**Property Details:**
- Property address, city, state, ZIP (editable)
- Structure complexity (Simple / Normal / Complex)
- Predominant pitch

**Insurance Data** (shown only if job_type is insurance or hybrid):
- Carrier name (with carrier lookup/autocomplete)
- Claim number
- Policy number
- Date of loss
- Adjuster name, email, phone
- Damage type

**Job Metadata:**
- Intake questions:
  - Gutters nailed through drip edge?
  - Is current roof under manufacturer warranty?
  - Any pre-existing conditions or prior damage?
  - Number of stories?
  - Is there attic access?
  - Any prior insurance claims on the property?
  - Homeowner present during inspection?
  - Are there solar panels on the roof?
  - Is there a satellite dish?
- Adjuster scope notes
- Items believed missing
- Prior supplement history
- General notes (free text)

**Financial Summary** (from `financials` JSONB):
- Estimate amount, supplement requested/approved, deductible, contract price, etc.

All fields are editable inline. Changes save on blur via a PATCH to `/api/jobs/[id]`.

**Implementation:** This replaces the "Claim Details" and "Measurements" cards from the current supplement detail page. Reuse the `Row` component pattern but make fields editable.

#### Section 2.2: Inspection

**If completed:**
- Inspection date
- Assessment summary (roof details, damage observed, component conditions — rendered from `assessment_data` JSONB)
- Photo grid organized by AI category:
  - Category headers (e.g., "Front Elevation", "Hail Damage", "Flashing")
  - 3-4 photos per row, with captions underneath
  - Click photo to expand in a lightbox
- **Accessory count summary**: Total accessories identified from component photos (pipe boots, vents, skylights, etc.) — AI can count these from classified photos to help populate measurement data
- "Download Inspection Report" button (PDF link)
- "Edit & Regenerate" button -> navigates to `/dashboard/inspections/[id]?edit=true`
- Shows which inspection (if multiple): "Inspection #1 — Mar 5, 2026" with dropdown to switch

**If not started:**
- Gray card with clipboard icon
- "No inspection recorded for this job"
- "Start Inspection" CTA button -> navigates to `/dashboard/inspections/new?jobId=xxx`

#### Section 2.3: Policy Decode

**If completed:**
- Overall rating with emoji indicators: Good (gold bar emoji) / Okay (money bag emoji) / Bad (big red X emoji)
- Decode summary: coverage type (RCV vs ACV), deductible, key findings
- Favorable provisions list (bulleted, green highlights)
- Landmine rules list (bulleted, red highlights)
- Carrier notes / battle card (if added by contractor)
- "Download Decode Report" button (PDF link)
- "Edit Notes" button (for carrier notes)
- Pre-inspection prep script (collapsible sub-section)

**If not started (insurance/hybrid job):**
- Shield icon
- "No policy decoded for this job"
- "Start Policy Decode" CTA -> navigates to `/dashboard/policies/new?jobId=xxx`

**If not applicable (retail job):**
- Shown as a grayed-out section (NOT hidden) — contractor may switch from retail to insurance at any time, so all options must remain visible and accessible

#### Section 2.4: Supplement

**If completed:**
- Status badge: Draft / Generating / Complete / Approved / Denied / Partially Approved
- Line items summary table (category, Xactimate code, description, price — condensed view, not the full interactive review)
- Financial summary: supplement total, approved amount (if applicable)
- Links to download: Supplement PDF, Cover Letter, Weather Report, Evidence Appendix, Full ZIP
- "View Full Details" link -> navigates to `/dashboard/supplements/[id]` (the existing supplement detail page)

**If not started (insurance/hybrid job):**
- Document icon
- "No supplement generated for this job"
- "Start Supplement" CTA -> navigates to `/dashboard/supplements/new?jobId=xxx`

**If not applicable (retail job):**
- Shown as a grayed-out section (NOT hidden) — contractor may switch from retail to insurance at any time

#### Section 2.5: Quote

**If completed:**
- Selected tier highlight (if homeowner chose one)
- Three-column summary: Good / Better / Best with manufacturer, product, and total price each
- Discounts applied (with reasons)
- Add-on items
- "Download Quote PDF" button
- "Edit & Regenerate" button -> navigates to `/dashboard/quotes/[id]?edit=true`

**If not started:**
- Calculator icon
- "No quote generated for this job"
- "Generate Quote" CTA -> navigates to `/dashboard/quotes/new?jobId=xxx`

#### Section 2.6: Documents

All files associated with this job, organized by type:

| Category | Source |
|---|---|
| Inspection Reports | Generated PDFs from inspection flow |
| Policy PDFs | Uploaded policy documents |
| Decode Reports | Generated PDFs from policy decode |
| Adjuster Estimates | Uploaded estimate PDFs |
| Supplement PDFs | Generated supplement packages |
| Quote PDFs | Generated quote documents |
| Photos | All inspection/supplement photos |
| Other | Manually uploaded documents |

- Each document shows: filename, type badge, date uploaded, file size
- Click to view/download
- "Upload Document" button at top for manual uploads (any file type)
- Documents are stored in existing `company_documents` table with `job_id` association

#### Section 2.7: Activity Log

Chronological feed of all actions on this job. Auto-generated entries:

- "Job created" — timestamp, source (e.g., "via Inspection flow")
- "Inspection completed" — timestamp, link to report
- "Policy decoded" — timestamp, rating badge, link to decode
- "Supplement generated" — timestamp, total amount, link to supplement
- "Supplement status changed to Approved" — timestamp
- "Quote generated" — timestamp, link to quote
- "Quote emailed to homeowner" — timestamp
- "Homeowner info updated" — timestamp, what changed

**Implementation:** Create a `job_activity_log` table (see Section 9) or use a JSONB array on the jobs table. Server-side: each service endpoint appends an activity entry when it completes.

---

## Section 3: Inspection Flow

### Entry Points

1. Global "New" button -> Inspection
2. Inspections list page -> "New Inspection" button
3. Job detail page -> Inspection section -> "Start Inspection" CTA
4. All three resolve to `/dashboard/inspections/new` (optionally with `?jobId=xxx`)

### Step A: Job Info (Minimal Intake)

**URL:** `/dashboard/inspections/new` (Step A is the first screen)

**Required fields:**
- Property address — text input with Google Places autocomplete (or similar geocoding). When an address is selected, auto-populate city, state, ZIP.
- Job type — toggle or radio: `Retail` / `Insurance`

**Optional fields:**
- Homeowner name
- Homeowner phone
- Homeowner email

**Informational banner:**
- "Order EagleView measurements for this property" — static reminder text with an external link to EagleView's ordering portal. No API integration in Phase 1.

**Pre-fill behavior when `jobId` is provided:**
- Fetch the job record and populate all known fields
- Address, city, state, ZIP from job
- Job type from job
- Homeowner name/phone/email from job
- All fields remain editable

**On "Continue" button click:**
1. Call `findOrCreateJob()` with the address and other provided data
2. Store the returned `jobId` in component state (or URL param) for subsequent steps
3. Navigate to Step B

### Step B: Assessment Form

**URL:** `/dashboard/inspections/new?step=assessment&jobId=xxx` (or managed via client-side state)

This is a structured form the contractor fills in while observations are fresh (before uploading photos). The form is divided into three sub-sections:

**Sub-section: Roof Details**

| Field | Type | Options/Notes |
|---|---|---|
| Approximate squares | Number input | Decimal allowed (e.g., 24.5) |
| Predominant pitch | Dropdown | 2/12 through 16/12, or "Flat", or free text |
| Number of layers | Radio | 1 / 2 / 3+ |
| Shingle type/manufacturer | Free text | "If visible — e.g., GAF Timberline HDZ" |
| Structure complexity | Radio | Simple / Normal / Complex |

**Sub-section: Damage Observed**

Damage type checkboxes (multi-select):
- Hail
- Wind
- Mechanical
- Wear & Tear
- Tree
- Animal
- Other (with free text field)

For each damage type checked, a severity selector appears:
- Minor / Moderate / Severe (radio per damage type)

Free text "Damage notes" field below the checkboxes.

**Sub-section: Component Condition Checklist**

Rate each component as: Good / Fair / Poor / Needs Replacement (radio group per row)

| Component |
|---|
| Shingles |
| Ridge Cap |
| Flashing |
| Pipe Boots |
| Vents |
| Gutters |
| Drip Edge |
| Skylights |
| Chimney |
| Soffit & Fascia |

Any component rated "Needs Replacement" should be highlighted visually.

**Confidence Analysis (high-level gut feel):**
- Dropdown: High Confidence / Moderate Confidence / Low Confidence / Uncertain
- Notes field: "Quick notes on your confidence assessment" (e.g., "Clear hail damage, strong case" or "Mostly wear and tear, might be tough claim")
- This is the contractor's initial read — helps inform strategy downstream

**General Notes:**
- Large free text field (textarea, 4+ rows)
- Placeholder: "Any additional observations, notes for the homeowner, or items to follow up on"

**Data storage:**
All assessment data is stored as a single JSONB object in `inspections.assessment_data`. Structure:

```json
{
  "roof_details": {
    "approximate_squares": 24.5,
    "predominant_pitch": "7/12",
    "number_of_layers": 2,
    "shingle_type": "GAF Timberline HDZ",
    "structure_complexity": "Normal"
  },
  "damage_observed": {
    "types": [
      { "type": "hail", "severity": "moderate" },
      { "type": "wind", "severity": "minor" }
    ],
    "notes": "Hail impacts on south-facing slope..."
  },
  "component_conditions": {
    "shingles": "poor",
    "ridge_cap": "fair",
    "flashing": "needs_replacement",
    "pipe_boots": "needs_replacement",
    "vents": "good",
    "gutters": "fair",
    "drip_edge": "poor",
    "skylights": "good",
    "chimney": "fair",
    "soffit_fascia": "good"
  },
  "confidence_analysis": {
    "level": "high",
    "notes": "Clear hail damage on south-facing slope, strong case"
  },
  "general_notes": "..."
}
```

**On "Continue" button click:**
- Save assessment data to the inspection record (PATCH `/api/inspections/[id]`)
- Navigate to Step C

### Step C: Photo Upload (Batch)

**URL:** `/dashboard/inspections/new?step=photos&jobId=xxx`

**Upload interface:**
- Large drag-and-drop zone (full width, prominent)
- "Or select files" button that opens file picker
- Accept: `image/jpeg, image/png, image/heic` (JPEG, PNG, HEIC)
- Reject: video files — show a toast warning "Video files are not supported. Please upload images only."
- No file count limit in Phase 1 (but show a warning above 50 photos: "Large uploads may take a few minutes to classify")
- Progress bar showing upload progress (X of Y files uploaded)

**Post-upload AI classification:**
Once all files are uploaded to Supabase Storage, trigger classification:

1. For each photo, call the Haiku Vision API (same model/approach as the existing `training_photos` pipeline from migration 041)
2. Categories and subcategories match the training photo taxonomy:
   - `elevation` — subcategories: front, front_left, left, back_left, back, back_right, right, front_right
   - `roof_overview` — no subcategories
   - `damage` — subcategories: hail, wind, mechanical, wear_tear, tree, animal, other
   - `component` — subcategories: flashing, vent, pipe_boot, gutter, drip_edge, skylight, chimney, soffit_fascia, ridge_cap, valley, other
   - `interior_damage` — no subcategories
   - `install` — no subcategories
   - `other` — no subcategories
3. Each photo gets: `ai_category`, `ai_subcategory`, `ai_confidence`
4. Classification runs in parallel (batch all photos, process concurrently with rate limiting)
5. Show a "Classifying photos..." progress indicator while AI processes

**Post-classification review UI:**
Once classification completes, show photos organized by category:

- Category headers (collapsible): "Hail Damage (5)", "Flashing (2)", "Roof Overview (3)", etc.
- **No limit on photos per category** — if there are 8 damage photos that hold value, include all 8. Use all photos that provide value.
- **Elevation photos (all 8+ points) grouped together at the bottom** of the report/grid — they document the property, not specific damage
- Under each category: grid of photos (3-4 per row on desktop, 2 on mobile)
- Each photo card shows:
  - Thumbnail image
  - AI-assigned category + subcategory as a badge
  - Confidence score (show only if < 80%: "Low confidence" warning badge)
  - Dropdown to reclassify (change category/subcategory) — sets `contractor_category` and `contractor_subcategory`
  - "Delete" button (trash icon) — removes photo from inspection
  - "Add caption" text input (click to reveal) — stores in `caption` field
- "Upload More" button at the top to add additional photos

**On "Continue" button click:**
- All photo records are already saved (uploaded to storage, classified, any contractor overrides applied)
- Navigate to Step D

### Step D: Generate Report

**URL:** `/dashboard/inspections/new?step=generate&jobId=xxx`

**Pre-generation review:**
Show a summary of what will go into the report:
- Property info (address, date)
- Roof details from assessment
- Damage summary
- Component conditions (highlight any "Needs Replacement")
- Photo count by category
- General notes

**"Generate Inspection Report" button:**
1. Call `/api/inspections/[id]/generate` which:
   - Fetches company branding (logo, name, colors from `companies` table + `brand_colors`)
   - Fetches inspector name (from `users` table)
   - Assembles all data: assessment, photos (with signed URLs), property info
   - Generates branded PDF containing:
     - **Header:** Company logo, company name, contact info (from company settings)
     - **Property info:** Address, date of inspection, inspector name
     - **Roof details:** All fields from assessment form, formatted as a table
     - **Damage assessment:** Damage types with severities, damage notes
     - **Component condition checklist:** Table with color-coded ratings (green=Good, yellow=Fair, orange=Poor, red=Needs Replacement)
     - **Photos:** Organized by category with category headers. Each photo includes its caption if one was added. Photos sized appropriately (2-3 per row in the PDF)
     - **General notes:** Full text
     - **Footer disclaimer:** "This inspection report is for educational and informational purposes only. It is not a professional engineering assessment, structural analysis, or guarantee of roof condition. Consult a licensed professional for definitive evaluations."
   - Stores PDF in Supabase Storage bucket `inspection-reports`
   - Updates `inspections.report_pdf_url` with the storage path
   - Updates `inspections.status` to `complete`
2. Show generation progress (spinner)
3. On completion, navigate to Step E

### Step E: Review & Edit

**URL:** `/dashboard/inspections/[id]`

Show the generated data (not the PDF — show the structured data in the same format as the job detail page's Inspection section):

- All assessment data rendered in cards
- Photo grid with classifications
- General notes

**Action buttons:**
- "Edit Assessment" -> navigates back to Step B with current data pre-filled
- "Edit Photos" -> navigates back to Step C with current photos/classifications
- "Regenerate Report" -> re-runs PDF generation from updated data
- "Finalize Report" -> marks the report as finalized (no more edits through this flow; future edits go through "Edit & Regenerate" on the job detail page)

### Step F: Finalized Report

After clicking "Finalize Report":

**Success state with actions:**
- "Download PDF" button — direct download link
- "Email to Homeowner" button — if homeowner email is on file:
  - Sends branded email via Resend with PDF attached
  - Email template: company branding, brief message ("Here is your roof inspection report for [address]"), PDF attachment, disclaimer
  - If no email on file: button is disabled with tooltip "Add homeowner email to send"
- Confirmation: "Report saved to job documents"

**Auto-actions on finalization:**
1. PDF auto-saved to job's `company_documents` (category: 'inspection_report')
2. Job status auto-advanced: if currently `lead` or `qualified`, advance to `inspected`
3. Activity log entry: "Inspection completed — [date]"
4. Inspection record linked to job via `inspections.job_id`

**Post-finalization prompts:**
- **If retail job:** Show a card: "Generate a quote for this job?" with a "Create Quote" button -> navigates to `/dashboard/quotes/new?jobId=xxx`
- **If insurance job:** Show a card: "Decode the homeowner's policy?" with a "Start Policy Decode" button -> navigates to `/dashboard/policies/new?jobId=xxx`

---

## Section 4: Quote Flow (Retail)

### Entry Points

1. Global "New" button -> Quote -> job picker
2. Quotes list page -> "New Quote" button -> job picker
3. Job detail page -> Quote section -> "Generate Quote" CTA
4. Post-inspection prompt for retail jobs

### Prerequisites (soft — warning only, not blocking)

- Inspection recommended for accurate square count
- If no inspection data on the job: show yellow banner "No inspection on file. You will need to enter total squares manually."

### Settings Configuration (one-time setup)

**Location:** `/dashboard/settings` -> "Pricing" tab (new)

**Pricing Tiers — each tier has:**

| Field | Type | Notes |
|---|---|---|
| Tier label | Text input | Default: "Good" / "Better" / "Best", editable |
| Manufacturer name | Text input | e.g., "CertainTeed" |
| Product line name | Text input | e.g., "Landmark Pro" |
| Price per square | Currency input | e.g., $450.00 |

**Default Line Item Descriptions:**
These are the standard scope of work descriptions that appear on every quote. They describe the work included — NO prices attached to individual items.

Default list (editable by contractor in Settings):
- Tear-off existing roofing system
- Install synthetic underlayment
- Install starter strip at eaves and rakes
- Install shingles per manufacturer specifications
- Install ridge cap ventilation
- Install ice & water shield per local building code
- Install drip edge at eaves and rakes
- Replace pipe boots and penetration flashings
- Replace step and counter flashing as needed
- Final cleanup and debris haul-off

Contractor can add, remove, or reorder items. Each item is a text string only.

**Add-On Templates (optional):**
Pre-configured add-on items the contractor commonly uses, with default prices:

| Description | Default Price |
|---|---|
| Gutter guards (per LF) | $X.XX |
| Skylight replacement | $X,XXX.XX |
| Ventilation upgrade | $XXX.XX |
| ... | ... |

These appear as quick-add options when building a quote.

### Quote Generation Page

**URL:** `/dashboard/quotes/new?jobId=xxx` (or `/dashboard/quotes/new` for fresh)

**Pre-filled from job (if `jobId` provided):**
- Property address, city, state, ZIP
- Homeowner name (if known)
- Total squares (from `inspections.assessment_data.roof_details.approximate_squares` or from job measurement columns)
- Job type

**If homeowner name is not yet on the job (retail flow):**
- Show prominent fields at top: "Homeowner Name" (required for quote), "Homeowner Phone", "Homeowner Email"
- These are required before generating the quote PDF (name appears on the quote)
- Saving these fields enriches the job CRM record

**EagleView Upload (optional):**
- "Upload EagleView Measurements" button — accepts EagleView PDF, auto-parses measurements into the job
- EagleView upload should be available everywhere: inspection flow, quote flow, supplement flow, and job detail page. Contractor never knows when they'll receive the EagleView report so it needs to be uploadable from any context.
- If measurements are already on the job, show them as pre-filled and editable

**Contractor inputs/adjusts:**

| Field | Type | Notes |
|---|---|---|
| Total squares | Number input | Editable even if pre-filled from inspection |
| Homeowner name | Text input | Required for quote PDF |

**Add-on Line Items:**
- "Add Line Item" button
- Each add-on has:
  - Description (text input or select from add-on templates)
  - Price (currency input)
- Can add as many as needed
- Can remove any add-on
- Show example placeholder text to guide contractors: "e.g., Gutter guards, Skylight replacement, Ventilation upgrade, Siding repair, Gutter replacement, Fascia wrap"

**Discounts:**
- "Add Discount" button
- Each discount has:
  - Type: dropdown — "$ Amount" or "% Percentage"
  - Amount: number input
  - Reason: text input (shown on the quote PDF, e.g., "5% cash discount", "Same-day decision discount")
- Multiple discounts can be stacked
- Can remove any discount

**Live Quote Preview (3 columns: Good / Better / Best):**

Each column shows:
- **Tier name** (from settings, e.g., "Good")
- **Manufacturer + product line** (from settings, e.g., "CertainTeed Landmark")
- **Line item descriptions** — the full list of work included (from Settings default list). Text only, NO prices.
- **Add-on items** — each with description and price
- **Subtotal** — tier base price (squares x price_per_square) + add-ons total. The per-square rate is NEVER shown — only the lump sum.
- **Discounts** — each listed with reason and amount
- **Total price** — bold, large font. Subtotal minus discounts.

The preview updates live as the contractor adjusts squares, add-ons, or discounts.

**Action buttons:**
- "Generate Quote PDF" — generates branded PDF, saves to job
- "Save Draft" — saves quote data without generating PDF

### Quote PDF Layout

Generated via the `@4margin/pdf` package (same PDF generation approach as supplement PDFs).

**Page structure:**
- **Header:** Company logo (left), company name + contact info (right)
- **Quote details:** "Roof Replacement Quote" title, property address, homeowner name, date, quote number (auto-generated)
- **Three-tier comparison** — all three tiers side by side (or stacked on narrow paper):
  - Each tier in its own bordered column/section
  - Tier name as header
  - Manufacturer + product line
  - "Work Included:" followed by bulleted list of line item descriptions (no prices)
  - "Additional Items:" (if any add-ons) with prices
  - Subtotal
  - Discounts with reasons
  - **TOTAL** in large bold text
- **Terms section:** (Phase 2 — configurable in Settings. Phase 1: hardcoded standard terms)
  - "Quote valid for 30 days"
  - "50% deposit required to schedule"
  - "Balance due upon completion"
- **Disclaimer footer:** "This quote is for informational purposes only and does not constitute a binding contract. Final pricing may vary based on actual conditions discovered during installation."
- **Signature lines:** (Phase 2) Homeowner signature + date, Contractor signature + date

**Auto-actions on generation:**
1. PDF stored in Supabase Storage bucket `quotes`
2. PDF URL saved to `quotes.quote_pdf_url`
3. Quote status set to `draft` (until sent to homeowner)
4. Auto-saved to job's `company_documents` (category: 'quote')
5. Activity log entry: "Quote generated — Good: $X / Better: $Y / Best: $Z"

**Post-generation actions:**
- "Download PDF" button
- "Email to Homeowner" button (same pattern as inspection: sends via Resend with branded email + PDF attachment)
  - On email send: quote status changes from `draft` to `sent`
  - Activity log entry: "Quote emailed to homeowner"

---

## Section 5: Policy Decode Flow

### Entry Points

1. Global "New" button -> Policy Decode -> job picker
2. Policies list page -> "New Policy Decode" button -> job picker
3. Job detail page -> Policy section -> "Start Policy Decode" CTA
4. Post-inspection prompt for insurance jobs

### Changes from Current Flow

The current `DecoderFlow` component in `decoder-flow.tsx` handles the full lifecycle: upload -> payment -> processing -> results. The core processing logic stays the same. What changes:

1. **Job integration:** When entered from a job, pre-fill known data and enrich the job on completion
2. **Context fields expanded:** More structured context input (not just damage type + description)
3. **CRM auto-fill on completion:** AI-extracted data from the policy (homeowner name, carrier, etc.) enriches the job

### Flow

**Step 1: Upload & Context**

**URL:** `/dashboard/policies/new?jobId=xxx` or `/dashboard/policies/new`

**If from existing job — pre-filled:**
- Property address (from job)
- Carrier name (from `insurance_data.carrier_id` -> carrier lookup)
- Claim number (from `insurance_data.claim_number`)
- Date of loss (from `insurance_data.date_of_loss`)

**Form fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| Property address | Text + autocomplete | Yes (if no job) | Auto-populated from job if attached |
| Upload policy PDF | File upload (drag-and-drop) | Yes | Same UI as current DecoderFlow |
| Carrier name | Text input | No | AI will extract if not provided |
| Damage type | Dropdown | No | Hail / Wind / Water / Fire / Other / General — same as current `CLAIM_TYPES` |
| Claim number | Text input | No | "Enter when available" placeholder |
| Date of loss | Date picker | No | |
| Specific concerns | Textarea | No | Placeholder: "e.g., Worried about the ACV clause, need to know about the wind/hail deductible" |

**On submit:**
1. If no `jobId`, call `findOrCreateJob()` with the address to create/match
2. Upload PDF to Supabase Storage (same flow as current)
3. Create `policy_decodings` record with `job_id` set
4. Proceed to payment/processing (existing flow unchanged)

**Step 2: AI Processing**

Identical to current flow. Claude Vision parses the full policy document.

**Extraction targets (AI prompt should capture all of these):**
- Homeowner name (named insured)
- Property address (if different from what we have)
- Homeowner phone (if listed)
- Carrier name
- Policy number
- Policy effective dates
- Coverage A (dwelling) limit
- Coverage B (other structures) limit
- Deductible amount and type (flat $ vs %)
- Wind/hail deductible (separate if applicable)
- Replacement Cost (RCV) vs Actual Cash Value (ACV) determination
- Ordinance or law coverage
- Endorsements (form numbers and descriptions)
- Exclusions
- Matching requirements (siding, roof — does policy require matching?)
- Any unusual clauses or riders

**Step 3: Results & Report**

Display decode results on screen (existing `PolicyDecoderResults` component, enhanced):

- **Overall rating badge:** Good / Okay / Bad (existing)
- **Coverage summary card:** Coverage limits, deductibles, RCV vs ACV
- **Favorable provisions** (existing green list)
- **Landmines** (existing red list)
- **Carrier notes field:** Editable textarea for contractor to add notes (saved to `policy_decodings.carrier_notes`)
- **Pre-inspection prep script** (existing `PreInspectionPrep` component)

**New: "Generate Decode Reports" — TWO separate PDF reports:**

1. **Homeowner-Facing Decode Report** — simplified, educational language, branded PDF for the homeowner:
   - Overall policy rating (Good/Okay/Bad with emoji)
   - Coverage summary in plain language
   - Deductible breakdown
   - Key things the homeowner should know
   - Next steps recommendation
   - Disclaimer footer
   - NO internal strategy notes, NO landmine details, NO carrier battle card info

2. **Contractor-Facing Decode Report** — full detailed analysis for internal use:
   - Everything from the on-screen display
   - Favorable provisions with strategy notes
   - Landmine rules with avoidance tactics
   - Carrier battle card
   - Pre-inspection prep script
   - Talking points for the homeowner conversation

- Both stored in `policy-decodes` storage bucket
- Both auto-saved to job documents (tagged as 'decode_homeowner' and 'decode_contractor')

### Auto-CRM Actions (on decode completion)

When the AI returns results, automatically enrich the linked job:

```typescript
// Pseudo-code for the enrichment logic
const enrichmentData = {
  homeowner_name: analysis.namedInsured,        // only if job.homeowner_name is null
  homeowner_phone: analysis.insuredPhone,       // only if job.homeowner_phone is null
  homeowner_email: analysis.insuredEmail,       // only if job.homeowner_email is null
  insurance_data: {
    carrier_id: resolvedCarrierId,              // only if not already set
    policy_number: analysis.policyNumber,       // only if not already set
    // claim_number is NOT set here — comes from contractor
  },
};
// Use the same "only fill empty fields" logic from findOrCreateJob
```

**Activity log entry:** "Policy decoded — [Good/Okay/Bad] rating"

**Post-decode prompts:**
- If insurance job: "Ready to supplement when the adjuster estimate arrives. Upload the estimate to get started." with a "Start Supplement" button
- If job is missing data: show a checklist of what's still needed:
  - "No measurements yet — order EagleView"
  - "No claim number — add when filed"
  - "No inspection photos — schedule inspection"

---

## Section 6: Supplement Flow

### Entry Points

1. Global "New" button -> Supplement -> job picker
2. Supplements list page -> "New Supplement" button -> job picker
3. Job detail page -> Supplement section -> "Start Supplement" CTA

### Path A: From Existing Job (has prior data)

**URL:** `/dashboard/supplements/new?jobId=xxx`

When a `jobId` is provided, the system pulls all known data from the job and presents a streamlined entry form.

**What's already known (pulled from job, displayed as read-only summary at top):**
- Property address, homeowner name, phone, email
- Carrier name, claim number, policy number, date of loss
- Adjuster name, email, phone
- Photos from inspection (if any) — shown as a thumbnail grid with count
- Measurements from job table (if populated) — shown as a summary
- Policy analysis summary (if decoded) — rating badge + key findings
- Assessment data from inspection (if any)
- Intake question answers (if filled)

**Streamlined form (single page, not a multi-step wizard):**

| Section | Fields | Notes |
|---|---|---|
| Estimate Upload | Drag-and-drop for adjuster estimate PDF | **REQUIRED** — this is the one thing that must be new |
| Review Pre-filled Data | All job data shown, all editable | Expand/collapse sections |
| Add Missing Data | Measurements (if not on job yet) | Show empty measurement fields if no data exists |
| Narrative Context | Adjuster scope notes, items believed missing, prior supplement history | May already be filled from job_metadata |
| Intake Questions | Gutters/warranty/pre-existing | May already be answered |

**"Generate Supplement" button:**
1. Creates supplement record linked to `jobId`
2. Uploads estimate PDF to storage
3. Passes all data to the supplement pipeline (existing 10-layer engine)
4. The pipeline now has richer context because it can access:
   - Policy analysis (favorable provisions, coverage type, deductible info)
   - Inspection photos (evidence for supplement arguments)
   - Assessment data (damage types, severities, component conditions)
   - Full measurements
5. Background processing via QStash (existing flow)
6. Redirect to `/dashboard/supplements/[newId]` to watch progress

### Path B: Fresh Entry (no existing job)

**URL:** `/dashboard/supplements/new` (no `jobId` param)

This is the full 4-step wizard, similar to the current flow but with refinements.

**Step 1: Estimate & Claim Details**

| Field | Type | Required | Notes |
|---|---|---|---|
| Upload adjuster estimate PDF | File upload | **REQUIRED** | |
| Upload policy PDF | File upload | **STRONGLY RECOMMENDED** | See warning behavior below |
| Carrier name | Text input | Recommended | AI auto-fills from estimate if possible |
| Claim number | Text input | Recommended | |
| Policy number | Text input | No | |
| Date of loss | Date picker | Recommended | |
| Property address | Text input + autocomplete | **REQUIRED** | |
| Property city | Text input | **REQUIRED** | |
| Property state | Dropdown | **REQUIRED** | |
| Property ZIP | Text input | **REQUIRED** | |
| Adjuster name | Text input | No | |
| Adjuster email | Email input | No | |
| Adjuster phone | Phone input | No | |
| Adjuster scope notes | Textarea | No | |
| Items believed missing | Textarea | No | |
| Prior supplement history | Textarea | No | |
| Gutters nailed through drip edge | Radio: Yes/No/Unknown | No | |
| Roof under warranty | Radio: Yes/No/Unknown | No | |
| Pre-existing conditions | Textarea | No | |

**Policy PDF warning behavior:**
- If contractor clicks "Continue" without uploading a policy:
  - First warning (dismissible): "Policy analysis significantly improves supplement quality. Are you sure you want to continue without a policy?"
  - If they proceed AND no policy exists on the job at all, second warning: "Without a policy on file, supplement efficiency will be reduced as we cannot analyze coverage terms. This may result in weaker justifications."
  - Both warnings are skippable — the supplement still generates without a policy

**Step 2: Photos**

- Upload inspection photos (optional but recommended)
- Same drag-and-drop interface as current wizard Step 2
- If a job already exists for this address and has inspection photos: "This job has X photos from a previous inspection. [View Photos]"

**Step 3: Measurements (REQUIRED in fresh path)**

- Same measurement fields as current wizard Step 3 (from `MeasurementData` type in `wizard.ts`)
- EagleView PDF upload with auto-parse (existing feature)
- Manual entry fallback for all fields
- Pitch breakdown table
- Structure complexity and accessories
- Damage type multi-select
- "Confirm Measurements" checkbox before proceeding

**Step 4: Review & Submit**

- Name the job (text input, auto-suggested from address)
- Summary of all data entered across steps 1-3
- "Submit" button:
  1. Calls `findOrCreateJob()` to create/match the job
  2. Creates supplement record linked to the job
  3. Uploads all files to storage
  4. Triggers the pipeline
  5. Redirects to `/dashboard/supplements/[newId]`

### IMPORTANT: Supplement Logic Revamp Pending

**The supplement pipeline needs a complete logic revamp once Xactimate line item data arrives.** Current status:
- Using Baltimore 3/13/2026 pricing as a **loose guide only** — this MUST be explicitly stated in any output
- The contractor MUST rebuild the supplement in Xactimate on their own — we provide the analysis and justification, NOT the final Xactimate file
- **We cannot break TOS with Verisk** — we will rely on them for multiple data lines (pricing, codes, etc.) so we cannot generate or modify Xactimate files directly
- Full supplement logic revamp is BLOCKED until Xactimate line item descriptions + top 25-50 denied/underpaid items are documented
- When that data arrives, the pipeline will be rebuilt to reference real Xactimate codes and pricing

### Pipeline Execution (no changes to existing engine FOR NOW)

The existing 10-layer supplement pipeline runs unchanged for now (will be revamped with Xactimate data):
1. EagleView Parser
2. Estimate Analyzer
3. Policy Decoder (now has richer input when policy is from a prior decode)
4. Code Engine
5. Waste Calculator
6. Manufacturer Library
7. O&P Calculator
8. Generator
9. Rebuttal Engine
10. Document Assembly

The only change: when the supplement is created from a job that has prior service data, the pipeline receives richer input context (policy analysis, inspection photos, assessment data) through the job record.

### Post-Generation (no changes)

Existing supplement detail page (`/dashboard/supplements/[id]`) handles:
- Line items review with checkboxes
- Finalization and PDF generation
- Cover letter, weather report, evidence appendix generation
- Full ZIP download
- Chat co-pilot
- Rebuttal tools for denials
- Advocacy scripts

---

## Section 7: Passive CRM & Job Auto-Creation

### How Jobs Get Created

A job is created automatically the first time any service touches a property address. The `findOrCreateJob()` function in `apps/contractor/src/lib/jobs/auto-create.ts` already implements this. It is called from:

- Inspection flow (Step A — on "Continue")
- Policy decode flow (Step 1 — on submit)
- Supplement flow (Path B Step 4 — on submit; Path A — job already exists by definition)
- Quote flow (on "Generate Quote")

### Matching Logic (existing, documented for reference)

1. Normalize address: trim whitespace, standardize capitalization
2. Search within company for matches by:
   - Same `property_address` + `property_city` + `property_state`
   - Same `insurance_data.claim_number` (if provided)
   - Homeowner name + address (fuzzy — existing `findMatchingJob` logic)
3. If match found: return existing `jobId`, enrich empty fields
4. If no match: create new job with `job_status = 'lead'`

### Data Enrichment Rules

**Core principle: Never overwrite existing data. Only fill empty fields.**

This is already implemented in `findOrCreateJob()`. The rule applies to all enrichment sources:

| Service | Fields Enriched |
|---|---|
| Inspection | `property_address`, `property_city/state/zip`, `job_type`, assessment data (stored on inspection record, not job), photos (stored on inspection record) |
| Policy Decode | `homeowner_name`, `homeowner_phone`, `homeowner_email`, `insurance_data.carrier_id`, `insurance_data.policy_number`, coverage details |
| Supplement | `insurance_data.claim_number`, `insurance_data.adjuster_*`, `insurance_data.date_of_loss`, measurements (stored on job table) |
| Quote | Does not typically add new data — consumes existing data |

### Job Status Auto-Updates

Services completing should auto-advance job status where logical:

| Event | Status Update Rule |
|---|---|
| Inspection completed | If status is `lead` or `qualified` -> advance to `inspected` |
| Policy decoded | No auto-advance (informational enrichment only) |
| Supplement generated | If status is `estimate_received` or earlier -> advance to `supplement_sent` |
| Quote generated | No auto-advance (retail flow has a simpler pipeline) |

Status transitions use the existing `JOB_STATUS_TRANSITIONS` map from `job.ts` to validate that the transition is allowed.

### Job Types

| Type | Typical Flow | Services Used |
|---|---|---|
| **Retail** | Inspection -> Quote | Inspection, Quote |
| **Insurance** | Inspection -> Policy Decode -> Supplement | Inspection, Policy Decode, Supplement |
| **Hybrid** | Started as one, switched to the other | Any combination |
| **Repair** | Minor work, may not need formal inspection | Any combination |

Job type can be changed at any time from the job detail page (dropdown on the job type badge). Changing from insurance to retail does not delete existing supplement/policy data — it just changes the pipeline display and which stages show as "N/A" on the progress tracker.

---

## Section 8: Settings — Pricing & Branding

### Company Branding (existing — no changes)

Already exists in Settings page:
- Logo upload
- Company name
- Brand colors (primary, secondary) via `companies.brand_colors` JSONB
- Contact info (phone, email, website)
- Applied to all generated PDFs via `@4margin/pdf` package

### Pricing Configuration (NEW)

**New tab in Settings:** "Pricing"

**Good / Better / Best Tiers:**

Each tier row contains:

| Field | Type | Default Value |
|---|---|---|
| Tier label | Text input | "Good" / "Better" / "Best" |
| Manufacturer name | Text input | Empty |
| Product line name | Text input | Empty |
| Price per square | Currency input ($) | Empty |

All three tiers are shown simultaneously. If a tier is not configured (manufacturer/price empty), it will not appear on generated quotes.

**Default Line Item Descriptions:**

Ordered list of text strings. Each is a description of work included in every quote.

Initial defaults (auto-populated on first visit, editable):
1. Tear-off existing roofing system
2. Install synthetic underlayment
3. Install starter strip at eaves and rakes
4. Install shingles per manufacturer specifications
5. Install ridge cap ventilation
6. Install ice & water shield per local building code
7. Install drip edge at eaves and rakes
8. Replace pipe boots and penetration flashings
9. Replace step and counter flashing as needed
10. Final cleanup and debris haul-off

Contractor can:
- Edit any item's text
- Reorder items (drag-and-drop)
- Add new items
- Delete items

**Add-On Templates:**

Table of pre-configured add-on items:

| Description | Default Price | Actions |
|---|---|---|
| (text input) | (currency input) | Delete |

"Add Template" button to add new rows. These appear as quick-select options when building a quote.

**Storage:** All pricing configuration is stored in the `company_pricing` table (one row per company). See Section 9.

---

## Section 9: Data Model Changes

### New Tables

#### `inspections`

```sql
CREATE TABLE inspections (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES users(id),
  status          TEXT        NOT NULL DEFAULT 'draft',
    -- Values: 'draft', 'processing', 'complete'
  assessment_data JSONB       NOT NULL DEFAULT '{}',
    -- Structure documented in Section 3 Step B
  report_pdf_url  TEXT,
    -- Storage path to generated inspection PDF
  inspected_at    TIMESTAMPTZ,
    -- Date/time the inspection was performed (user-provided or defaults to created_at)
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

#### `inspection_photos`

```sql
CREATE TABLE inspection_photos (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id         UUID        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  company_id            UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  storage_path          TEXT        NOT NULL,
  original_filename     TEXT        NOT NULL,
  file_size             INTEGER,
  mime_type             TEXT,
  ai_category           TEXT        NOT NULL DEFAULT 'other',
    -- Values: elevation, roof_overview, damage, component, interior_damage, install, other
  ai_subcategory        TEXT,
    -- Values depend on category (see taxonomy in Section 3 Step C)
  ai_confidence         REAL,
  contractor_category   TEXT,
    -- Set only if contractor overrides AI classification
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

#### `quotes`

```sql
CREATE TABLE quotes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id          UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES users(id),
  status          TEXT        NOT NULL DEFAULT 'draft',
    -- Values: 'draft', 'sent', 'accepted', 'declined'
  total_squares   NUMERIC,
  good_tier       JSONB       NOT NULL DEFAULT '{}',
    -- { manufacturer, product_line, price_per_square, subtotal, total }
  better_tier     JSONB       NOT NULL DEFAULT '{}',
  best_tier       JSONB       NOT NULL DEFAULT '{}',
  add_ons         JSONB       NOT NULL DEFAULT '[]',
    -- [{ description: string, price: number }]
  discounts       JSONB       NOT NULL DEFAULT '[]',
    -- [{ type: '$' | '%', amount: number, reason: string }]
  line_items      JSONB       NOT NULL DEFAULT '[]',
    -- [{ description: string }] — work descriptions (no prices)
  selected_tier   TEXT,
    -- 'good' | 'better' | 'best' — which tier HO chose (nullable)
  quote_pdf_url   TEXT,
  homeowner_name  TEXT,
    -- Denormalized for quote PDF generation (may differ from job if updated)
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

#### `company_pricing`

```sql
CREATE TABLE company_pricing (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  good_tier         JSONB       NOT NULL DEFAULT '{}',
    -- { label, manufacturer, product_line, price_per_square }
  better_tier       JSONB       NOT NULL DEFAULT '{}',
  best_tier         JSONB       NOT NULL DEFAULT '{}',
  default_line_items JSONB      NOT NULL DEFAULT '[]',
    -- [{ description: string }]
  addon_templates   JSONB       NOT NULL DEFAULT '[]',
    -- [{ description: string, default_price: number }]
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

#### `job_activity_log`

```sql
CREATE TABLE job_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users(id),
  action      TEXT        NOT NULL,
    -- e.g., 'inspection_completed', 'policy_decoded', 'supplement_generated',
    --       'quote_generated', 'status_changed', 'data_updated', 'document_uploaded'
  description TEXT        NOT NULL,
    -- Human-readable: "Inspection completed", "Policy decoded — Good rating"
  metadata    JSONB       NOT NULL DEFAULT '{}',
    -- Flexible payload: { inspection_id, rating, old_status, new_status, etc. }
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

### Modified Tables

#### `policy_decodings` — add column

```sql
ALTER TABLE policy_decodings
  ADD COLUMN IF NOT EXISTS damage_context TEXT;
  -- Damage type context for focused analysis (e.g., "hail", "wind")
```

Note: `policy_decodings.job_id` already exists from migration 039. Ensure it is always populated when a decode is linked to a job.

#### `supplements` — no schema changes

The supplements table already has `job_id` (renamed from `claim_id` in migration 039). No structural changes needed. Behavioral change: when a supplement is created from an existing job, the pipeline pulls inspection photos and policy analysis from the job rather than requiring re-upload.

### Storage Buckets (new)

| Bucket | Purpose | RLS |
|---|---|---|
| `inspection-reports` | Generated inspection PDF reports | Company-scoped |
| `inspection-photos` | Photos uploaded during inspections | Company-scoped |
| `quotes` | Generated quote PDFs | Company-scoped |

Existing buckets remain unchanged: `estimates`, `policies`, `supplements`, `photos`, `temp-parsing`.

**Why separate `inspection-photos` from `photos`?** The existing `photos` bucket stores supplement photos (uploaded through the current wizard). Inspection photos have a different lifecycle (classified by AI, organized by category, used across multiple services). Keeping them separate prevents confusion and allows different retention/access policies.

### Migration Numbering

This design requires migrations 042 through 047 (approximate):
- 042: `inspections` table
- 043: `inspection_photos` table
- 044: `quotes` table
- 045: `company_pricing` table
- 046: `job_activity_log` table
- 047: `policy_decodings.damage_context` column + storage bucket creation

---

## Section 10: Service Integration & Data Flow

### How Services Share Data

```
                    ┌──────────────────────┐
                    │  Job (CRM Record)    │
                    │  Passive accumulation │
                    └──────┬───────────────┘
                           │ ▲ ▲ ▲ ▲
          ┌────────────────┘ │ │ │ │
          ▼                  │ │ │ │
     Inspection ─────────────┘ │ │ │
          │                    │ │ │
          ├──► Policy Decode ──┘ │ │
          │         │            │ │
          │         ▼            │ │
          ├──► Supplement ───────┘ │
          │    (uses inspection    │
          │     photos + policy    │
          │     analysis)          │
          │                        │
          └──► Quote ──────────────┘
               (uses squares
                from inspection)

ALL services feed the Passive CRM (Job record)
Inspection feeds into Policy Decode (assessment context)
```

### Specific Data Flows

**Inspection -> Quote:**
- `inspections.assessment_data.roof_details.approximate_squares` pre-fills `quotes.total_squares`
- Component conditions inform what line items are relevant
- Photos are available for contractor reference (not included in quote PDF)

**Inspection -> Supplement:**
- `inspection_photos` referenced by `job_id` — available to the supplement pipeline as evidence
- Assessment damage types and severities provide context for the AI supplement generator
- Measurements from job table (if populated from inspection or EagleView) feed waste/IWS calculators

**Inspection -> Policy Decode:**
- `inspections.assessment_data.damage_observed` provides context for focused decode analysis (damage types and severities help the AI prioritize relevant policy provisions)
- Component conditions from inspection inform which coverage sections to scrutinize
- Assessment confidence level provides context for decode strategy recommendations

**Policy Decode -> Supplement:**
- `policy_decodings.analysis` JSONB contains the full decode
- Favorable provisions become justification arguments in supplement line items
- Landmine rules flag items the supplement should avoid or approach carefully
- RCV vs ACV determination affects whether depreciation arguments are relevant
- Deductible info affects financial calculations

**Policy Decode -> CRM:**
- Homeowner name, phone, email extracted from policy -> fill empty CRM fields on job
- Carrier name + policy number -> fill `insurance_data` on job
- Coverage type (RCV/ACV) stored for downstream use

**All Services -> Job Documents:**
- Every generated PDF is auto-saved to `company_documents` with `job_id` association
- Category tags: 'inspection_report', 'policy_decode', 'supplement', 'quote', 'estimate', 'policy_pdf', 'photo', 'other'

**All Services -> Activity Log:**
- Every service completion writes a `job_activity_log` entry
- Status changes write an activity log entry
- Data updates (homeowner info changed, etc.) write an activity log entry

### API Route Structure (new routes needed)

```
/api/inspections/                   POST — create new inspection
/api/inspections/[id]               GET — fetch inspection data
                                    PATCH — update assessment data, photos, etc.
/api/inspections/[id]/generate      POST — generate inspection PDF
/api/inspections/[id]/finalize      POST — mark as finalized
/api/inspections/[id]/classify      POST — trigger AI photo classification
/api/inspections/[id]/email         POST — email report to homeowner

/api/quotes/                        POST — create new quote
/api/quotes/[id]                    GET — fetch quote data
                                    PATCH — update quote data
/api/quotes/[id]/generate           POST — generate quote PDF
/api/quotes/[id]/email              POST — email quote to homeowner

/api/jobs/[id]                      PATCH — update job data (inline edits)
/api/jobs/[id]/activity             GET — fetch activity log

/api/company/pricing                GET — fetch pricing config
                                    PUT — update pricing config
```

Existing routes that stay unchanged:
- `/api/parse/policy-standalone` — policy decode processing
- `/api/supplements/[id]/finalize` — supplement finalization
- `/api/stripe/*` — payment flows

---

## Section 11: Phase Boundaries

### Phase 1 (Current Build — this document)

**Navigation & Layout:**
- New sidebar with all service categories
- Global "New" button with service picker + job picker
- Profile moved to sidebar bottom

**Job System:**
- Job detail page with sticky header, timeline, collapsible sections
- Job list page with filters
- Activity log per job
- Inline editing on job detail page

**Inspection Flow (NEW):**
- Assessment form (roof details, damage, component conditions)
- Batch photo upload with Haiku Vision classification
- Contractor review/reclassify photos
- Branded PDF generation
- Email to homeowner

**Quote Flow (NEW):**
- Good/Better/Best tier configuration in Settings
- Quote generation with add-ons and discounts
- Branded PDF with three-tier comparison
- Email to homeowner

**Policy Decode Flow (REFINED):**
- Integrated with job picker
- CRM auto-enrichment from AI extraction
- Decode PDF generation
- Existing processing logic unchanged

**Supplement Flow (REFINED):**
- Two paths: from job (streamlined) or fresh (full wizard)
- Policy warnings when no policy uploaded
- Richer pipeline input when job has prior services
- Existing pipeline engine unchanged

**Settings:**
- Pricing configuration (tiers, line items, add-on templates)
- Existing branding settings unchanged

### Phase 2 (Future — not in scope for this build)

- Full retail contracts with e-signature
- Financing options on quotes
- Email integration (send quotes/reports directly from platform with tracking)
- EagleView API integration (order measurements from within app)
- In-app camera for future native app
- WYSIWYG report editing (inline PDF editor)
- Terms & conditions configuration for quotes
- Homeowner portal (shared link for HO to view reports/quotes)
- **Live Xactimate pricing data** — real-time pricing by region, not just Baltimore 3/13 baseline. Currently providing loose estimates based on Baltimore pricing; future integration with Verisk/Xactimate API for accurate regional pricing and line item totals

### Phase 3 (Future — AI advancement)

- AI damage assessment on inspection photos (severity, type, square footage of damage)
- AI recommendations on inspection reports ("Based on photos, we recommend replacing...")
- AI-generated quote scope adjustments based on inspection findings
- Smart quote pricing suggestions based on market data

### What Changes vs What Stays

**Changes:**
- Navigation completely restructured (sidebar items, routes)
- "New Job" wizard replaced by service-specific entry points
- Job detail page redesigned (timeline + collapsible sections)
- New tables: `inspections`, `inspection_photos`, `quotes`, `company_pricing`, `job_activity_log`
- New storage buckets: `inspection-reports`, `inspection-photos`, `quotes`
- New API routes for inspections, quotes, job updates, pricing
- New flows: inspection (6 steps), quote (single page)
- "New" button replaces current "New Job" / "New Decoder" entry points
- Policy decoder refined with job integration and CRM enrichment

**Stays (unchanged):**
- Supplement pipeline engine (10-layer) — no code changes
- Policy decode AI logic (Claude Vision parsing) — no code changes
- Knowledge base (LANDMINE_RULES, FAVORABLE_PROVISIONS, etc.)
- `@4margin/policy-engine` and `@4margin/pdf` packages
- Stripe billing — **pricing model needs rework**: current is $149/supplement, $50/decode with first free. New model under consideration: pay-as-you-go with $10/decode, $50/supplement, plus tier subscriptions. Inspection + quoting + CRM may be free features to drive adoption (cost dependent). Needs business analysis.
- Resend email infrastructure
- Multi-tenant RLS architecture
- All existing API routes (supplement generation, finalization, stripe webhooks, etc.)
- `companies`, `users`, `supplements`, `supplement_items`, `photos`, `carriers` tables
- Supplement detail page (mostly — minor changes to link back to job instead of dashboard)
- Auth flow (login, register)

---

## Section 12: Open Questions — ALL CONFIRMED

All recommendations below have been approved and should be implemented as stated.

1. **Photo storage**: Separate `inspection-photos` bucket. **CONFIRMED.**

2. **Inspection <-> Supplement photo sharing**: Reference by `job_id`, no duplication. **CONFIRMED.**

3. **Multiple inspections per job**: Yes. Most recent shown by default with dropdown for older ones. **CONFIRMED.**

4. **Multiple quotes per job**: Yes, same pattern as inspections. **CONFIRMED.**

5. **Quote PDF template**: All three tiers on one page for easy comparison, overflow to second page if needed. **CONFIRMED.**

6. **Measurement reminders**: Phase 1 = static banner with EagleView link. Phase 2 = API integration. **CONFIRMED.**

---

## Section 13: Manufacturer Product Line Database

Quotes reference manufacturer + product line for each Good/Better/Best tier. Rather than free-text entry (error-prone, inconsistent), we need a **reference database of manufacturer product lines** that contractors can select from.

### `manufacturer_product_lines` table

```sql
CREATE TABLE manufacturer_product_lines (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer    TEXT        NOT NULL,
    -- e.g., "GAF", "CertainTeed", "Owens Corning", "IKO", "Atlas", "Tamko"
  product_line    TEXT        NOT NULL,
    -- e.g., "Timberline HDZ", "Landmark Pro", "Duration"
  tier_level      TEXT,
    -- Suggested tier: "good", "better", "best", "premium" (nullable, advisory only)
  warranty_years  INTEGER,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manufacturer, product_line)
);

-- No RLS needed — this is platform reference data, not company-specific
-- Seed with known product lines from existing manufacturer data in KB
```

### Seed Data Sources
- Existing `src/data/manufacturer-requirements.ts` (GAF, CertainTeed)
- Existing `src/data/manufacturers/` (OC, IKO, Atlas, Tamko)
- Each manufacturer has multiple product lines / tiers

### Usage in Settings
- Pricing tier configuration: manufacturer field becomes a searchable dropdown from this table
- Product line field auto-filters based on selected manufacturer
- Contractor can still type a custom entry if their product isn't listed (with an "Other" option)

---

## Section 14: Running Task Lists

### DecodeCoverage (B2C) Tasks
- Test Canopy Connect sandbox before free trial ends (~10 days from 3/13)
- Fix DC flow and upload issues

### 4Margin (B2B) Tasks
- Apply all changes from this design document + these feedback notes
- Finish Xactimate line item documentation (in progress)
- Verify Knowledge Base data (seed script + spot check)
- Get correct links/screenshots for KB code references to add to supplement evidence
- Revamp supplement logic (BLOCKED on Xactimate data)

### Business Tasks
- Set up bank account
- Set up bookkeeping

### Both Apps
- Merge to real domains (4margin.com + decodecoverage.com)
- Set up info@xyz and support@xyz emails for both
- Better PDFs for all 4M reports and DC homeowner output
- Extensive testing of everything in both sites

---

## Appendix A: TypeScript Types (new)

These types should be created in `apps/contractor/src/types/`:

```typescript
// types/inspection.ts

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
```

```typescript
// types/quote.ts

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
```

```typescript
// types/pricing.ts

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
```

```typescript
// types/activity.ts

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

---

## Appendix B: Component Inventory (new components needed)

### Shell & Navigation
- `NewServiceModal` — global "New" button popup with 4 service cards
- `JobPicker` — search + recent jobs list, used inside NewServiceModal and list page "New X" buttons
- Updated `DashboardShell` — new nav items, profile in sidebar bottom, "New" button in header

### Job Detail Page
- `JobHeader` — sticky header with identity, badges, stage tracker, HO info
- `StageProgressTracker` — horizontal 4-stage service completion indicator
- `JobInfoSection` — collapsible card with editable property/insurance/metadata fields
- `JobInspectionSection` — collapsible card showing inspection summary or CTA
- `JobPolicySection` — collapsible card showing decode summary or CTA
- `JobSupplementSection` — collapsible card showing supplement summary or CTA
- `JobQuoteSection` — collapsible card showing quote summary or CTA
- `JobDocumentsSection` — collapsible card with categorized file list
- `JobActivityLog` — chronological feed of actions
- `InlineEditField` — reusable component for click-to-edit fields

### Inspection Flow
- `InspectionWizard` — multi-step container (manages steps A-F)
- `InspectionJobInfo` — Step A form (address, job type, HO info)
- `InspectionAssessment` — Step B form (roof details, damage, components)
- `InspectionPhotoUpload` — Step C (batch upload + AI classification + review grid)
- `PhotoClassificationGrid` — organized photo grid with reclassification dropdowns
- `InspectionGenerateReview` — Steps D-E (generate + review)
- `InspectionFinalized` — Step F (download, email, next steps)

### Quote Flow
- `QuoteBuilder` — single page form (squares, add-ons, discounts, preview)
- `QuoteTierPreview` — 3-column live preview of Good/Better/Best
- `QuoteAddOnEditor` — add/remove/edit add-on line items
- `QuoteDiscountEditor` — add/remove/edit discount rows

### Settings
- `PricingSettings` — new tab in settings page
- `TierConfigRow` — single tier configuration (label, manufacturer, product, price)
- `LineItemEditor` — ordered list editor for default line items
- `AddonTemplateEditor` — table editor for add-on templates

### Shared/Reusable
- `CollapsibleSection` — card with expand/collapse toggle (used throughout job detail)
- `ServiceCTA` — "Start X" call-to-action card (used in empty job sections)
- `PhotoLightbox` — full-screen photo viewer with navigation
- `BrandedEmailSender` — reusable "Email to Homeowner" button with confirmation

---

*End of design document. This is the complete blueprint for the Phase 1 platform workflow redesign. All implementation should follow the decisions, data models, and flows documented above.*
