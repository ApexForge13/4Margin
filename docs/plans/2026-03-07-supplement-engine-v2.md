# 4Margin Supplement Engine v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the existing AI supplement pipeline into a 10-layer adjuster-grade engine with 5 backing databases, contractor-branded output, and correct O&P/waste calculations — scoped to Maryland.

**Architecture:** The engine layers L1 (EagleView) and L3 (Policy Decoder) already work. This plan builds the remaining layers and fixes critical PDF bugs. Each phase gates the next — Phase 1 (bug fixes + PDF rebuild) ships before any new features.

**Tech Stack:** Next.js 16 + TypeScript, jsPDF for PDF generation, Supabase PostgreSQL, Claude Sonnet for AI detection, existing data files in `src/data/`.

---

## Codebase Reality Check (What Exists vs. What The Plan Says)

| Master Plan Layer | Current State | Gap |
|---|---|---|
| L1 EagleView Parser | ✅ Working — all measurement fields parsed | None |
| L2 Estimate Analyzer | ✅ Working — `analyze.ts` parses adjuster PDF via Claude | Claim/contractor data parsing needs QA |
| L3 Policy Decoder | ✅ Working — `parsePolicyPdfV2()` | Not wired as ACTIVE triggers into pipeline |
| L4 Code Engine | 🟡 Partial — `building-codes.ts` (MD+PA), `county-jurisdictions.ts` (all 24 MD counties) | Missing R905.2.1 as dedicated field per county, missing screenshot refs |
| L5 Waste Calculator | 🟡 Partial — reads waste% from EagleView, no geometry formula | Need county waste DB + formula |
| L6 Manufacturer Library | 🟡 Partial — GAF (9) + CertainTeed (6) requirements exist | Missing OC Duration, IKO. Not wired to justification output. |
| L7 O&P Calculator | ❌ Not implemented | Need formula on full scope, multi-trade, math display |
| L8 Supplement Generator | ✅ Working — `pipeline.ts` orchestrates full flow | Needs PDF format fixes |
| L9 Rebuttal Engine | 🟡 Schema only — `carrier_patterns` table exists, rebuttal text in data files | No workflow, no tracking UI |
| L10 Document Assembly | 🟡 PDF exists but wrong format | 4MARGIN branding, missing cover letter, 6-col not 7-col, bullet bugs |

| Master Plan Database | Current State | Gap |
|---|---|---|
| DB1: MD County Codes | ✅ `county-jurisdictions.ts` — all 24 MD counties with climate zones, wind speeds, ice barrier, permit info, AHJ contacts | Add R905.2.1 dedicated field, waste tiers |
| DB2: Waste Database | ❌ No per-county waste tiers | Build waste tiers into county data |
| DB3: Xactimate Codes | 🟡 `xactimate_codes` table in Supabase + codes in `analyze.ts` prompt | Needs population from subscription (pending Friday) |
| DB4: Manufacturer Library | 🟡 `manufacturer-requirements.ts` — GAF + CertainTeed | Add OC Duration, IKO. Wire to output. |
| DB5: Carrier Rebuttal | 🟡 `carrier_patterns` table schema ready | No data flow, no outcome tracking UI |

---

## PHASE 1 — Fix the Foundation (Sprint 1, ~5 Days)

> **GATE:** Nothing in Phase 2+ begins until Phase 1 ships clean.

---

### Task 1: Fix Decimal/Dotted String Splitting in Bullet Generator

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts:551-575`

**Problem:** The `splitIntoPoints()` function uses regex `/[^.!?]+[.!?]+/g` which splits on periods inside decimal numbers (`$2,153.62` → `$2,153.` + `62.`) and IRC references (`R905.2.8.4` → 4 fragments).

**Step 1: Write the fix**

Replace `splitIntoPoints()` (lines 551-575) with:

```typescript
function splitIntoPoints(text: string): string[] {
  // Try splitting by numbered points first (1. 2. 3. or 1) 2) 3))
  const numberedPattern = /(?:^|\n)\s*\d+[\.\)]\s*/;
  if (numberedPattern.test(text)) {
    return text
      .split(/\n?\s*\d+[\.\)]\s*/)
      .filter((s) => s.trim().length > 0);
  }

  // Try splitting by bullet markers
  if (text.includes("•") || text.includes("-  ") || text.includes("- ")) {
    return text
      .split(/[•\-]\s+/)
      .filter((s) => s.trim().length > 0);
  }

  // Split by sentences — but protect decimals, code refs, and abbreviations.
  // Match period/!/? followed by a space and uppercase letter (actual sentence break).
  const sentenceParts = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (sentenceParts.length > 1) {
    return sentenceParts.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // Fallback: return as single point
  return [text];
}
```

**Step 2: Test locally**

Verify with these strings:
- `"$2,153.62 per square foot. The total is $5,000.00."` → 2 sentences, not 4
- `"Per IRC R905.2.8.4, ice barrier is required. This is code-mandated."` → 2 sentences, code ref intact
- `"Item costs $10.50 including tax."` → 1 sentence

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "fix: prevent decimal/code-ref splitting in PDF bullet generator"
```

---

### Task 2: Remove Platform Branding — Contractor-Only Output

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts:112-148` (header)
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts:528-544` (footer)
- Modify: `apps/contractor/src/lib/pdf/generate-weather-report.ts` (header/footer)

**Problem:** Every document says "4MARGIN" in header + footer. The Master Plan requires ZERO platform branding — contractor name, logo, and contact only.

**Step 1: Replace header (lines 112-148)**

Replace the `4MARGIN` wordmark block with:

```typescript
// ══════════════════════════════════════════════
// PAGE 1: CONTRACTOR-BRANDED HEADER
// ══════════════════════════════════════════════

// Top brand bar
setFillColor(BRAND.accent);
doc.rect(0, 0, pageWidth, 72, "F");

// Contractor name (replaces "4MARGIN")
doc.setFontSize(20);
doc.setFont("helvetica", "bold");
setColor(BRAND.white);
const displayName = data.companyName || "Supplement Request";
doc.text(displayName.toUpperCase(), margin, 38);

// Contractor contact line
doc.setFontSize(8);
doc.setFont("helvetica", "normal");
setColor(BRAND.textLight);
const contactParts = [data.companyPhone, data.companyAddress].filter(Boolean);
if (contactParts.length > 0) {
  doc.text(contactParts.join("  |  "), margin, 54);
}

// License number (top right)
if (data.companyLicense) {
  doc.text(`License: ${data.companyLicense}`, pageWidth - margin, 38, { align: "right" });
}

// Date (top right, below license)
doc.setFontSize(8);
setColor(BRAND.textLight);
doc.text(data.generatedDate, pageWidth - margin, 50, { align: "right" });

y = 90;
```

**Step 2: Replace footer (lines 528-544)**

Replace the footer block. Find the `addFooter` or footer section and replace "4MARGIN" with:

```typescript
// Footer — contractor branded
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
setColor(BRAND.textMuted);
doc.text(
  `${data.companyName}  |  ${data.generatedDate}`,
  margin,
  pageHeight - 18
);
doc.text(
  `Page ${i + 1} of ${totalPages}`,
  pageWidth - margin,
  pageHeight - 18,
  { align: "right" }
);
```

**Step 3: Apply same fix to weather report PDF**

In `generate-weather-report.ts`, replace any "4MARGIN" or "4Margin" strings with `data.companyName` (or equivalent contractor name field).

**Step 4: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-supplement.ts apps/contractor/src/lib/pdf/generate-weather-report.ts
git commit -m "feat: replace all platform branding with contractor name/logo/contact"
```

---

### Task 3: Fix Code Reference Display — Plain Text, No Icon Font

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts`

**Problem:** Code references use a custom icon font that renders as corrupted Unicode in jsPDF.

**Step 1: Find and replace code reference rendering**

Search for any emoji or icon usage (like `📋`) in the justification rendering section. Replace with plain text prefix:

```typescript
// Instead of emoji + icon font:
// doc.text("📋 Code Reference: " + item.irc_reference, ...)

// Use clean plain text:
const codeRefText = item.irc_reference
  ? `Code Ref: ${item.irc_reference}`
  : "";
```

Ensure all IRC references render as atomic strings like `Code Ref: IRC R905.2.8.4`.

**Step 2: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "fix: replace icon font with plain text for code references in PDF"
```

---

### Task 4: Rebuild Supplement Estimate Table — 7-Column Xactimate Layout

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts` (line items table section)
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts` (SupplementPdfData type)

**Problem:** Current table has 6 columns (Code | Description | Qty | Unit | Unit Price | RCV). Master Plan requires 7: Description | Qty | Unit | Unit Price | RCV | Deprec. | ACV. Also needs trade category grouping with subtotals.

**Step 1: Update SupplementPdfData interface**

Add depreciation fields to the items array and data:

```typescript
export interface SupplementPdfData {
  // ... existing fields ...

  // Depreciation context
  depreciationMethod: "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN";
  depreciationPercent: number | null; // e.g., 0.40 for 40% depreciation

  // Line items — add depreciation columns
  items: Array<{
    xactimate_code: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;      // This is the RCV
    depreciation: number;     // Depreciation amount (negative)
    acv: number;              // ACV = RCV - depreciation
    justification: string;
    irc_reference: string;
  }>;
}
```

**Step 2: Rebuild the table renderer**

Replace the line items table with a 7-column Xactimate-format layout:

```
#  | DESCRIPTION                                        | QTY | UNIT | UNIT PRICE | RCV      | DEPREC. | ACV
---+----------------------------------------------------+-----+------+------------+----------+---------+--------
   | ROOFING                                            |     |      |            |          |         |
1  | Ice & water shield — valley (Balto Co. IRC 2018)   | 112 | LF   | $3.50      | $392.00  | ($0.00) | $392.00
2  | Starter strip shingles                              | 185 | LF   | $2.15      | $397.75  | ($0.00) | $397.75
   |                                            Subtotal:|     |      |            | $789.75  | ($0.00) | $789.75
```

Column widths (in pts, total contentWidth ~516):
- `#`: 24
- `Description`: 216
- `Qty`: 40
- `Unit`: 36
- `Unit Price`: 56
- `RCV`: 56
- `Deprec.`: 48
- `ACV`: 56

Group items by `category`. Print category header row, then items, then subtotal row per category. Grand total row at bottom.

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "feat: rebuild supplement table as 7-column Xactimate layout with trade grouping"
```

---

### Task 5: Add Cover Letter as Document 1

**Files:**
- Create: `apps/contractor/src/lib/pdf/generate-cover-letter.ts`
- Modify: `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`

**Problem:** No cover letter exists. Master Plan requires it as Document 1 — contractor letterhead, claim summary, supplement total, professional close.

**Step 1: Create the cover letter generator**

```typescript
// apps/contractor/src/lib/pdf/generate-cover-letter.ts
import { jsPDF } from "jspdf";

export interface CoverLetterData {
  // Contractor
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyLicense: string;
  // Claim
  claimNumber: string;
  policyNumber: string;
  carrierName: string;
  propertyAddress: string;
  dateOfLoss: string;
  adjusterName: string;
  // Financials
  adjusterTotal: number | null;
  supplementTotal: number;
  revisedTotal: number;
  // Date
  generatedDate: string;
}

export function generateCoverLetter(data: CoverLetterData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 48;

  // Contractor header block
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.companyName.toUpperCase(), margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const contactLine = [data.companyAddress, data.companyPhone].filter(Boolean).join("  |  ");
  doc.text(contactLine, margin, y);
  if (data.companyLicense) {
    y += 12;
    doc.text(`License: ${data.companyLicense}`, margin, y);
  }

  // Divider
  y += 20;
  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 140, y);

  // Date
  y += 28;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(data.generatedDate, margin, y);

  // Addressee
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.text(`RE: Supplement Request`, margin, y);
  y += 14;
  doc.text(`Claim #: ${data.claimNumber}`, margin, y);
  y += 14;
  doc.text(`Policy #: ${data.policyNumber}`, margin, y);
  y += 14;
  doc.text(`Property: ${data.propertyAddress}`, margin, y);
  y += 14;
  doc.text(`Date of Loss: ${data.dateOfLoss}`, margin, y);
  y += 14;
  doc.text(`Carrier: ${data.carrierName}`, margin, y);
  if (data.adjusterName) {
    y += 14;
    doc.text(`Adjuster: ${data.adjusterName}`, margin, y);
  }

  // Body
  y += 32;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);

  const bodyLines = [
    `Dear ${data.adjusterName || "Claims Department"},`,
    ``,
    `Please find enclosed our supplement request for the above-referenced claim.`,
    `Upon thorough review of the adjuster's estimate, field inspection, and applicable`,
    `building codes, we have identified additional scope items required for a complete,`,
    `code-compliant roof replacement.`,
    ``,
    `Each supplemental item is supported by specific policy language, applicable`,
    `building code sections, and/or manufacturer installation requirements.`,
  ];

  for (const line of bodyLines) {
    doc.text(line, margin, y);
    y += 14;
  }

  // Financial summary box
  y += 12;
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 80, 4, 4, "FD");
  y += 24;

  doc.setFontSize(10);
  doc.text("Adjuster's Estimate (RCV):", margin + 16, y);
  doc.text(data.adjusterTotal ? fmt(data.adjusterTotal) : "N/A", pageWidth - margin - 16, y, { align: "right" });
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("Supplement Amount Requested:", margin + 16, y);
  doc.text(fmt(data.supplementTotal), pageWidth - margin - 16, y, { align: "right" });
  y += 18;

  doc.setTextColor(15, 23, 42);
  doc.text("Revised Total (RCV):", margin + 16, y);
  doc.text(fmt(data.revisedTotal), pageWidth - margin - 16, y, { align: "right" });

  // Closing
  y += 48;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const closingLines = [
    `We respectfully request your prompt review and approval of this supplement.`,
    `All supporting documentation, code references, and manufacturer specifications`,
    `are included in the attached supplement package.`,
    ``,
    `Please do not hesitate to contact us with any questions.`,
    ``,
    `Respectfully,`,
    ``,
    data.companyName,
    data.companyPhone,
  ];

  for (const line of closingLines) {
    doc.text(line, margin, y);
    y += 14;
  }

  return doc.output("arraybuffer");
}
```

**Step 2: Wire cover letter into finalize route**

In `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`, after generating the supplement PDF, also generate the cover letter and upload both.

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-cover-letter.ts apps/contractor/src/app/api/supplements/[id]/finalize/route.ts
git commit -m "feat: add contractor-branded cover letter as Document 1 in supplement package"
```

---

### Task 6: Implement O&P Calculator — Correct Formula + Multi-Trade + Math Display

**Files:**
- Create: `apps/contractor/src/lib/calculators/ohp.ts`
- Modify: `apps/contractor/src/lib/ai/pipeline.ts` (wire O&P into pipeline)
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts` (display O&P math)

**Problem:** O&P is not calculated. Master Plan requires:
- Calculate on FULL scope (adjuster base + supplement), not just supplement
- 10% overhead compounded by 10% profit = 21% (not 20%)
- Subtract O&P already in adjuster estimate
- Multi-trade detection (2+ trades = strong justification, 3+ = unambiguous)
- Show ALL math in output

**Step 1: Create O&P calculator**

```typescript
// apps/contractor/src/lib/calculators/ohp.ts

export interface OhpInput {
  adjusterEstimateBase: number;   // Adjuster line items total BEFORE O&P
  supplementBase: number;         // Supplement line items total BEFORE O&P
  ohpAlreadyPaid: number;         // O&P already in adjuster estimate
  tradeCategories: string[];      // Unique trade categories in the supplement
  competitiveMarket?: boolean;    // MD competitive market = 15/10 not 10/10
}

export interface OhpResult {
  combinedScopeBase: number;      // adjusterBase + supplementBase
  overheadRate: number;           // 0.10 or 0.15 (competitive)
  profitRate: number;             // 0.10
  effectiveRate: number;          // compounded rate
  fullOhp: number;               // combinedScope * effectiveRate
  ohpAlreadyPaid: number;
  supplementalOhp: number;       // fullOhp - ohpAlreadyPaid
  tradeCount: number;
  tradeNames: string[];
  multiTradeJustification: string;
  formulaDisplay: string;         // Human-readable formula for PDF
}

const TRADE_CATEGORY_MAP: Record<string, string> = {
  "ROOFING": "Roofing",
  "HVAC": "HVAC",
  "ELECTRICAL": "Electrical",
  "PLUMBING": "Plumbing",
  "GENERAL": "General Trades",
  "GUTTERS": "Gutters",
  "SIDING": "Siding/Exterior",
  "INTERIOR": "Interior",
  "INSULATION": "Insulation",
};

export function calculateOhp(input: OhpInput): OhpResult {
  const {
    adjusterEstimateBase,
    supplementBase,
    ohpAlreadyPaid,
    tradeCategories,
    competitiveMarket = false,
  } = input;

  // Map categories to trade names, deduplicate
  const tradeNames = [...new Set(
    tradeCategories.map(cat => TRADE_CATEGORY_MAP[cat.toUpperCase()] || cat)
  )];
  const tradeCount = tradeNames.length;

  // Rates — MD competitive markets are 15/10
  const overheadRate = competitiveMarket ? 0.15 : 0.10;
  const profitRate = 0.10;

  // Compounded: (1 + overhead) * (1 + profit) - 1
  const effectiveRate = (1 + overheadRate) * (1 + profitRate) - 1;

  const combinedScopeBase = adjusterEstimateBase + supplementBase;
  const fullOhp = Math.round(combinedScopeBase * effectiveRate * 100) / 100;
  const supplementalOhp = Math.round((fullOhp - ohpAlreadyPaid) * 100) / 100;

  // Multi-trade justification
  let multiTradeJustification = "";
  if (tradeCount >= 3) {
    multiTradeJustification = `This project involves ${tradeCount} trades (${tradeNames.join(", ")}). Full O&P at ${(overheadRate * 100).toFixed(0)}%+${(profitRate * 100).toFixed(0)}% is industry standard for multi-trade projects per Xactimate guidelines.`;
  } else if (tradeCount === 2) {
    multiTradeJustification = `This project involves ${tradeCount} trades (${tradeNames.join(", ")}). O&P at ${(overheadRate * 100).toFixed(0)}%+${(profitRate * 100).toFixed(0)}% is standard for multi-trade projects.`;
  } else {
    multiTradeJustification = `O&P at ${(overheadRate * 100).toFixed(0)}%+${(profitRate * 100).toFixed(0)}% per industry standard methodology, defensible under COMAR 31.15.07.`;
  }

  // Formula display for PDF
  const ohPct = (overheadRate * 100).toFixed(0);
  const prPct = (profitRate * 100).toFixed(0);
  const effPct = (effectiveRate * 100).toFixed(1);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formulaDisplay = [
    `Adjuster estimate base: ${fmt(adjusterEstimateBase)}`,
    `Supplement base: ${fmt(supplementBase)}`,
    `Combined scope: ${fmt(combinedScopeBase)}`,
    `O&P rate: ${ohPct}% overhead + ${prPct}% profit = ${effPct}% (compounded)`,
    `Full O&P on combined scope: ${fmt(combinedScopeBase)} × ${effPct}% = ${fmt(fullOhp)}`,
    `O&P already paid: ${fmt(ohpAlreadyPaid)}`,
    `Supplemental O&P requested: ${fmt(fullOhp)} − ${fmt(ohpAlreadyPaid)} = ${fmt(supplementalOhp)}`,
  ].join("\n");

  return {
    combinedScopeBase,
    overheadRate,
    profitRate,
    effectiveRate,
    fullOhp,
    ohpAlreadyPaid,
    supplementalOhp,
    tradeCount,
    tradeNames,
    multiTradeJustification,
    formulaDisplay,
  };
}
```

**Step 2: Wire into pipeline**

In `pipeline.ts`, after inserting supplement_items and before updating supplement record:
1. Extract `adjusterEstimateBase` from parsed estimate (or from `supplements.adjuster_total`)
2. Calculate `supplementBase` = sum of all detected items' `total_price`
3. Call `calculateOhp()` with trade categories from items
4. Insert O&P as an additional supplement_item with code "O&P" and justification containing the formula

**Step 3: Add O&P section to supplement PDF**

In `generate-supplement.ts`, after the line items table and grand total, add an O&P Calculation section that displays the full `formulaDisplay` string in a styled box.

**Step 4: Commit**

```bash
git add apps/contractor/src/lib/calculators/ohp.ts apps/contractor/src/lib/ai/pipeline.ts apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "feat: implement O&P calculator — full scope, 21% compounded, multi-trade, math shown"
```

---

### Task 7: Waste Calculator — Show Formula + Source in Output

**Files:**
- Create: `apps/contractor/src/lib/calculators/waste.ts`
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts`

**Problem:** Waste % comes from EagleView but formula is not shown. Output says "15%" with no source or calculation.

**Step 1: Create waste calculator**

```typescript
// apps/contractor/src/lib/calculators/waste.ts

export interface WasteInput {
  measuredSquares: number;       // From EagleView
  wastePercent: number;          // From EagleView or county default
  suggestedSquares: number;      // From EagleView (measured × (1 + waste%))
  structureComplexity: string;   // Simple | Normal | Complex
  numHips: number;
  numValleys: number;
  numDormers: number;
  countyName?: string;
}

export interface WasteResult {
  measuredSquares: number;
  wastePercent: number;
  wasteSquares: number;
  adjustedSquares: number;
  complexityCategory: string;
  formulaDisplay: string;
  source: string;
}

export function calculateWaste(input: WasteInput): WasteResult {
  const {
    measuredSquares,
    wastePercent,
    suggestedSquares,
    structureComplexity,
    numHips,
    numValleys,
    numDormers,
    countyName,
  } = input;

  // Determine complexity category
  let complexityCategory = structureComplexity || "Normal";
  if (!structureComplexity) {
    const complexityScore = (numHips || 0) + (numValleys || 0) + (numDormers || 0);
    if (complexityScore <= 2) complexityCategory = "Simple";
    else if (complexityScore <= 6) complexityCategory = "Normal";
    else complexityCategory = "Complex";
  }

  const wasteSquares = Math.round(measuredSquares * (wastePercent / 100) * 100) / 100;
  const adjustedSquares = Math.round((measuredSquares + wasteSquares) * 100) / 100;

  const source = countyName
    ? `EagleView measurement report, ${countyName} standard`
    : "EagleView measurement report, NRCA Guidelines";

  const formulaDisplay = [
    `Measured area: ${measuredSquares.toFixed(2)} SQ`,
    `Roof complexity: ${complexityCategory} (${numHips || 0} hips, ${numValleys || 0} valleys, ${numDormers || 0} dormers)`,
    `Waste factor: ${wastePercent}%`,
    `Waste calculation: ${measuredSquares.toFixed(2)} SQ × ${wastePercent}% = ${wasteSquares.toFixed(2)} SQ waste`,
    `Adjusted total: ${measuredSquares.toFixed(2)} + ${wasteSquares.toFixed(2)} = ${adjustedSquares.toFixed(2)} SQ`,
    `Source: ${source}`,
  ].join("\n");

  return {
    measuredSquares,
    wastePercent,
    wasteSquares,
    adjustedSquares,
    complexityCategory,
    formulaDisplay,
    source,
  };
}
```

**Step 2: Add waste formula section to PDF**

After the O&P section, add a Waste Calculation section showing the full formula.

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/calculators/waste.ts apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "feat: waste calculator with formula display and complexity-based source"
```

---

### Task 8: Weather Report — Conditional Logic + Always Last + Contractor Branding

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-weather-report.ts`
- Modify: `apps/contractor/src/lib/ai/pipeline.ts`

**Problem:** Weather report should ONLY be included when thresholds are met (hail reported, wind > 50mph, NWS warning, or precip > 1"). Should always be the LAST document. Must have contractor header only.

**Step 1: Add threshold check function**

```typescript
// In pipeline.ts or a new weather-utils.ts
export function shouldIncludeWeatherReport(weatherData: WeatherData): boolean {
  if (!weatherData?.days?.length) return false;

  return weatherData.days.some((day) => {
    const hasHail = day.preciptype?.includes("hail");
    const hasHighWind = (day.windgust || 0) >= 50;
    const hasNwsWarning = day.severerisk != null && day.severerisk > 0;
    const hasHeavyPrecip = (day.precip || 0) >= 1.0;
    return hasHail || hasHighWind || hasNwsWarning || hasHeavyPrecip;
  });
}
```

**Step 2: Wire conditional logic into pipeline**

In `pipeline.ts`, wrap weather report generation in:
```typescript
if (shouldIncludeWeatherReport(weatherData)) {
  // generate weather PDF
}
```

**Step 3: Fix weather report branding**

Remove any "4MARGIN" references in `generate-weather-report.ts`. Use contractor name from claim/company data.

**Step 4: Commit**

```bash
git add apps/contractor/src/lib/ai/pipeline.ts apps/contractor/src/lib/pdf/generate-weather-report.ts
git commit -m "feat: conditional weather report with thresholds + contractor-only branding"
```

---

### Task 9: Claim & Contractor Data Parsing — QA + Fix

**Files:**
- Modify: `apps/contractor/src/lib/ai/analyze.ts` (estimate parser context)
- Modify: `apps/contractor/src/lib/ai/pipeline.ts` (data extraction)

**Problem:** Claim/contractor data (name, phone, address, claim #, policy #, carrier, property address, DOL) must auto-populate accurately from estimate PDF. Per the Master Plan, incorrect data on a submitted supplement is an immediate credibility failure.

**Step 1: Verify estimate parser extracts all required fields**

In `analyze.ts`, the Claude prompt must request extraction of:
- Contractor name, phone, address
- Claim number, policy number
- Carrier name
- Property address
- Date of loss
- Adjuster name, email, phone

Verify these are in the prompt's expected output schema. If not, add them.

**Step 2: Ensure pipeline stores extracted data**

In `pipeline.ts`, after estimate parsing, verify extracted fields are stored back to the `claims` record (not just used for AI context).

**Step 3: QA test with 3+ real estimate PDFs**

Test against real adjuster estimates to confirm all fields parse correctly. Document any parsing failures.

**Step 4: Commit**

```bash
git add apps/contractor/src/lib/ai/analyze.ts apps/contractor/src/lib/ai/pipeline.ts
git commit -m "fix: ensure claim/contractor data fully parsed and stored from estimate PDF"
```

---

## PHASE 2 — Maryland Data Infrastructure (Weeks 2-5)

> Depends on Phase 1 completion. Data-heavy phase — mostly TypeScript data files.

---

### Task 10: Add R905.2.1 Dedicated Field to County Database

**Files:**
- Modify: `apps/contractor/src/data/county-jurisdictions.ts`

**Problem:** R905.2.1 (manufacturer spec mandate) is the legal multiplier that converts the entire manufacturer library into code-required scope. It must be a dedicated, prominently flagged field per county — not buried with other code sections.

**Step 1: Extend CountyJurisdiction interface**

```typescript
interface R9052_1_Status {
  ircSection: "R905.2.1";
  ircText: "Asphalt shingles shall be fastened to solidly sheathed roofs and shall be applied according to the manufacturer's installation instructions.";
  adoptedInJurisdiction: boolean;
  localAmendment: string | null;  // null = no amendment, or the amendment text
  supplementTrigger: "any_manufacturer_required_item";
  legalSignificance: string;
  sourceUrl: string;
  screenshotPath: string | null;
  attorneyReviewed: boolean;
}
```

Add `r9052_1: R9052_1_Status` field to every MD county record. For Phase 2, mark `attorneyReviewed: false` and `adoptedInJurisdiction: true` (IRC 2018 adopted wholesale by most MD counties). Flag exceptions.

**Step 2: Add R905.2.1 template output function**

```typescript
export function getR9052_1_Statement(county: CountyJurisdiction): string | null {
  if (!county.r9052_1?.adoptedInJurisdiction) return null;
  if (county.r9052_1.localAmendment) return null; // Attorney review needed

  return `Per ${county.county} adopted IRC ${county.ircVersion || "2018"} §R905.2.1, all roofing materials shall be installed in accordance with manufacturer installation instructions. The following supplement items are therefore code-required scope, not elective upgrades. Denial of these items constitutes denial of a code-compliant installation, which is an unfair claim settlement practice under MD Ins. §27-304.`;
}
```

**Step 3: Commit**

```bash
git add apps/contractor/src/data/county-jurisdictions.ts
git commit -m "feat: add R905.2.1 dedicated field to all MD county jurisdiction records"
```

---

### Task 11: Add Waste Database Tiers to County Data

**Files:**
- Modify: `apps/contractor/src/data/county-jurisdictions.ts`

**Step 1: Extend CountyJurisdiction interface with waste tiers**

```typescript
interface WasteTiers {
  simple: number;        // Gable roof, minimal cuts — typically 10%
  moderate: number;      // Some hips/valleys — typically 12-13%
  complex: number;       // Multiple hips, valleys, dormers — typically 15-17%
  veryComplex: number;   // Cut-up roof, multiple intersections — typically 18-20%
  complexityTriggers: {
    hipCountModerate: number;   // e.g., 2+
    valleyLfPerSqComplex: number; // e.g., 5+ LF per SQ
    dormerCountComplex: number;   // e.g., 3+
  };
  carrierAcceptedNorm: Record<string, number>; // e.g., { "State Farm": 15, "USAA": 12 }
  source: string;  // "NRCA Guidelines" or specific code
}
```

Add `wasteTiers: WasteTiers` to each MD county. Start with NRCA defaults, customize as carrier outcome data accumulates.

**Step 2: Commit**

```bash
git add apps/contractor/src/data/county-jurisdictions.ts
git commit -m "feat: add waste tiers per MD county — simple/moderate/complex/very-complex"
```

---

### Task 12: Expand Manufacturer Library — Owens Corning + IKO

**Files:**
- Modify: `apps/contractor/src/data/manufacturer-requirements.ts`

**Problem:** Only GAF (9 items) and CertainTeed (6 items) exist. Master Plan requires Owens Corning Duration and IKO Dynasty/Cambridge.

**Step 1: Add Owens Corning Duration requirements**

Research OC Total Protection Roofing System requirements and add:
- OC-REQ-001 through OC-REQ-00N
- Required: starter strip, drip edge, underlayment, ice & water, ridge cap, ventilation, flashing
- Warranty tiers: Preferred Protection, Platinum Protection, Total Protection
- Source URLs to OC installation manuals

**Step 2: Add IKO Dynasty/Cambridge requirements**

Research IKO ROOFPRO warranty requirements and add:
- IKO-REQ-001 through IKO-REQ-00N
- Required accessories per warranty tier
- Source URLs

**Step 3: Update justification matrix**

Add OC and IKO entries to `JUSTIFICATION_MATRIX`.

**Step 4: Commit**

```bash
git add apps/contractor/src/data/manufacturer-requirements.ts
git commit -m "feat: add Owens Corning Duration + IKO Dynasty manufacturer requirements"
```

---

### Task 13: Wire Policy Decoder as Active Endorsement Triggers

**Files:**
- Modify: `apps/contractor/src/lib/ai/analyze.ts`
- Modify: `apps/contractor/src/lib/ai/pipeline.ts`
- Create: `apps/contractor/src/lib/endorsement-triggers.ts`

**Problem:** Policy Decoder output exists but is only injected as AI context. Endorsements should DIRECTLY trigger supplement line items:
- Ordinance/Law → all code items flagged as fully payable
- RCV coverage → O&P pre-justified at full rate
- Matching endorsement → ITEL workflow triggered

**Step 1: Create endorsement trigger mapper**

```typescript
// apps/contractor/src/lib/endorsement-triggers.ts
import type { PolicyAnalysis } from "@4margin/policy-engine";

export interface EndorsementTrigger {
  endorsementName: string;
  triggerType: "code_items_payable" | "ohp_full_rate" | "itel_required" | "upgrade_scope";
  supplementImpact: string;       // Human-readable impact for output
  flagAtTopOfDocument: boolean;
}

export function getEndorsementTriggers(policy: PolicyAnalysis): EndorsementTrigger[] {
  const triggers: EndorsementTrigger[] = [];

  // Check for Ordinance/Law endorsement
  const hasOrdinanceLaw = policy.endorsements?.some(e =>
    e.name.toLowerCase().includes("ordinance") || e.name.toLowerCase().includes("law")
  );
  if (hasOrdinanceLaw) {
    triggers.push({
      endorsementName: "Ordinance or Law",
      triggerType: "code_items_payable",
      supplementImpact: "All code-required items are payable under this endorsement. Code compliance costs are covered scope.",
      flagAtTopOfDocument: true,
    });
  }

  // Check depreciation method — RCV = O&P easier to justify
  if (policy.depreciationMethod === "RCV") {
    triggers.push({
      endorsementName: "Replacement Cost Value (RCV)",
      triggerType: "ohp_full_rate",
      supplementImpact: "RCV policy — O&P at full rate is pre-justified under replacement cost methodology.",
      flagAtTopOfDocument: false,
    });
  }

  // Check for matching/like-kind endorsement
  const hasMatching = policy.endorsements?.some(e =>
    e.name.toLowerCase().includes("matching") ||
    e.name.toLowerCase().includes("like kind") ||
    e.name.toLowerCase().includes("like-kind")
  );
  if (hasMatching) {
    triggers.push({
      endorsementName: "Matching / Like Kind & Quality",
      triggerType: "itel_required",
      supplementImpact: "Matching endorsement present — ITEL inspection report recommended for shingle product/color verification.",
      flagAtTopOfDocument: false,
    });
  }

  return triggers;
}
```

**Step 2: Inject triggers into pipeline**

In `pipeline.ts`, after policy parsing, call `getEndorsementTriggers()` and:
1. Pass triggers to `detectMissingItems()` in the context
2. Store triggers on supplement record for PDF generation
3. If `itel_required` trigger fires, flag in UI

**Step 3: Include triggers in supplement PDF**

At the top of the Justification & Evidence document, render any `flagAtTopOfDocument: true` triggers (e.g., Ordinance/Law statement).

**Step 4: Commit**

```bash
git add apps/contractor/src/lib/endorsement-triggers.ts apps/contractor/src/lib/ai/analyze.ts apps/contractor/src/lib/ai/pipeline.ts
git commit -m "feat: wire policy decoder endorsements as active supplement triggers"
```

---

### Task 14: Build ITEL Upload/Attach Workflow

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`
- Modify: `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`

**Problem:** No ITEL workflow exists. When matching endorsement is detected:
1. Show checkbox "Has an ITEL Inspection Report been obtained?"
2. If checked → file upload field for ITEL PDF
3. Justification auto-populates with ITEL reference
4. PDF attaches to supporting documentation

**Step 1: Add ITEL section to supplement detail page**

On the supplement detail page, after the line items review section, add:
- Conditional render when matching endorsement is in `endorsement_triggers`
- Checkbox + file upload
- Auto-populated justification text

**Step 2: Attach ITEL PDF in finalize route**

In the finalize API route, if ITEL PDF was uploaded:
1. Download from Supabase storage
2. Include in the supplement package

**Step 3: Commit**

```bash
git add apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx apps/contractor/src/app/api/supplements/[id]/finalize/route.ts
git commit -m "feat: ITEL report upload workflow for matching endorsement claims"
```

---

## PHASE 3 — Intelligence Layer (Weeks 6-10)

> Depends on Phase 2 data infrastructure. This is where the engine becomes smart.

---

### Task 15: Populate Xactimate Code Database

**Files:**
- Modify: `apps/contractor/supabase/migrations/` (new migration for seed data)
- Modify: `apps/contractor/src/data/` (data file for codes if needed)

**Problem:** `xactimate_codes` table exists but needs population from Xactimate subscription. Priority codes listed in Master Plan Section 4.3.

**Step 1: Create seed migration with priority roofing codes**

Insert all priority codes from the Master Plan:
- O&P, IWS (eave + valley), steep pitch, waste adjustment, dumpster/haul, building permit, drip edge, starter strip, custom flashing, HVAC stack R&R, satellite dish R&R, solar panel R&R

Include: code, category, description, unit, default_justification, irc_reference, commonly_missed.

**Step 2: Add MD regional pricing column**

When subscription is active, add `md_price_region`, `current_unit_price`, `price_last_updated` columns.

**Step 3: Commit**

```bash
git add apps/contractor/supabase/migrations/
git commit -m "feat: seed xactimate_codes table with priority roofing codes"
```

---

### Task 16: Wire Code Engine — County-Specific Citations in Output

**Files:**
- Modify: `apps/contractor/src/lib/ai/analyze.ts`
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts`

**Problem:** Building codes are injected into AI prompt but output doesn't always cite the specific county + code version + section. Need: "Per Baltimore County IRC 2018, Section R905.2.8.4" not just "Per IRC R905.2.8.4".

**Step 1: Enrich AI prompt with county-specific context**

In `analyze.ts`, when building code context, include:
```
Property jurisdiction: ${countyName}, ${state}
Adopted code: IRC ${ircVersion}
Local amendments: ${amendments.join(", ") || "None"}
```

**Step 2: Post-process IRC references**

After Claude returns items, enrich each `irc_reference` with county name:
```typescript
item.irc_reference = `${countyName} IRC ${ircVersion}, ${item.irc_reference}`;
```

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/ai/analyze.ts
git commit -m "feat: county-specific code citations in supplement line item references"
```

---

### Task 17: Wire Manufacturer Library to Justification Output

**Files:**
- Modify: `apps/contractor/src/lib/ai/analyze.ts`
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts`

**Problem:** Manufacturer requirements data exists (GAF, CertainTeed, OC, IKO) but isn't auto-injected into justification text. Need: warranty void language, source section, indemnification argument per manufacturer-required item.

**Step 1: Create manufacturer justification enricher**

After AI returns detected items, cross-reference each `xactimate_code` against the manufacturer library. If a match exists:
- Append manufacturer requirement text to `justification`
- Add warranty void language
- Add indemnification argument if R905.2.1 is adopted

**Step 2: Commit**

```bash
git add apps/contractor/src/lib/ai/analyze.ts
git commit -m "feat: auto-enrich supplement justifications with manufacturer warranty requirements"
```

---

### Task 18: Outcome Tracking — Carrier Approval/Denial Per Line Item

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`
- Create: `apps/contractor/src/app/api/supplements/[id]/outcome/route.ts`

**Problem:** `carrier_patterns` table exists but no UI or API feeds data into it. Every claim submitted should track: approved, partially approved, denied (with denial reason). This builds the carrier database automatically.

**Step 1: Add outcome form to supplement detail page**

After supplement is submitted, show outcome tracking form:
- Overall status: Approved / Partially Approved / Denied
- Per-item outcome: Approved / Denied + denial reason text
- Approved amount

**Step 2: Create outcome API route**

POST `/api/supplements/[id]/outcome` — saves outcome data and updates `carrier_patterns` table:
- Increment `times_submitted`, `times_approved`, or `times_denied`
- Update `avg_approved_amount`
- Store `best_justification` if approved

**Step 3: Commit**

```bash
git add apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx apps/contractor/src/app/api/supplements/[id]/outcome/route.ts
git commit -m "feat: outcome tracking — per-item carrier approval/denial builds data moat"
```

---

### Task 19: Rebuttal Engine v1 — Carrier-Specific Denial Patterns

**Files:**
- Create: `apps/contractor/src/lib/rebuttal-engine.ts`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`

**Problem:** Rebuttal text exists in data files but isn't surfaced to contractors. Need: when a supplement is denied, show pre-loaded rebuttals per carrier per line item.

**Step 1: Create rebuttal lookup function**

```typescript
export function getRebuttalForItem(
  xactimateCode: string,
  carrierName: string,
): RebuttalSuggestion | null {
  // 1. Check carrier_patterns table for carrier-specific rebuttal
  // 2. Fall back to manufacturer-requirements.ts rebuttal
  // 3. Fall back to building-codes.ts rebuttal
}
```

**Step 2: Show rebuttals in UI**

On the supplement detail page, when status is "denied" or "partially_approved", show:
- Per denied item: the rebuttal script, supporting citations, historical success rate
- Editable by contractor before sending

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/rebuttal-engine.ts apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx
git commit -m "feat: rebuttal engine v1 — carrier-specific denial rebuttals with success rates"
```

---

## PHASE 4 — The Moat (Month 3+)

> These tasks build long-term competitive advantage. Lower priority, data-driven.

---

### Task 20: Dynamic Pricing Confidence

Show contractors expected approval rates before submitting, based on carrier_patterns data:
- "This item typically approves at $X-Y in Baltimore County for USAA claims"
- Requires sufficient outcome data from Task 18

### Task 21: State Expansion

After all 18 MD jurisdictions are complete and validated:
- Evaluate next state based on contractor demand (likely PA, already partially built)
- Extend county-jurisdictions.ts, building-codes.ts for new state
- Add state-specific legal references

### Task 22: Expert Contractor Network

High-volume users with strong approval rates become case study partners:
- Identify top performers via usage_records + carrier_patterns
- Flag in admin dashboard
- Reach out for partnerships

---

## Phase 1 Completion Test (Gate for Phase 2)

| Test | Pass Condition |
|---|---|
| Hand output to a licensed public adjuster — can they identify the platform? | No. Zero platform branding visible anywhere. |
| Review all decimal numbers and code references across all documents | No splitting. No garbled characters. Single unbroken strings. |
| Review Supplement Estimate layout | Matches Xactimate format. 7 columns. Trade grouping correct. Subtotals correct. |
| Check O&P calculation | Formula visible: base explained, 21% applied, prior O&P subtracted, supplemental O&P shown. |
| Submit test claim with significant weather (hail or 55mph gusts) | Weather report included as last document. Contractor header only. |
| Submit test claim with mild weather only | Weather report NOT generated. |
| Submit claim with matching endorsement | ITEL checkbox visible. Upload field appears when checked. |

---

## Dependency Graph

```
Phase 1 (Tasks 1-9) — All independent, can be parallelized
  ├── Task 1: Fix bullet splitter ─── no deps
  ├── Task 2: Remove branding ─── no deps
  ├── Task 3: Fix code refs ─── no deps
  ├── Task 4: 7-col table ─── no deps
  ├── Task 5: Cover letter ─── no deps
  ├── Task 6: O&P calculator ─── no deps
  ├── Task 7: Waste calculator ─── no deps
  ├── Task 8: Weather conditional ─── no deps
  └── Task 9: Claim data QA ─── no deps

Phase 2 (Tasks 10-14) — Depends on Phase 1
  ├── Task 10: R905.2.1 field ─── no deps within phase
  ├── Task 11: Waste tiers ─── no deps within phase
  ├── Task 12: OC + IKO manufacturers ─── no deps within phase
  ├── Task 13: Endorsement triggers ─── depends on Task 6 (O&P)
  └── Task 14: ITEL workflow ─── depends on Task 13

Phase 3 (Tasks 15-19) — Depends on Phase 2
  ├── Task 15: Xactimate codes ─── no deps within phase
  ├── Task 16: Code engine citations ─── depends on Task 10
  ├── Task 17: Manufacturer justifications ─── depends on Task 12
  ├── Task 18: Outcome tracking ─── no deps within phase
  └── Task 19: Rebuttal engine ─── depends on Task 18

Phase 4 (Tasks 20-22) — Depends on Phase 3 data accumulation
```

---

## Key File Reference

| File | Purpose |
|---|---|
| `apps/contractor/src/lib/pdf/generate-supplement.ts` | Main supplement PDF — Tasks 1-4, 6, 7 |
| `apps/contractor/src/lib/pdf/generate-cover-letter.ts` | NEW — Task 5 |
| `apps/contractor/src/lib/pdf/generate-weather-report.ts` | Weather PDF — Task 8 |
| `apps/contractor/src/lib/ai/pipeline.ts` | Pipeline orchestrator — Tasks 6, 8, 9, 13 |
| `apps/contractor/src/lib/ai/analyze.ts` | AI detection — Tasks 9, 13, 16, 17 |
| `apps/contractor/src/lib/calculators/ohp.ts` | NEW — Task 6 |
| `apps/contractor/src/lib/calculators/waste.ts` | NEW — Task 7 |
| `apps/contractor/src/lib/endorsement-triggers.ts` | NEW — Task 13 |
| `apps/contractor/src/lib/rebuttal-engine.ts` | NEW — Task 19 |
| `apps/contractor/src/data/county-jurisdictions.ts` | County DB — Tasks 10, 11 |
| `apps/contractor/src/data/manufacturer-requirements.ts` | Manufacturer DB — Task 12 |
| `apps/contractor/src/data/building-codes.ts` | Building codes — Task 16 |
| `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts` | Finalize API — Tasks 5, 14 |
| `apps/contractor/src/app/api/supplements/[id]/outcome/route.ts` | NEW — Task 18 |
| `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx` | Detail page — Tasks 14, 18, 19 |
