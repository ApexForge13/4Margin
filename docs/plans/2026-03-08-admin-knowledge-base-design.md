# Admin Portal + Knowledge Base + Logo Upload — Design Doc

**Date:** 2026-03-08
**Status:** Approved

---

## Overview

Three new capabilities added to the 4Margin contractor app:

1. **Admin Database Browser** — Full table browser with inline editing, CSV export, and SQL query runner
2. **Knowledge Base** — Shared reference library for building codes (by county), manufacturer guidelines, and policy knowledge
3. **Company Logo Upload** — Settings page upload for company logo used in supplement PDFs

---

## 1. Admin Database Browser

### Location
New tab "Database" in admin portal (`/dashboard/admin`, tab index 6).

### UI
- **Table selector** — Dropdown listing all Supabase tables. On select, fetches column metadata from `information_schema.columns`.
- **Data grid** — Paginated table (50 rows/page) with:
  - Sortable columns (click header)
  - Global text search across all fields
  - Column type badges (text, number, boolean, jsonb, timestamptz)
- **Inline editing** — Click any cell to edit:
  - Text → text input
  - Number → number input
  - Boolean → toggle switch
  - JSONB → expandable JSON editor (textarea with syntax highlighting)
  - Timestamp → date/time picker
  - Read-only columns (id, created_at) are visually locked
- **Row operations**:
  - Save button per row (appears on edit)
  - Delete button with confirmation dialog
  - Add row button → auto-generated form from column schema
- **CSV export** — Button exports current view (with search/filter applied) as CSV download
- **SQL query runner** — Expandable panel at top:
  - Raw SQL textarea input
  - Execute button
  - Results displayed in same data grid format
  - Read-only results (no inline edit on query results)

### Data Access
- All reads/writes via admin client (service role, bypasses RLS)
- Confirmation dialog on all mutations (update, delete, insert)

### Safety
- `id` and `created_at` columns are read-only in inline edit
- Delete requires typing "DELETE" to confirm
- SQL runner: SELECT only by default. Must check a "Enable mutations" toggle to run INSERT/UPDATE/DELETE.

---

## 2. Knowledge Base

### Location
New nav item "Knowledge Base" visible to ALL users. Route: `/dashboard/knowledge-base`.
Three sub-tabs: Building Codes, Manufacturer Guidelines, Policy Knowledge.

### 2A. Building Codes (by County)

**Layout:** Left panel (county list) + right panel (codes for selected county).

- Left panel: searchable list of all MD counties (24) + PA counties (14)
- Each county shows: name, IRC version, climate zone
- Click county → right panel shows:
  - County metadata: IRC version, adoption date, climate zone, wind speed, ice barrier requirement, permit info, AHJ contact, local amendments
  - Applicable building codes: table with IRC section, title, requirement, justification text, Xactimate codes, carrier objection rate
  - R905.2.1 status (when added per Task 10 of engine plan)

**Admin features:** Edit button on each code and county record → opens edit dialog. Add Code button.
**User features:** Read-only. Search/filter within county codes.

### 2B. Manufacturer Guidelines

**Layout:** Left panel (manufacturer list) + right panel (requirements).

- Left panel: GAF, CertainTeed (+ OC, IKO when added)
- Click manufacturer → shows:
  - Product lines and warranty tiers
  - Per-requirement table: requirement name, description, mandatory for warranty (boolean), warranty impact, Xactimate code, typical adjuster objection, rebuttal text, source section, source URL (clickable link)
  - Justification matrix entries

**Admin features:** Edit/Add requirement dialogs.
**User features:** Read-only. Search by requirement name or Xactimate code.

### 2C. Policy Knowledge

**Layout:** Tabbed sections within this sub-tab.

- Coverage Sections (from COVERAGE_SECTIONS)
- Landmine Rules (from LANDMINE_RULES)
- Favorable Provisions (from FAVORABLE_PROVISIONS)
- Carrier Endorsement Forms (from CARRIER_ENDORSEMENT_FORMS)
- Base Form Exclusions (from BASE_FORM_EXCLUSIONS)

**All users:** Read-only. This data lives in `@4margin/policy-engine` shared package.
**Admin:** Read-only (data is in shared package, not editable from UI without code change).

### Data Source
All data reads from TypeScript files at build time (server components import directly). When data moves to Supabase tables (Phase 3 of engine plan), the Knowledge Base UI stays the same — just swap the import to a DB query.

---

## 3. Company Logo Upload

### Location
Settings page → Company Information section (existing). New field below existing fields.

### UI
- Drag-and-drop zone or click-to-upload
- Accepts: PNG, JPG, SVG (max 2MB)
- Shows current logo preview (if set) with "Remove" option
- Only visible to owners/admins (same as other company fields)

### Storage
- Supabase Storage bucket: `company-logos`
- Path: `{company_id}/logo.{ext}`
- Returns public URL → saved to `companies.logo_url`

### Usage
- Supplement PDF cover letter header
- Supplement PDF document headers (replaces "4MARGIN" text when logo exists)
- Weather report PDF header

---

## Integration with Supplement Engine v2 Plan

This design complements the existing `docs/plans/2026-03-07-supplement-engine-v2.md`:
- **Task 2** (remove platform branding) will use `logo_url` for contractor-branded PDFs
- **Task 5** (cover letter) will include logo in header
- **Tasks 10-12** (county data, manufacturer data) will be viewable/editable through the Knowledge Base
- **Task 18** (outcome tracking) data will be browsable through the Database Browser

---

## File Inventory (New + Modified)

### New Files
- `apps/contractor/src/app/(dashboard)/dashboard/admin/database-tab.tsx` — Database browser tab
- `apps/contractor/src/app/(dashboard)/dashboard/admin/database-actions.ts` — DB browser server actions
- `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/page.tsx` — Knowledge Base page
- `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/codes-tab.tsx` — Building codes browser
- `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/manufacturers-tab.tsx` — Manufacturer guidelines
- `apps/contractor/src/app/(dashboard)/dashboard/knowledge-base/policy-tab.tsx` — Policy knowledge viewer
- `apps/contractor/src/components/settings/logo-upload.tsx` — Logo upload component

### Modified Files
- `apps/contractor/src/components/dashboard/shell.tsx` — Add Knowledge Base nav item
- `apps/contractor/src/app/(dashboard)/dashboard/admin/admin-tabs.tsx` — Add Database tab
- `apps/contractor/src/app/(dashboard)/dashboard/admin/page.tsx` — Fetch table list for DB browser
- `apps/contractor/src/app/(dashboard)/dashboard/settings/settings-form.tsx` — Add logo upload section
- `apps/contractor/src/app/(dashboard)/dashboard/settings/actions.ts` — Add logo upload/delete actions
