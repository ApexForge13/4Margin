# 4Margin — System Architecture & Technical Deep Dive

**Date:** 2026-03-08
**Audience:** Technical co-founder / CTO hire
**Status:** Living document — reflects system state as of this date

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Policy Decoder](#2-policy-decoder)
3. [Supplement Pipeline](#3-supplement-pipeline)
4. [Intelligence Engine](#4-intelligence-engine)
5. [Code Authority Database](#5-code-authority-database)
6. [Manufacturer Library](#6-manufacturer-library)
7. [Self-Improving Loop](#7-self-improving-loop)
8. [Data Sources & Scraping Strategy](#8-data-sources--scraping-strategy)

---

## 1. System Overview

### What 4Margin Is

4Margin is an AI-powered insurance supplement engine for roofing contractors. When an insurance adjuster underpays a claim (which is nearly every claim), contractors use 4Margin to identify missing line items, generate code-backed justifications, and produce professional supplement documents that recover $2,000–$10,000+ per claim.

There are two products sharing one codebase:

| | **4Margin (B2B)** | **DecodeCoverage (B2C)** |
|---|---|---|
| **Domain** | 4margin.com | decodecoverage.com |
| **User** | Roofing contractors | Homeowners |
| **Purpose** | Generate supplement documents for underpaid claims | Free policy analysis for lead generation |
| **Auth** | Email/password, multi-tenant | None (anonymous) |
| **Revenue** | $149/supplement (first free) | Free — captures leads for B2B funnel |
| **Parser** | Full 10-layer pipeline with code/manufacturer/calculator engines | Policy decoder only (bare parse) |
| **Output** | Supplement PDF + cover letter + weather report | Educational policy report PDF |

### Monorepo Structure

```
4Margin/                          (Turborepo, npm workspaces)
├── apps/
│   ├── contractor/               Next.js 15, port 3000
│   │   ├── src/
│   │   │   ├── app/              App Router pages + API routes
│   │   │   ├── lib/
│   │   │   │   ├── ai/           pipeline.ts, analyze.ts, photos.ts, policy-parser.ts
│   │   │   │   ├── pdf/          generate-supplement.ts, generate-cover-letter.ts, generate-weather-report.ts
│   │   │   │   ├── calculators/  ohp.ts, waste.ts, iws-steep.ts
│   │   │   │   ├── scoring/      confidence.ts
│   │   │   │   ├── weather/      fetch-weather.ts
│   │   │   │   ├── email/        send.ts
│   │   │   │   └── queue/        client.ts (QStash)
│   │   │   └── data/
│   │   │       ├── building-codes.ts           24 IRC codes, MD+PA+DE jurisdictions
│   │   │       ├── county-jurisdictions.ts     43 counties, ZIP→county mapping
│   │   │       ├── manufacturer-requirements.ts GAF + CertainTeed (legacy)
│   │   │       └── manufacturers/              OC, IKO, Atlas, Tamko + unified index
│   │   └── supabase/migrations/  034 migration files
│   │
│   └── decodecoverage/           Next.js 16, port 3001
│       └── src/                  Lighter app — landing, scan form, results, email
│
├── packages/
│   ├── policy-engine/            @4margin/policy-engine — 3-pass AI parser + knowledge base
│   └── pdf/                      @4margin/pdf — consumer PDF generator
│
└── turbo.json
```

### Tech Stack

- **Framework:** Next.js 15 (contractor) / 16 (DecodeCoverage), App Router, TypeScript
- **Database:** Supabase PostgreSQL, multi-tenant via company_id + RLS
- **AI:** Claude Sonnet 4 for analysis/parsing, Claude Haiku 4.5 for document classification
- **PDF:** jsPDF (no external dependencies, runs server-side)
- **Payments:** Stripe ($149/supplement, first free)
- **Email:** Resend (transactional)
- **Background Jobs:** Upstash QStash (HTTP-based job queue with retries)
- **Weather:** Visual Crossing Historical Weather API + NWS alerts
- **Hosting:** Vercel (both apps)
- **Error Tracking:** Sentry
- **UI:** Tailwind CSS + shadcn/ui (contractor), CSS custom properties + Fraunces/DM Sans (DecodeCoverage)

---

## 2. Policy Decoder

### Purpose

Read an insurance policy PDF and extract structured data: coverages, deductibles, exclusions, endorsements, landmine provisions, and favorable provisions. This feeds two products: the B2C decoder (educational overview for homeowners) and the B2B supplement engine (context for line item justification).

### Architecture: 3-Pass Pipeline

The parser uses three sequential Claude API calls with increasing depth:

```
PDF (base64) ──► Pass 1: Document Intelligence (Haiku, fast)
                 └── Classify doc type, extract carrier, form numbers, scan quality

              ──► Pass 2: Full Extraction (Sonnet, 16K tokens)
                 └── Coverages, deductibles, exclusions, endorsements, landmines, favorables
                 └── Claim-type filtering: only relevant landmines for the damage type
                 └── Dec-page detection: marks items `needsVerification: true`

              ──► Pass 3: Verification (Sonnet)
                 └── Re-checks critical fields against original PDF
                 └── Resolves contradictions from Pass 2
                 └── Focused by claim context (e.g., "verify wind/hail deductible")

              ──► Post-Processing (no AI)
                 └── enrichWithCarrierForms() — match form numbers to known carrier database
                 └── calculatePercentageDeductibles() — convert % deductibles to dollars
                 └── sanitizeFavorableProvisions() — remove contradictions
```

### Knowledge Base

The parser is backed by a curated knowledge base that grounds AI extraction in real insurance domain knowledge:

**LANDMINE_RULES** (9 provisions that hurt homeowners):
- `cosmetic_exclusion` — excludes dents that don't crack shingles (kills hail claims)
- `anti_matching` — limits matching of undamaged areas
- `acv_depreciation` — depreciation not recoverable (homeowner eats the cost)
- `roof_age_schedule` — payment reduces based on roof age (10+ years → ACV)
- `sublimit_wind_hail` — separate/higher percentage-based deductible for wind/hail
- `duty_to_cooperate` — non-cooperation = claim denial
- `no_law_ordinance` — code-required upgrades not covered
- `prior_damage_exclusion` — carrier attributes damage to pre-existing conditions
- `assignment_of_benefits` — payment goes to homeowner, not contractor

**FAVORABLE_PROVISIONS** (4 provisions that help homeowners):
- `matching_required` — policy requires uniform appearance (justifies full replacement)
- `code_upgrade_coverage` — Law & Ordinance pays for code-required items
- `overhead_profit` — policy supports contractor O&P when 3+ trades
- `recoverable_depreciation` — RCV basis (depreciation recoverable after repairs)

**CARRIER_ENDORSEMENT_FORMS** — Form number database for State Farm, Erie, Nationwide, Allstate, Travelers, USAA, Farmers, Liberty Mutual. Maps form numbers (e.g., State Farm `HW 08 02`) to their effects (cosmetic exclusion, roof payment schedule, etc.).

**BASE_FORM_EXCLUSIONS** — Standard exclusions by policy form type (HO-3, HO-5, HO-6). Prevents the AI from "discovering" standard exclusions that exist on every policy.

### Output: PolicyAnalysis

```typescript
interface PolicyAnalysis {
  // Policy metadata
  policyType: string;        // "HO-3", "HO-5", etc.
  carrier: string;
  policyNumber: string;
  namedInsured: string;
  propertyAddress: string;

  // Extracted sections
  coverages: PolicyCoverage[];
  deductibles: PolicyDeductible[];        // includes dollarAmount for % deductibles
  depreciationMethod: "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN";
  exclusions: PolicyExclusion[];          // each has severity + needsVerification
  endorsements: PolicyEndorsement[];      // matched to carrier form database

  // Intelligence layer
  landmines: DetectedLandmine[];          // rule-matched provisions that hurt recovery
  favorableProvisions: DetectedFavorable[]; // provisions that support supplement

  // Quality signals
  documentType: "full_policy" | "dec_page_only" | "endorsement_only" | "unknown";
  scanQuality: "good" | "fair" | "poor";
  sectionConfidence: SectionConfidence;   // per-section confidence scores
  riskLevel: "low" | "medium" | "high";
  summaryForContractor: string;           // plain-English summary
}
```

### B2C vs B2B Output

**DecodeCoverage (homeowner sees):**
- Risk badge (HIGH/MEDIUM/LOW)
- Policy health score (A–F grade, 0–100 points)
- Coverage breakdown, deductible analysis, gap detection
- Landmines with action items ("Consider requesting a policy review")
- Favorable provisions as "coverage strengths"
- Download PDF / email report
- Optional opt-in for "free expert review" (lead capture)
- All framed as education — disclaimers on every output

**4Margin (contractor sees):**
- Same parsed data, but integrated into the supplement workflow
- Landmines inform justification strategy (if no L&O coverage, don't push code items)
- Favorable provisions are cited in supplement line items
- Depreciation method drives the 8-column table format (RCV vs ACV vs Modified)
- Policy context injected into the AI detection prompt for smarter item identification

### Current State

- **Working**: 3-pass pipeline, all knowledge bases, carrier form matching, claim-type filtering
- **Gap**: No carrier-specific prompt tuning (State Farm denials differ from Erie denials)

---

## 3. Supplement Pipeline

### Purpose

Take an adjuster's Xactimate estimate PDF + EagleView measurements + policy analysis and produce a complete supplement package: detected missing items with code-backed justifications, cover letter, and weather report.

### 10-Layer Architecture

```
Layer  Name                    Status    What It Does
─────  ────────────────────    ──────    ──────────────────────────────────────────
L1     EagleView Parser        ✅ Done   Parse roof measurements (area, pitch, linear ft)
L2     Estimate Analyzer       ✅ Done   Claude reads adjuster PDF, finds missing items
L3     Policy Decoder          ✅ Done   3-pass policy parsing (see Section 2)
L4     Code Engine             ✅ Done   24 IRC codes, 43 counties, jurisdiction verification
L5     Waste Calculator        ✅ Done   EagleView-based waste % with geometry formula
L6     Manufacturer Library    ✅ Done   6 manufacturers, 48 requirements, prompt injection
L7     O&P Calculator          ✅ Done   10%+10% compounded on full scope, multi-trade
L8     Generator               ✅ Done   Supplement PDF + cover letter + weather report
L9     Rebuttal Engine         🟡 Partial Adjuster objections + rebuttals in manufacturer data
L10    Document Assembly       ✅ Done   Upload to Supabase Storage, email notification
```

### Trigger Flow

```
User clicks "Generate" (after Stripe payment)
    │
    ▼
POST /api/supplements/[id]/generate
    ├── Auth + rate limit check
    ├── Reset supplement state (status="generating", clear old items)
    ├── Set generation_started_at timestamp
    │
    ├── [QStash enabled] → Enqueue async job (3 retries, exponential backoff)
    │                       Return immediately { queued: true, messageId }
    │                       QStash delivers POST to /api/webhooks/qstash/pipeline
    │
    └── [No QStash]     → Run pipeline inline (fire-and-forget)
                          Return immediately { supplementId }
```

### Pipeline Execution (runSupplementPipeline)

```
Step 1: Fetch claim data from DB
Step 2: Download estimate PDF from Supabase Storage → base64
Step 3: Parse policy PDF (if uploaded, not yet parsed)
        └── parsePolicyPdfV2(pdfBase64, claimType, claimDescription)
        └── Store policy_analysis JSONB on supplement record

Step 4: AI Detection — detectMissingItems()
        ├── Fetch commonly missed Xactimate codes from DB
        ├── Build measurements context from EagleView data
        ├── Build building code context (jurisdiction-specific, top 10 codes)
        ├── Build manufacturer context (all 6 manufacturers, 48 requirements)
        ├── Send estimate PDF + full prompt to Claude Sonnet
        ├── Parse JSON response → DetectedItem[]
        ├── Enrich IRC references with jurisdiction verification
        └── Extract claim metadata (claim #, carrier, adjuster, address)

Step 4b: Backfill claim data (from extracted estimate metadata)
Step 4c: Confidence scoring (4-dimension, see Section 4)
Step 4d: Waste calculator (EagleView-based, see Section 4)
Step 4e: IWS steep pitch calculator (see Section 4)

Step 5: Photo analysis (Claude Vision, non-blocking, skipped if >90s elapsed)
Step 6: Insert supplement_items into DB
Step 7: Fetch weather data (Visual Crossing API + NWS alerts)
        └── Generate weather report PDF if verdict = SEVERE or MODERATE
Step 8: Update supplement record (status="complete", all metadata in JSONB)
Step 9: Send "supplement ready" email (fire-and-forget)
```

### AI Detection Prompt Architecture

The prompt sent to Claude Sonnet includes:

1. **System prompt**: Aggressive supplement specialist persona (20 years experience, must find 5+ items minimum)
2. **Estimate PDF**: Sent as base64 document (Claude reads it natively)
3. **Claim context**: Description, adjuster scope notes, contractor-flagged items, damage types
4. **Measurements**: Full EagleView data (area, pitch breakdown, linear measurements, penetrations)
5. **Policy context**: Depreciation method, landmines, favorable provisions, deductible amounts
6. **Building codes**: Top 10 jurisdiction-specific IRC codes with Xactimate mappings
7. **Manufacturer requirements**: All 6 manufacturers' installation requirements with adjuster objections + rebuttals
8. **Xactimate code reference**: Commonly missed codes from DB

Claude returns structured JSON:
```json
{
  "adjuster_total": 12500.00,
  "waste_percent_adjuster": 10,
  "summary": "Adjuster missed starter strip, ice & water shield...",
  "claim_data": { "claim_number": "...", "carrier_name": "...", ... },
  "missing_items": [
    {
      "xactimate_code": "RFG STRSA",
      "description": "Starter strip - asphalt",
      "category": "Roofing",
      "quantity": 185,
      "unit": "LF",
      "unit_price": 1.85,
      "justification": "IRC R905.2.8.5 requires starter strip...",
      "irc_reference": "IRC R905.2.8.5",
      "confidence": 0.95
    }
  ]
}
```

### Finalization (User Review → PDF)

After the pipeline completes, items are in status `detected`. The contractor reviews them in the UI, selects/deselects, then clicks "Finalize":

```
POST /api/supplements/[id]/finalize
    ├── Mark selected items → "accepted", unselected → "rejected"
    ├── Calculate O&P on accepted items (see Section 4)
    ├── Generate supplement PDF (8-col Xactimate table + justification pages)
    ├── Generate cover letter PDF (formal business letter)
    ├── Upload both to Supabase Storage
    ├── Merge O&P calculation into adjuster_estimate_parsed JSONB
    └── Return PDF URLs + O&P data
```

### PDF Output

**Supplement PDF** (multi-page):
- Contractor-branded header (company name, phone, address, license)
- Claim information panel (claim #, policy #, carrier, property, date of loss, adjuster)
- Financial summary (adjuster estimate, supplement amount, revised total)
- 8-column line item table: # | Description | Qty | Unit | Unit Price | RCV | Deprec. | ACV
  - Category grouping with subtotals
  - Grand total row
- Supporting arguments page: per-item justification with IRC citations and accent bars

**Cover Letter** (single page):
- Contractor letterhead
- Formal RE: block with claim details
- 3-paragraph narrative requesting review
- Financial summary box
- Signature block

**Weather Report** (2+ pages, conditional):
- Verdict banner (SEVERE/MODERATE/NONE, color-coded)
- Daily conditions summary (14 metrics)
- Storm events table (if applicable)
- Hourly weather data table with risk highlighting
- Source: Visual Crossing API + NOAA reference

### Current State

- **Working**: Full pipeline, all 10 layers, PDF generation, QStash async, email notifications
- **Bug**: Pipeline returns 0 items on Vercel production — suspected Vercel Fluid Compute timeout (60s cap vs 300s needed). Works locally.
- **Gap**: No retry UI for failed pipelines. No progress streaming to frontend during generation.

---

## 4. Intelligence Engine

### Purpose

Replace the AI's "gut feeling" confidence scores with structured, data-backed scoring. Provide transparent math for waste, O&P, and IWS steep pitch calculations.

### 4.1 Confidence Scorer

Every supplement line item is scored across four dimensions (25 points each, 100 total):

```
Dimension              Max   How It's Calculated
─────────────────────  ────  ──────────────────────────────────────────────
Policy Support         25    Ordinance/Law endorsement (25), RCV coverage (15),
                             ACV (10), unknown (5), policy excludes item (0)

Code Authority         25    Code-required + R905.2.1 confirmed (25),
                             code-required but unverified (15),
                             IRC referenced but not confirmed (10), no basis (0)

Manufacturer Req       25    Required + code-bridged via R905.2.1 (25),
                             warranty-basis only (15),
                             recommended not required (5), no basis (0)

Carrier History        25    >80% approval rate (25), >50% (15),
                             >20% (10), <20% (5),
                             no data = neutral default (12)
```

**Tiers:**
- 85–100: **High** — Strong three-pillar support. Push hard.
- 60–84: **Good** — Include. May need rebuttal.
- 35–59: **Moderate** — Include with documentation. Flag for review.
- 0–34: **Low** — Optional. Contractor decides.

**How it runs in the pipeline:**
1. After `detectMissingItems()` returns, look up county via ZIP
2. Extract policy analysis metadata (ordinance/law, coverage type)
3. For each item, check `getRequirementsForXactimateCode()` against manufacturer database
4. Build `ConfidenceInput` and call `scoreConfidence()`
5. Replace the AI's raw confidence (0–1) with scored confidence (totalScore/100)
6. Store per-item breakdown in `adjuster_estimate_parsed.confidence_details[]`

### 4.2 O&P Calculator

Calculates Overhead & Profit on the **full scope** (adjuster base + supplement), not just the supplement delta.

```
Formula: (1 + overhead) × (1 + profit) - 1 = effective rate
Default: (1 + 0.10) × (1 + 0.10) - 1 = 21% (compounded, not flat 20%)
MD competitive markets: 15% overhead + 10% profit = 26.5%

Full O&P = combined scope base × effective rate
Supplemental O&P = full O&P - O&P already paid by adjuster
```

Multi-trade detection strengthens justification (3+ trades = industry standard for full O&P per Xactimate guidelines).

**Runs at finalization** (not in pipeline) because the accepted items determine the supplement base.

### 4.3 Waste Calculator

Calculates material waste based on EagleView measurements and roof complexity:

```
Waste squares = measured squares × (waste% / 100)
Adjusted squares = measured squares + waste squares
                   (or suggestedSquares from EagleView if available)

Complexity: Simple (≤2 features) | Normal (3-6) | Complex (7+)
Features = hips + valleys + dormers
```

Source attribution includes county name when available (e.g., "EagleView measurement report, Montgomery County standard").

### 4.4 IWS Steep Pitch Calculator

Adjusters calculate Ice & Water Shield coverage assuming a flat roof. On steep roofs, meeting IRC R905.2.8.2's requirement of 24 inches inside the exterior wall line requires significantly more material along the slope.

```
Required slope coverage = 24" / cos(pitch_angle)

Example:
  4/12 pitch (18.4°): 24 / cos(18.4°) = 25.3" along slope
  8/12 pitch (33.7°): 24 / cos(33.7°) = 28.8" along slope
  12/12 pitch (45.0°): 24 / cos(45.0°) = 33.9" along slope

Per-facet calculation:
  Required SF = (required slope inches / 12) × eave LF
  Flat assumption SF = (24 / 12) × eave LF = 2 × eave LF
  Delta SF = required SF - flat assumption SF
```

**Runs in pipeline** when any pitch facet ≥ 7/12 is detected. Distributes total eave LF proportionally by area percentage across pitch facets.

### Current State

- **Working**: All 4 calculators wired into pipeline/finalize. Confidence scorer runs on every item. Results stored in `adjuster_estimate_parsed` JSONB.
- **Gap**: Carrier history dimension defaults to neutral (12/25) — no historical data populated yet. O&P doesn't extract "already paid" amount from adjuster estimate (defaults to 0).

---

## 5. Code Authority Database

### Purpose

Map every code-backed roofing line item to its IRC section, jurisdiction verification, and Xactimate code. When the supplement says "ice & water shield is required," we cite the exact code, edition, and county adoption — not a generic reference.

### Structure

**building-codes.ts** (1,243 lines) — 24 IRC code entries:

| IRC Section | Title | Key Xactimate Codes | Commonly Missed |
|---|---|---|---|
| R905.2.8.5 | Starter Strip | RFG STRSA | Yes |
| R905.2.8.2 | Ice Barrier (IWS) | RFG IWSA | Yes |
| R905.2.7 | Wind Resistance | RFG STRSA | Yes |
| R903.2.1 | Flashing | RFG FLSH | Yes |
| R905.2.6 | Ridge/Hip Cap | RFG RDGC | Yes |
| R905.2.8.3 | Underlayment | RFG FELT | No |
| R903.4 | Drip Edge | RFG DRPE | Yes |
| R903.2.2 | Chimney/Wall Flashing | RFG STPF | No |
| R903.2.2-CRICKET | Chimney Cricket | RFG CRKT | Yes |
| R806.1 | Ventilation | RFG RDGV, RFG SOFV | Yes |
| R806.2 | Min Vent Area | RFG SOFV, RFG BFFL | No |
| R105.1 | Permits | PERMIT | Yes |
| R908.3 | Tear-off | RFG TEAR, RFG REMV | No |
| R905.1.1 | Fire Classification | RFG SHGL | No |
| R301.2.1 | Wind Design Criteria | (drives fastener pattern) | No |
| ... | (24 total) | | |

Each code entry includes:
- Multiple `jurisdictions[]` with state, IRC edition, amendment status, source reference
- `xactimateCodePrimary` + `xactimateCodesRelated[]`
- `typicalJustification` text
- `commonlyMissedByAdjusters` boolean

**Three jurisdictions verified:**
- **Maryland** — 2018 IRC via COMAR 09.12.01 (statewide, all 24 counties)
- **Pennsylvania** — 2018 IRC via Uniform Construction Code (statewide, 16 southern counties tracked)
- **Delaware** — 2021 IRC (county-level adoption: New Castle Jan 2024, Sussex Jan 2023)

### County-Level Data

**county-jurisdictions.ts** (2,068 lines) — 43 counties:

Each `CountyJurisdiction` includes:
- Climate zone (4A, 5A, 6A) — drives ice barrier scope
- Design wind speed (mph, per ASCE 7-16) — drives nail pattern (4 vs 6)
- High wind zone flag (≥120 mph)
- Ice barrier requirement scope (eaves only, eaves+valleys+penetrations, extended)
- Permit info (required, fee range, AHJ name, contact URL)
- FIPS code
- Local amendments

**ZIP-to-county mapping** — ~500 ZIP codes across MD, PA, DE mapped to counties via `lookupCountyByZip(zip)`.

### How It's Used

1. **In the AI prompt**: `buildCodeContextForPrompt(state)` generates a formatted section of the top 10 jurisdiction-specific codes, injected into the Claude detection prompt
2. **After detection**: `enrichIrcReference(ref, state)` verifies each item's IRC citation against the database, marking it `irc_verified: true` with `irc_source_ref` (e.g., "COMAR 09.12.01; 2018 IRC R905.2.8.5")
3. **In confidence scoring**: Verified codes score 25/25 on Code Authority dimension; unverified score 10-15

### Current State

- **Working**: 24 codes, 43 counties, 3 jurisdictions, ZIP lookup, prompt injection, IRC enrichment
- **Gap**: No R905.2.1 as dedicated per-county field (global adoption assumed). No screenshot references to source documents. DC and VA not yet added.

---

## 6. Manufacturer Library

### Purpose

Map shingle manufacturer installation requirements to Xactimate codes. When an adjuster denies a line item, we cite the exact manufacturer requirement, the warranty implication, and a pre-written rebuttal.

### Architecture

Modular file structure — one file per manufacturer, unified index:

```
src/data/
├── manufacturer-requirements.ts   GAF (9 reqs) + CertainTeed (6 reqs) + JUSTIFICATION_MATRIX
└── manufacturers/
    ├── index.ts                   Unified lookups across all 6
    ├── owens-corning.ts           9 reqs, 5 warranty tiers, SureNail Technology
    ├── iko.ts                     8 reqs, 3 warranty tiers, ArmourZone nailing
    ├── atlas.ts                   8 reqs, 3 warranty tiers, Scotchgard Protector
    └── tamko.ts                   8 reqs, 2 warranty tiers, WeatherBond warranty
```

### Manufacturer Interface

```typescript
interface Manufacturer {
  name: string;
  website: string;
  productLines: ProductLine[];        // name, seriesName, windRating, impactRating, warranty
  installationRequirements: ManufacturerRequirement[];
  warrantyTiers: WarrantyTier[];      // name, duration, requirements, warrantyVoidLanguage
}

interface ManufacturerRequirement {
  id: string;                         // e.g., "GAF-REQ-001"
  requirement: string;                // "Starter Strip Installation"
  description: string;                // Full requirement text
  xactimateCode: string;             // "RFG STRSA"
  mandatoryForWarranty: boolean;
  warrantyImpact: string;
  sourceSection: string;              // "Installation Instructions, Section 4.2"
  sourceUrl: string;
  commonlyMissedByAdjusters: boolean;
  typicalAdjusterObjection: string;   // "Already included in shingle price"
  rebuttal: string;                   // "GAF specifically requires separate starter strip..."
}
```

### Coverage: 6 Manufacturers, 48 Requirements

| Manufacturer | Reqs | Key Differentiator |
|---|---|---|
| GAF | 9 | HDZ system, StrikeZone nailing area, ProStart starter |
| CertainTeed | 6 | NorthGate impact resistant, Integrity Roof System |
| Owens Corning | 9 | SureNail Technology, TotalProtection warranty |
| IKO | 8 | ArmourZone nailing, Dynasty Performance |
| Atlas | 8 | Scotchgard Protector, HP42 underlayment |
| Tamko | 8 | WeatherBond warranty, Titan XT high wind |

### How It's Used

1. **In the AI prompt**: `buildManufacturerContextForPrompt(name?)` generates a formatted section with all requirements, objections, and rebuttals — injected into the Claude detection prompt
2. **In confidence scoring**: `getRequirementsForXactimateCode(code)` checks if a detected item's Xactimate code matches any manufacturer requirement. Match = 15-25 pts on Manufacturer dimension.
3. **In justifications**: AI cites manufacturer requirements in line item justifications (e.g., "GAF requires separate starter strip per Installation Instructions Section 4.2")

### Current State

- **Working**: All 6 manufacturers with product lines, requirements, warranty tiers, rebuttals. Modular architecture. Wired into AI prompt and confidence scorer.
- **Gap**: JUSTIFICATION_MATRIX in legacy file only covers GAF + CertainTeed (not expanded for OC/IKO/Atlas/Tamko). No automated updates from manufacturer website changes.

---

## 7. Self-Improving Loop

### Concept

Every supplement 4Margin generates creates a data point. When the adjuster responds (approved, partially approved, denied), that outcome feeds back into the system. Over time:

- Confidence scoring gets smarter (carrier-specific approval rates)
- Rebuttal scripts improve (what actually works against which carrier)
- Pricing calibrates (what unit prices get approved vs rejected)
- Regional patterns emerge (County X carrier Y always denies item Z)

### Architecture: Outcome Tracking Schema (Migration 034)

```
supplement_outcomes      (per supplement)
├── carrier_name, county_name
├── outcome: approved | partially_approved | denied | pending
├── amount_requested, amount_approved
├── denial_reason, denial_letter_url
│
└── item_outcomes        (per line item)
    ├── xactimate_code, category, carrier_name, county_name
    ├── outcome: approved | partially_approved | denied
    ├── amount_requested, amount_approved
    ├── denial_language
    ├── rebuttal_submitted, rebuttal_text, rebuttal_outcome
    └── confidence_score, confidence_tier (at time of submission)

carrier_patterns         (aggregated intelligence)
├── carrier_name × xactimate_code × county_name (unique)
├── total_submissions, total_approved, total_denied
├── approval_rate (0.0000–1.0000)
├── avg_amount_requested, avg_amount_approved
├── common_denial_language[]
├── rebuttal_attempts, rebuttal_successes, rebuttal_success_rate
└── best_rebuttal_text, supporting_citations[]
```

### How It Feeds Back

```
                    ┌─────────────────────────┐
                    │  Carrier responds to     │
                    │  supplement              │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Contractor records      │
                    │  outcome in 4Margin      │
                    │  (approved/denied/partial)│
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          supplement_outcomes          item_outcomes
          (claim-level result)        (per-item result)
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼ (batch aggregation job)
                    ┌─────────────────────────┐
                    │  carrier_patterns        │
                    │  (aggregated stats)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          Confidence Scorer            Rebuttal Engine
          (Carrier History dim)        (best_rebuttal_text)
          uses approval_rate           serves winning scripts
```

**Carrier History Dimension** (currently neutral):
- When `carrier_patterns` has ≥3 data points for a carrier + code combination, the approval rate directly drives the score (>80% = 25pts, >50% = 15pts, >20% = 10pts, <20% = 5pts)
- Below 3 data points, defaults to neutral 12/25

### Current State

- **Schema exists**: Migration 034 created with all three tables + RLS policies + indexes
- **NOT applied**: Migration has not been run against Supabase production
- **No UI**: No contractor-facing outcome recording flow
- **No aggregation job**: Batch job to update `carrier_patterns` not built
- **Scoring wired**: Confidence scorer has the Carrier History dimension ready — just needs data

This is the highest-leverage feature not yet shipped. Even 50 outcomes would significantly improve confidence scoring accuracy.

---

## 8. Data Sources & Scraping Strategy

### Current Data Assets

| Data Layer | Source | Method | Coverage | Refresh Strategy |
|---|---|---|---|---|
| **IRC Building Codes** | ICC publications, state DHCD sites | Manual curation + web research | 24 codes, 3 states | Manual per code cycle (every 3 years) |
| **County Jurisdictions** | County building dept websites, state DHCD | Manual curation + WebSearch | 43 counties (MD/PA/DE) | Manual; stable (changes only on code adoption) |
| **Manufacturer Requirements** | Published installation instructions (PDF) | Manual extraction from manufacturer PDFs | 6 mfrs, 48 requirements | Annual review (manufacturers update instructions ~yearly) |
| **Carrier Endorsement Forms** | State DOI filings, policy samples | Manual curation from real policies | 8 carriers, ~30 form numbers | As new forms discovered during policy parsing |
| **Landmine/Favorable Rules** | Insurance industry knowledge, PA blogs, DOI complaints | Expert curation | 9 landmines, 4 favorable | Stable; add new rules as discovered |
| **Xactimate Codes** | Xactimate subscription, forums | DB table + AI training knowledge | ~200 commonly missed codes | Quarterly (Xactimate updates pricing monthly) |
| **Weather Data** | Visual Crossing API + NWS | Live API per claim | National coverage | Real-time per request |
| **Carrier Patterns** | 4Margin supplement outcomes | Self-generated (feedback loop) | 0 data points (not yet collecting) | Continuous as outcomes recorded |

### Expansion Roadmap

**Near-term (data already identified, needs implementation):**
- DC jurisdiction (single jurisdiction, simple)
- Virginia NOVA counties (6-8 counties, high-value market)
- Siding manufacturers (James Hardie, CertainTeed Siding, LP SmartSide)

**Medium-term (requires new data acquisition):**
- Xactimate price list integration (subscription-based, pricing calibration)
- Carrier denial pattern database (scraped from DOI complaint databases, public adjuster blogs)
- EagleView API integration (currently manual upload)

**Long-term (self-improving):**
- Carrier pattern aggregation (from outcome tracking — see Section 7)
- Regional pricing intelligence (what unit prices get approved by region)
- Rebuttal effectiveness scoring (which arguments actually work)

### Data Integrity

All curated data follows these principles:
- **Source-referenced**: Every IRC code cites its source document (e.g., "COMAR 09.12.01; 2018 IRC R905.2.8.5")
- **Jurisdiction-verified**: Building codes are verified per-state with adoption dates and amendment notes
- **Version-tracked**: IRC edition tracked per jurisdiction (2018 vs 2021)
- **Never AI-generated without verification**: Manufacturer requirements are extracted from published PDFs, not hallucinated

### What's NOT Scraped

- **Insurance policies**: Parsed per-claim from user uploads, never stored as training data
- **Adjuster estimates**: Read per-claim by Claude, never stored as training data
- **Pricing data**: Comes from Xactimate codes DB, not scraped from competitors
- **Personal data**: No PII scraping. Consumer leads require explicit consent with full certificate.

---

## Appendix: Key File Paths

```
AI Pipeline
  src/lib/ai/pipeline.ts              Orchestrator (10 steps)
  src/lib/ai/analyze.ts               Missing item detection (Claude Sonnet)
  src/lib/ai/photos.ts                Photo analysis (Claude Vision)
  src/lib/ai/policy-parser.ts         Re-export from @4margin/policy-engine

Intelligence Engine
  src/lib/scoring/confidence.ts        4-dimension scorer
  src/lib/calculators/ohp.ts           O&P calculator
  src/lib/calculators/waste.ts         Waste calculator
  src/lib/calculators/iws-steep.ts     IWS steep pitch calculator

Data
  src/data/building-codes.ts           24 IRC codes, 3 jurisdictions
  src/data/county-jurisdictions.ts     43 counties, ZIP mapping
  src/data/manufacturer-requirements.ts GAF + CertainTeed (legacy)
  src/data/manufacturers/index.ts      Unified lookup (all 6 manufacturers)
  src/data/manufacturers/owens-corning.ts
  src/data/manufacturers/iko.ts
  src/data/manufacturers/atlas.ts
  src/data/manufacturers/tamko.ts

PDF Generation
  src/lib/pdf/generate-supplement.ts   8-col Xactimate table + justifications
  src/lib/pdf/generate-cover-letter.ts Formal business letter
  src/lib/pdf/generate-weather-report.ts Verdict + hourly data

API Routes
  src/app/api/supplements/[id]/generate/route.ts   Pipeline trigger
  src/app/api/supplements/[id]/finalize/route.ts    PDF generation + O&P
  src/app/api/webhooks/qstash/pipeline/route.ts     Async job receiver

Shared Packages
  packages/policy-engine/src/parser.ts  3-pass AI policy parser
  packages/policy-engine/src/knowledge.ts Knowledge base
  packages/pdf/src/decoder-pdf.ts       Consumer PDF generator
```
