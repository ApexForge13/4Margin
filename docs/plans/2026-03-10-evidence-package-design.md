# Evidence Package Generator — Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

Two-part feature: a proactive Evidence Appendix PDF that ships with every supplement ZIP, plus a reactive Rebuttal Letter Generator for denied/partially approved claims.

## Part 1: Evidence Appendix PDF (Proactive)

**Replaces** the current `Justification_Support_Points.pdf` in the download ZIP with a comprehensive evidence document.

### Per-Item Sections

Each accepted supplement line item gets a full evidence block:

1. **Policy Basis** — decoded policy language supporting coverage (from `adjuster_estimate_parsed` policy data)
2. **Code Authority** — IRC section number, full requirement text, and pre-written rebuttal for common adjuster objections (from `building-codes.ts` — `BuildingCode.rebuttal`)
3. **Manufacturer Requirement** — requirement description, warranty impact statement, mandatory flag, and clickable source URL to the install guide (from `manufacturers/` — `ManufacturerRequirement.sourceUrl`)
4. **Jurisdiction** — county name, climate zone, design wind speed, ice barrier requirement, AHJ permit link (from `county-jurisdictions.ts` — `CountyJurisdiction`)
5. **Confidence Indicator** — visual tier badge (HIGH/GOOD/MODERATE) with dimension breakdown

### Generation

- Generated fresh at download time (same pattern as current justification PDF)
- New file: `apps/contractor/src/lib/pdf/generate-evidence-appendix.ts`
- Uses `jsPDF` with existing brand constants
- No new DB columns needed — all data already exists in data files + supplement items
- Replaces `generate-justification.ts` call in the download route

### ZIP Changes

Current ZIP:
```
Adjuster_Estimate.pdf
Supplement_Report.pdf
Cover_Letter.pdf
Weather_Verification_Report.pdf
Justification_Support_Points.pdf    <-- REPLACED
Photos/
```

New ZIP:
```
Adjuster_Estimate.pdf
Supplement_Report.pdf
Cover_Letter.pdf
Weather_Verification_Report.pdf
Evidence_Appendix.pdf               <-- NEW (replaces Justification)
Photos/
```

## Part 2: Rebuttal Letter Generator (Reactive)

### Two Entry Points

1. **Manual Selection** — contractor checks off which items were denied on the supplement detail page, clicks "Generate Rebuttal". System builds a professional letter using stored rebuttal text from `BuildingCode.rebuttal` + `ManufacturerRequirement.rebuttal`.

2. **AI-Powered** — contractor uploads the adjuster's denial letter PDF. Claude extracts denied items and specific denial language, then generates a point-by-point rebuttal matching each denial reason to our evidence data.

### Output

Branded PDF letter on contractor letterhead:
- Date + RE block (claim #, policy #, carrier, property)
- Professional opening paragraph
- Per-denied-item sections:
  - Adjuster's stated reason (if AI-extracted) or generic denial framing
  - Code authority rebuttal with IRC citation
  - Manufacturer requirement rebuttal with source URL
  - Policy language supporting coverage
- Closing paragraph with next-steps language
- Contractor signature block

### UI Placement

New "Rebuttal Tools" card on supplement detail page:
- Shown only when `status === 'denied' || status === 'partially_approved'`
- Contains:
  - Item checklist with checkboxes for denied items
  - "Generate Rebuttal Letter" button (manual path)
  - "Upload Denial Letter" dropzone (AI path)
  - Download link for generated rebuttal PDF

### Storage & Schema

- Rebuttal PDFs stored in Supabase Storage: `supplements/{company_id}/{supplementId}/rebuttal-{timestamp}.pdf`
- New column on `supplements` table: `rebuttal_pdf_url TEXT`
- Migration: `037_rebuttal_support.sql`

### API Routes

- `POST /api/supplements/[id]/rebuttal` — manual path: accepts `{ deniedItemIds: string[] }`, generates rebuttal PDF
- `POST /api/supplements/[id]/rebuttal/ai` — AI path: accepts multipart form with denial letter PDF, extracts denials, generates rebuttal PDF

## Data Sources (Already Exist)

| Source | Field | Used For |
|--------|-------|----------|
| `building-codes.ts` | `BuildingCode.rebuttal` | Pre-written code authority rebuttals |
| `building-codes.ts` | `BuildingCode.typicalObjection` | Adjuster objection framing |
| `manufacturers/*.ts` | `ManufacturerRequirement.rebuttal` | Manufacturer requirement rebuttals |
| `manufacturers/*.ts` | `ManufacturerRequirement.typicalAdjusterObjection` | Objection framing |
| `manufacturers/*.ts` | `ManufacturerRequirement.sourceUrl` | Evidence citation URLs |
| `manufacturers/*.ts` | `ManufacturerRequirement.warrantyImpact` | Warranty language |
| `county-jurisdictions.ts` | `CountyJurisdiction` | Jurisdiction evidence |
| `building-codes.ts` | `ircSectionToUrl()` | Code citation URLs |
| Supplement items | `justification`, `irc_reference`, `confidence_*` | Per-item data |

## Out of Scope (Future)

- DOI complaint templates
- FOIA / records request templates
- Per-item evidence checklist with status tracking UI
- Carrier-specific rebuttal language (covered by separate Carrier Knowledge feature)
