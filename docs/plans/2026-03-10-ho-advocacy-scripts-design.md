# HO Advocacy Scripts — Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

AI-generated homeowner advocacy scripts for two high-value claim scenarios. Each generation produces dual output: contractor talking points (in-app) + HO-facing PDF deliverable.

## Scenarios

### 1. Pre-Inspection Prep (before adjuster arrives)

**Trigger:** `status === "complete"` (supplement analyzed, ready for adjuster)

**Contractor talking points:**
- Items adjusters commonly miss for this claim type
- What to document during the inspection
- Carrier-specific tactics to watch for (from `CARRIER_ENDORSEMENT_FORMS`)
- Policy landmines the HO should be aware of

**HO deliverable PDF:** "Your Upcoming Inspection" guide
- What to expect from the inspection process
- Their rights during the inspection
- Questions to ask the adjuster
- What documentation to keep

### 2. Post-Denial Response (after supplement denied/partially approved)

**Trigger:** `status === "denied" || status === "partially_approved"`

**Contractor talking points:**
- What the denial language actually means
- Re-inspection request strategy
- Appraisal demand process and rights
- DOI complaint path (when to escalate)
- Dollar impact of denied items

**HO deliverable PDF:** "Your Claim Rights" guide
- Plain-English explanation of what happened
- Specific items denied and why they matter (warranty, code compliance)
- Their options: re-inspection, appraisal, DOI complaint
- Next steps timeline

## Generation

Single Claude API call per script, with full claim context injected:

### Data Sources Injected Into Prompt

| Source | Pre-Inspection | Post-Denial |
|--------|:-:|:-:|
| `getLandminesForClaimType()` | Y | Y |
| `FAVORABLE_PROVISIONS` | Y | Y |
| `CARRIER_ENDORSEMENT_FORMS` (carrier-specific) | Y | Y |
| `getClaimTypeFocusPrompt()` | Y | Y |
| County jurisdiction (wind/ice/permits) | Y | Y |
| Building code objection/rebuttals (high-rate) | Y | Y |
| Manufacturer objection/rebuttals | - | Y |
| Denied items + justifications | - | Y |
| `DEPRECIATION_METHODS` impact | Y | Y |
| Supplement line items (detected) | Y | - |

### Claude Response Format

Structured JSON response with sections:

```typescript
interface AdvocacyScript {
  scenario: "pre_inspection" | "post_denial";
  contractorSections: Array<{
    title: string;
    bullets: string[];
  }>;
  hoSections: Array<{
    title: string;
    content: string; // paragraph text for PDF
  }>;
}
```

## Architecture

### API Route

`POST /api/supplements/[id]/advocacy`
- Body: `{ scenario: "pre_inspection" | "post_denial" }`
- Returns: `{ script: AdvocacyScript, pdfUrl: string }`

### Prompt Builder

New file: `apps/contractor/src/lib/ai/advocacy-prompt.ts`
- `buildAdvocacyPrompt(context, scenario)` — assembles full prompt with all data sources
- Reuses `ChatContext`-style pattern from existing chatbot

### PDF Generator

New file: `apps/contractor/src/lib/pdf/generate-advocacy-pdf.ts`
- Branded jsPDF document titled per scenario
- "4Margin — Powered by Your Contractor" branding (not direct 4Margin branding to HO)
- Sections from `hoSections` rendered as titled paragraphs
- Legal disclaimer footer

### UI Component

New file: `apps/contractor/src/components/supplements/advocacy-scripts.tsx`
- Card with scenario-appropriate header
- "Generate Script" button
- Expandable sections showing contractor talking points
- "Download HO Guide" link for PDF

### Storage

PDFs in Supabase Storage: `supplements/{company_id}/{supplementId}/advocacy-{scenario}-{timestamp}.pdf`

No new DB columns — scripts are ephemeral (regenerate anytime).

## UI Placement

On supplement detail page:
- Pre-inspection card: shown after line items review, before download section, when `status === "complete"`
- Post-denial card: shown alongside Rebuttal Tools when `status === "denied" || "partially_approved"`

## Out of Scope

- Post-estimate review scenario (mid-claim)
- Appraisal prep scenario (escalation)
- Conversation state machine / multi-step coaching
- State-specific claim law database (beyond IRC adoption)
- Carrier delay tactics database (beyond endorsement forms)
