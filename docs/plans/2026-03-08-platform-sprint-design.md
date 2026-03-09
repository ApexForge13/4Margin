# 4Margin Platform Sprint — Design Document

**Date:** 2026-03-08
**Scope:** 8 feature requests spanning bug fixes, new features, UI overhaul, and data migration
**Audience:** Implementation reference

---

## 1. Finalize/PDF Generation Bug Fix (CRITICAL)

**Problem:** Supplement pipeline works (items detected, line items appear, user selects them). But after clicking to build the packet, PDF generation fails silently. User sees "generating" but nothing exports.

**Root cause area:** The finalize route (`POST /api/supplements/[id]/finalize`) — accepts `selectedItemIds`, generates supplement PDF + cover letter, uploads to Supabase storage. Likely failure in:
- PDF generation throwing silently (client swallows error)
- Storage upload failure (bucket permissions or missing bucket)
- Client-side button not calling finalize endpoint correctly
- Response handling not surfacing errors to user

**Approach:** Debug-first using systematic-debugging skill. Check Vercel function logs, test finalize route in isolation, verify `supplements` storage bucket exists, add proper error surfacing to client.

**Files involved:**
- `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts` — server-side finalize
- `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx` — client-side trigger
- `packages/pdf/src/index.ts` — PDF generation
- `apps/contractor/src/lib/pdf/generate-supplement.ts` — supplement PDF builder
- `apps/contractor/src/lib/pdf/generate-cover-letter.ts` — cover letter builder

---

## 2. Consumer Leads — DC Launch Verification

**Finding:** `consumer_leads` IS heavily wired in DecodeCoverage (20+ references across upload, analyze, email, download, unsubscribe routes). The code is connected.

**Potential issues:**
- Migration 022 (`022_consumer_leads.sql`) may not be applied to production Supabase
- `consumer-policies` storage bucket may not exist in production
- DC app not deployed yet

**Approach:** Verify migration applied, verify storage bucket, smoke test DC flow end-to-end. This is deploy checklist, not new code.

---

## 3. Dashboard Overhaul

**Current state:** 3 decoder-focused stat cards + onboarding checklist. Zero supplement data.

**New design — data-rich balanced dashboard:**

### Top Row — 4 KPI Cards (with period toggle)
| Card | Data Source | Details |
|------|-----------|---------|
| Total Supplements | `supplements` count | Sparkline trend, +/- vs previous period |
| Recovery $ | `supplements.supplement_total` sum | Dollar amount, period toggle (month/quarter/year/all) |
| Approval Rate | approved / (approved + denied) | Percentage with color coding |
| Policy Decodes | `policy_decodings` count | Total completed decodes |

### Second Row — Supplement Pipeline
- Status breakdown chart (donut or horizontal bar): draft / generating / complete / approved / denied
- Period toggle shared with KPI cards

### Third Row — Two Columns
- **Left: Action Items** — supplements needing review, stuck generations (>3min), pending payments
- **Right: Recent Activity** — feed of latest supplements created/finalized/approved with timestamps

### Bottom Row — Recovery Trends
- Line/bar chart: supplement $ recovered over time (monthly buckets)
- Overlay with supplement count

**Data sources:** All from existing `supplements`, `supplement_items`, `claims`, `policy_decodings` tables. No new tables needed.

---

## 4. Sidebar + Button Restructure

**Changes:**
1. **Remove** floating "New Decode" button from top-right header bar
2. **Move** profile avatar button to **top-right header** (where "New Decode" was)
3. **Add** "New Decoder" nav item in sidebar below "Policy Decoder"

**Updated sidebar order:**
1. Dashboard
2. Supplements
3. New Supplement (`/dashboard/upload`)
4. Policy Decoder (`/dashboard/policy-decoder`)
5. **New Decoder** (`/dashboard/policy-decoder` — same target, new entry point)
6. Knowledge Base
7. Settings
8. Enterprise (owner only)
9. Admin (admin only)

**Top-right header:** Profile avatar + dropdown (name, email, company, Settings, Sign out)

---

## 5. Zip Code Validation Service

**Current state:** `lookupCountyByZip()` exists in `county-jurisdictions.ts` with hundreds of zip-to-county mappings. Used in pipeline for confidence scoring.

**What's missing:** No validation in the upload wizard. User can enter any zip.

**Enhancement:**
- Add zip validation to upload wizard Step 1 (claim details)
- On zip entry (5 digits), call `lookupCountyByZip()` client-side
- **Found:** Show green badge — "Baltimore County, MD — Zone 4A — 2018 IRC"
- **Not found:** Show yellow warning — "Outside current coverage (MD/PA/DE). Supplement will generate without jurisdiction-specific code authority."
- Store resolved county data in `claims.property_county` (new column) for downstream use

**After KB migration to Supabase (Section 6):** Zip lookup will query DB instead of TS file. For now, import the TS lookup client-side.

---

## 6. Knowledge Base → Supabase Migration + Admin Editing

**Goal:** Move county jurisdictions + building codes from TypeScript files to Supabase tables so admins can edit from the admin panel.

### New Tables

**`kb_counties`**
- `id` UUID PK
- `county` TEXT NOT NULL
- `state` TEXT NOT NULL (MD/PA/DE)
- `climate_zone` TEXT
- `design_wind_speed` INTEGER
- `high_wind_zone` BOOLEAN
- `ice_barrier_requirement` TEXT
- `permit_required` BOOLEAN
- `permit_fee_range` TEXT
- `ahj_name` TEXT
- `ahj_phone` TEXT
- `ahj_url` TEXT
- `permit_notes` TEXT
- `local_amendments` JSONB DEFAULT '[]'
- `fips_code` TEXT UNIQUE
- `created_at` / `updated_at` TIMESTAMPTZ

**`kb_building_codes`**
- `id` TEXT PK (e.g., "irc-r905-2-1")
- `section` TEXT NOT NULL (e.g., "R905.2.1")
- `title` TEXT NOT NULL
- `category` TEXT
- `requirement` TEXT
- `justification_text` TEXT
- `typical_objection` TEXT
- `rebuttal` TEXT
- `carrier_objection_rate` TEXT (high/medium/low)
- `xactimate_codes` TEXT[] DEFAULT '{}'
- `created_at` / `updated_at` TIMESTAMPTZ

**`kb_code_jurisdictions`** (junction)
- `id` UUID PK
- `code_id` TEXT FK → kb_building_codes
- `state` TEXT NOT NULL
- `has_amendment` BOOLEAN DEFAULT false
- `amendment_note` TEXT
- `source_ref` TEXT (legal citation)
- `source_urls` TEXT[] DEFAULT '{}' ← **multiple links per code per state**
- `created_at` / `updated_at` TIMESTAMPTZ

### Admin Editing
- Knowledge Base codes tab: Add "Edit" button per county, per code
- Edit dialog: inline form for all fields including **multiple source URLs** (add/remove URL fields)
- County edit: permit info, AHJ URL, wind speed, ice barrier, amendments
- Code edit: requirement, justification, objection/rebuttal, source URLs per jurisdiction
- All edits write to Supabase via server actions

### Supplement PDF Integration
- When generating supplement PDF, query `kb_code_jurisdictions.source_urls` for each line item's IRC reference
- Include those URLs in "Supporting Documents" / "Code Authority References" section of generated PDF
- Multiple URLs per code section supported (e.g., IRC R905.2.1 adopted by COMAR + local amendment doc)

### Migration Strategy
- Write seed migration that inserts all current TS data into new tables
- Update pipeline/confidence-scorer/codes-tab to read from Supabase instead of TS imports
- Keep TS files as fallback/reference but primary source becomes DB

---

## 7. Bulk Invite via CSV

**Current state:** Single invite dialog (email + role) in admin Team tab.

**Enhancement:**
- Add "Bulk Import" button next to "Invite Member" in Team tab
- Opens dialog with:
  - File drop zone accepting `.csv` files
  - Expected format: `email,role` (role optional, defaults to "user")
  - Preview table showing parsed rows with validation (valid email? valid role?)
  - Error highlighting for invalid rows
  - "Send All Invites" button
- Backend: batch loop over `inviteTeamMember()` for each row
- Results summary: X sent, Y failed (with reasons), Z already members

---

## 8. DC Leads Verification (same as #2)

Part of DC deployment checklist. Verify:
- [ ] Migration 022 applied to Supabase
- [ ] `consumer-policies` storage bucket exists
- [ ] End-to-end smoke test: upload policy → leads row created → analysis runs → results page works → email sends

---

## Implementation Priority Order

| Priority | Item | Type | Effort |
|----------|------|------|--------|
| P0 | #1 Finalize/PDF bug | Bug fix | Small |
| P0 | #2 DC leads verification | Deploy check | Small |
| P1 | #4 Sidebar + button restructure | UI fix | Small |
| P1 | #5 Zip validation | Feature | Small |
| P2 | #3 Dashboard overhaul | UI redesign | Large |
| P2 | #6 KB → Supabase migration | Data + Feature | Large |
| P3 | #7 Bulk invite CSV | Feature | Medium |
