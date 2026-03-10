# Evidence Package Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a proactive Evidence Appendix PDF to every supplement ZIP, plus a reactive Rebuttal Letter Generator for denied claims.

**Architecture:** Two independent deliverables sharing the same data sources. Part 1 is a new PDF generator (`generate-evidence-appendix.ts`) that replaces the existing Justification PDF in the download ZIP. Part 2 is a rebuttal letter generator (`generate-rebuttal.ts`) with two API routes (manual + AI-powered) and a UI card on the supplement detail page.

**Tech Stack:** jsPDF (existing), Next.js API routes, Supabase Storage, Claude API (for AI denial extraction), React (shadcn/ui components)

---

## Task 1: Evidence Appendix PDF Generator

**Files:**
- Create: `apps/contractor/src/lib/pdf/generate-evidence-appendix.ts`

This new PDF generator replaces `generate-justification.ts` in the download ZIP. It produces a comprehensive evidence document with per-item sections covering all 3 evidence pillars plus jurisdiction data.

**Step 1: Create the Evidence Appendix PDF generator**

Create `apps/contractor/src/lib/pdf/generate-evidence-appendix.ts`:

```typescript
/**
 * Evidence Appendix PDF Generator.
 *
 * Comprehensive per-item evidence document citing code authority,
 * manufacturer requirements, and jurisdiction data for each accepted
 * supplement line item. Replaces the old Justification PDF.
 */

import { jsPDF } from "jspdf";
import {
  getCodesForXactimateCode,
  ircSectionToUrl,
  type BuildingCode,
} from "@/data/building-codes";
import {
  getRequirementsForXactimateCode,
  type ManufacturerRequirement,
} from "@/data/manufacturers";
import {
  lookupCountyByZip,
  type CountyJurisdiction,
} from "@/data/county-jurisdictions";

/* ─────── Brand Colors (match supplement PDF) ─────── */

const BRAND = {
  primary: [14, 165, 233] as [number, number, number],
  primaryDark: [2, 132, 199] as [number, number, number],
  accent: [15, 23, 42] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textLight: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  bgAccent: [240, 249, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

/* ─────── Types ─────── */

export interface EvidenceAppendixData {
  claimNumber: string;
  policyNumber: string;
  carrierName: string;
  propertyAddress: string;
  propertyState: string;
  propertyZip: string;
  companyName: string;
  generatedDate: string;
  items: Array<{
    xactimate_code: string;
    description: string;
    quantity: number;
    unit: string;
    total_price: number;
    justification: string;
    irc_reference: string;
    confidence_score?: number;
    confidence_tier?: string;
  }>;
}

/* ─────── Helpers ─────── */

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ICE_BARRIER_LABELS: Record<string, string> = {
  eaves_only: "Eaves only",
  eaves_valleys_penetrations: "Eaves, valleys & penetrations",
  eaves_valleys_penetrations_extended: "Eaves, valleys, penetrations (extended)",
};

const TIER_COLORS: Record<string, [number, number, number]> = {
  high: BRAND.green,
  good: BRAND.primaryDark,
  moderate: BRAND.amber,
  low: BRAND.red,
};

/* ─────── PDF Generation ─────── */

export function generateEvidenceAppendix(data: EvidenceAppendixData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 48;
    }
  };

  // Resolve jurisdiction data once
  const countyData = data.propertyZip ? lookupCountyByZip(data.propertyZip) : undefined;
  const propertyState = data.propertyState || countyData?.state || "MD";

  // ── Header ──
  setFill(BRAND.accent);
  doc.rect(0, 0, pageWidth, 72, "F");

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.white);
  doc.text("4MARGIN", margin, 44);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(BRAND.textLight);
  doc.text("Evidence Appendix", margin + 120, 44);

  doc.setFontSize(8);
  doc.text(data.generatedDate, pageWidth - margin, 44, { align: "right" });

  y = 90;

  // ── Title ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text("EVIDENCE APPENDIX", margin, y);
  y += 6;

  setDraw(BRAND.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin + 200, y);
  y += 18;

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const subtitle = "Per-item evidence citations: building code authority, manufacturer installation " +
    "requirements, and jurisdiction data supporting each supplement line item.";
  const subLines = doc.splitTextToSize(subtitle, contentWidth);
  doc.text(subLines, margin, y);
  y += subLines.length * 10 + 12;

  // ── Claim info strip ──
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");
  y += 14;

  doc.setFontSize(8);
  const stripFields = [
    ["Claim #", data.claimNumber || "\u2014"],
    ["Carrier", data.carrierName || "\u2014"],
    ["Property", data.propertyAddress || "\u2014"],
  ];

  const stripColW = contentWidth / 3;
  stripFields.forEach(([label, value], i) => {
    const x = margin + 12 + i * stripColW;
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    const val = value.length > 32 ? value.substring(0, 30) + "..." : value;
    doc.text(val, x, y + 12);
  });

  y += 36;

  // ── Per-Item Evidence Sections ──
  data.items.forEach((item, idx) => {
    checkPage(100);

    // Item header bar
    setFill(BRAND.primary);
    doc.rect(margin, y - 4, 3, 16, "F");
    setFill(BRAND.bgAccent);
    doc.rect(margin + 3, y - 4, contentWidth - 3, 16, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.accent);
    doc.text(`${idx + 1}.`, margin + 8, y + 6);

    doc.setFontSize(8);
    setColor(BRAND.primaryDark);
    doc.text(item.xactimate_code, margin + 22, y + 6);

    doc.setFont("helvetica", "normal");
    setColor(BRAND.text);
    const codeW = doc.getTextWidth(item.xactimate_code);
    const descText = `\u2014 ${item.description}`;
    const maxDescW = contentWidth - 100 - codeW;
    const truncDesc = doc.getTextWidth(descText) > maxDescW
      ? descText.substring(0, 60) + "..."
      : descText;
    doc.text(truncDesc, margin + 28 + codeW, y + 6);

    // Price + confidence tier
    doc.setFont("helvetica", "bold");
    setColor(BRAND.green);
    doc.text(fmt(item.total_price), pageWidth - margin - 4, y + 6, { align: "right" });
    y += 20;

    // Confidence badge
    if (item.confidence_tier) {
      const tier = item.confidence_tier.toUpperCase();
      const tierColor = TIER_COLORS[item.confidence_tier] || BRAND.textMuted;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      setColor(tierColor);
      doc.text(`${tier} CONFIDENCE${item.confidence_score ? ` (${item.confidence_score}/100)` : ""}`, margin + 12, y);
      y += 10;
    }

    // ── Pillar 1: Code Authority ──
    const codes = getCodesForXactimateCode(item.xactimate_code, propertyState);
    if (codes.length > 0) {
      checkPage(60);
      drawPillarHeader(doc, margin, y, contentWidth, "\u00A7 CODE AUTHORITY");
      y += 16;

      for (const code of codes) {
        checkPage(50);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.accent);
        doc.text(`IRC ${code.section} \u2014 ${code.title}`, margin + 16, y);
        y += 10;

        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);
        const reqLines = doc.splitTextToSize(code.requirement, contentWidth - 36);
        doc.text(reqLines, margin + 16, y);
        y += reqLines.length * 9 + 4;

        // Typical objection + rebuttal
        if (code.typicalObjection) {
          checkPage(30);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          setColor(BRAND.textMuted);
          doc.text(`Typical objection: "${code.typicalObjection}"`, margin + 16, y);
          y += 10;

          doc.setFont("helvetica", "bold");
          setColor(BRAND.primaryDark);
          const rebutLines = doc.splitTextToSize(`Rebuttal: ${code.rebuttal}`, contentWidth - 36);
          doc.text(rebutLines, margin + 16, y);
          y += rebutLines.length * 9 + 4;
        }

        // Link
        const ircUrl = ircSectionToUrl(code.section);
        if (ircUrl) {
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          setColor(BRAND.primary);
          doc.textWithLink(`\u00A7 View IRC ${code.section} \u2014 ICC Digital Codes`, margin + 16, y, { url: ircUrl });
          y += 10;
        }

        y += 4;
      }
    }

    // ── Pillar 2: Manufacturer Requirements ──
    const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
    if (mfrMatches.length > 0) {
      checkPage(60);
      drawPillarHeader(doc, margin, y, contentWidth, "\u25B8 MANUFACTURER REQUIREMENTS");
      y += 16;

      for (const { manufacturer, requirement: req } of mfrMatches) {
        checkPage(50);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.accent);
        doc.text(`${manufacturer}: ${req.requirement}`, margin + 16, y);
        y += 10;

        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);
        const descLines = doc.splitTextToSize(req.description, contentWidth - 36);
        doc.text(descLines, margin + 16, y);
        y += descLines.length * 9 + 4;

        // Warranty impact
        if (req.mandatoryForWarranty) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setColor(BRAND.red);
          doc.text(`\u26A0 WARRANTY: ${req.warrantyImpact}`, margin + 16, y);
          y += 10;
        }

        // Objection + rebuttal
        if (req.typicalAdjusterObjection) {
          checkPage(30);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          setColor(BRAND.textMuted);
          doc.text(`Typical objection: "${req.typicalAdjusterObjection}"`, margin + 16, y);
          y += 10;

          doc.setFont("helvetica", "bold");
          setColor(BRAND.primaryDark);
          const rebLines = doc.splitTextToSize(`Rebuttal: ${req.rebuttal}`, contentWidth - 36);
          doc.text(rebLines, margin + 16, y);
          y += rebLines.length * 9 + 4;
        }

        // Source link
        if (req.sourceUrl) {
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          setColor(BRAND.primary);
          doc.textWithLink(`\u25B8 ${manufacturer} Installation Instructions`, margin + 16, y, { url: req.sourceUrl });
          y += 10;
        }

        y += 4;
      }
    }

    // ── Pillar 3: Jurisdiction ──
    if (countyData) {
      checkPage(50);
      drawPillarHeader(doc, margin, y, contentWidth, "\u2302 JURISDICTION");
      y += 16;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(BRAND.text);

      const jurisdLines = [
        `County: ${countyData.county} County, ${countyData.state}`,
        `Climate Zone: ${countyData.climateZone}`,
        `Design Wind Speed: ${countyData.designWindSpeed} mph${countyData.highWindZone ? " (HIGH WIND ZONE)" : ""}`,
        `Ice Barrier: ${ICE_BARRIER_LABELS[countyData.iceBarrierRequirement] || countyData.iceBarrierRequirement}`,
        `Permits: ${countyData.permit.required ? "Required" : "Not required"} \u2014 ${countyData.permit.ahjName}`,
      ];

      for (const line of jurisdLines) {
        doc.text(line, margin + 16, y);
        y += 10;
      }

      if (countyData.localAmendments.length > 0) {
        y += 2;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        setColor(BRAND.textMuted);
        for (const amendment of countyData.localAmendments) {
          checkPage(12);
          const amLines = doc.splitTextToSize(`\u2022 ${amendment}`, contentWidth - 36);
          doc.text(amLines, margin + 16, y);
          y += amLines.length * 9;
        }
      }

      if (countyData.permit.ahjUrl) {
        y += 4;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        setColor(BRAND.primary);
        doc.textWithLink(`\u2302 ${countyData.county} County Permits & Inspections`, margin + 16, y, { url: countyData.permit.ahjUrl });
        y += 10;
      }

      y += 4;
    }

    // Item divider
    y += 6;
    setDraw(BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, y, pageWidth - margin - 10, y);
    y += 16;
  });

  // ── Disclaimer ──
  checkPage(40);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const disclaimer = "This document is provided for informational and educational purposes only. " +
    "It does not constitute legal advice. All code citations reference the 2018 International Residential Code " +
    "as adopted by the applicable state jurisdiction. Verify current adoption status with local AHJ.";
  const discLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(discLines, margin, y);

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    setFill(BRAND.bgLight);
    doc.rect(0, pageHeight - 36, pageWidth, 36, "F");

    setDraw(BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.primary);
    doc.text("4MARGIN", margin, pageHeight - 18);

    doc.setFont("helvetica", "normal");
    setColor(BRAND.textLight);
    doc.text(`  |  Evidence Appendix  |  ${data.generatedDate}`, margin + 40, pageHeight - 18);

    setColor(BRAND.textMuted);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}

/* ─────── Pillar Header Helper ─────── */

function drawPillarHeader(
  doc: jsPDF,
  margin: number,
  y: number,
  contentWidth: number,
  title: string,
) {
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 12, y - 3, contentWidth - 24, 14, 2, 2, "FD");
  doc.text(title, margin + 18, y + 7);
}
```

**Step 2: Verify build compiles**

Run: `cd apps/contractor && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-evidence-appendix.ts
git commit -m "feat: add Evidence Appendix PDF generator

Per-item evidence document with 3 pillars: code authority (IRC
citations + rebuttals), manufacturer requirements (warranty impact
+ source URLs), and jurisdiction data (climate zone, wind speed,
ice barrier). Replaces old Justification PDF."
```

---

## Task 2: Wire Evidence Appendix into Download ZIP

**Files:**
- Modify: `apps/contractor/src/app/api/supplements/[id]/download/route.ts` (lines 233-264)

Replace the Justification PDF section with the Evidence Appendix.

**Step 1: Update download route imports**

Replace the justification import with the evidence appendix import:

```typescript
// REMOVE this import:
import {
  generateJustificationPdf,
  type JustificationPdfData,
} from "@/lib/pdf/generate-justification";

// ADD this import:
import {
  generateEvidenceAppendix,
  type EvidenceAppendixData,
} from "@/lib/pdf/generate-evidence-appendix";
```

**Step 2: Replace Justification section (lines 233-264) with Evidence Appendix**

Replace the entire "4. Justification & Support Points PDF" section with:

```typescript
  // ── 4. Evidence Appendix PDF ───────────────────────────
  if (items && items.length > 0) {
    try {
      const evidenceData: EvidenceAppendixData = {
        claimNumber: (claim.claim_number as string) || "",
        policyNumber: (claim.policy_number as string) || "",
        carrierName,
        propertyAddress,
        propertyState: (claim.property_state as string) || "",
        propertyZip: (claim.property_zip as string) || "",
        companyName: company?.name || "",
        generatedDate,
        items: items.map((item) => ({
          xactimate_code: item.xactimate_code,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          total_price: Number(item.total_price),
          justification: item.justification || "",
          irc_reference: item.irc_reference || "",
          confidence_score: item.confidence_score || undefined,
          confidence_tier: item.confidence_tier || undefined,
        })),
      };

      const evidencePdfBuffer = generateEvidenceAppendix(evidenceData);
      zip.file("Evidence_Appendix.pdf", evidencePdfBuffer);
    } catch (evidenceErr) {
      console.error("[download] Failed to generate Evidence Appendix:", evidenceErr);
    }
  }
```

**Step 3: Update the detail page ZIP description text**

In `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`, line 301:

Replace:
```
The ZIP includes the supplement report, justifications, weather verification, adjuster estimate, and photos — all as PDFs.
```

With:
```
The ZIP includes the supplement report, evidence appendix, cover letter, weather verification, adjuster estimate, and photos.
```

**Step 4: Build and verify**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin" && npx turbo build --filter=@4margin/contractor 2>&1 | tail -20`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add apps/contractor/src/app/api/supplements/[id]/download/route.ts \
       apps/contractor/src/app/\(dashboard\)/dashboard/supplements/[id]/page.tsx
git commit -m "feat: replace Justification PDF with Evidence Appendix in ZIP

Download route now generates Evidence_Appendix.pdf instead of
Justification_Support_Points.pdf. Evidence Appendix includes full
code authority, manufacturer requirements, and jurisdiction data."
```

---

## Task 3: Rebuttal Letter PDF Generator

**Files:**
- Create: `apps/contractor/src/lib/pdf/generate-rebuttal.ts`

**Step 1: Create the Rebuttal Letter PDF generator**

Create `apps/contractor/src/lib/pdf/generate-rebuttal.ts`:

```typescript
/**
 * Rebuttal Letter PDF Generator.
 *
 * Generates a professional letter on contractor letterhead responding
 * to denied supplement line items with code authority, manufacturer
 * requirements, and policy language.
 */

import { jsPDF } from "jspdf";
import {
  getCodesForXactimateCode,
  type BuildingCode,
} from "@/data/building-codes";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";

/* ─────── Colors (match cover letter) ─────── */

const CL = {
  accent: [15, 23, 42] as [number, number, number],
  primary: [14, 165, 233] as [number, number, number],
  primaryDark: [2, 132, 199] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

/* ─────── Types ─────── */

export interface RebuttalLetterData {
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
  propertyState: string;
  dateOfLoss: string;
  adjusterName: string;
  // Denied items
  deniedItems: Array<{
    xactimate_code: string;
    description: string;
    quantity: number;
    unit: string;
    total_price: number;
    justification: string;
    irc_reference: string;
    /** AI-extracted denial reason (if from uploaded denial letter) */
    denial_reason?: string;
  }>;
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateRebuttalLetter(data: RebuttalLetterData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 48;
    }
  };

  // ── Contractor Letterhead ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(CL.accent);
  doc.text((data.companyName || "Contractor").toUpperCase(), margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(CL.textMuted);
  const contactLine = [data.companyAddress, data.companyPhone].filter(Boolean).join("  |  ");
  if (contactLine) { doc.text(contactLine, margin, y); y += 12; }
  if (data.companyLicense) { doc.text(`License: ${data.companyLicense}`, margin, y); y += 12; }

  y += 8;
  doc.setDrawColor(CL.primary[0], CL.primary[1], CL.primary[2]);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 140, y);

  // Date
  y += 28;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(CL.text);
  doc.text(data.generatedDate, margin, y);

  // ── RE: block ──
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.text("RE: Supplemental Claim Rebuttal", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const reFields = [
    ["Claim #", data.claimNumber || "N/A"],
    ["Policy #", data.policyNumber || "N/A"],
    ["Carrier", data.carrierName || "Insurance Carrier"],
    ["Property", data.propertyAddress || "See claim file"],
    ["Date of Loss", data.dateOfLoss || "See claim file"],
    ["Adjuster", data.adjusterName || "Claims Department"],
  ];

  for (const [label, value] of reFields) {
    setColor(CL.textMuted);
    doc.text(label + ":", margin + 8, y);
    setColor(CL.text);
    doc.text(value, margin + 80, y);
    y += 14;
  }

  // ── Salutation + Opening ──
  y += 16;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(CL.text);
  doc.text(`Dear ${data.adjusterName || "Claims Department"},`, margin, y);
  y += 24;

  const opening = [
    "We are writing to formally dispute the denial of the following supplemental line items",
    "for the above-referenced claim. Each item below is supported by applicable building code",
    "sections, manufacturer installation requirements, and/or policy language.",
  ];
  for (const line of opening) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 10;

  // ── Per-Item Rebuttals ──
  for (let i = 0; i < data.deniedItems.length; i++) {
    const item = data.deniedItems[i];
    checkPage(80);

    // Item header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(CL.accent);
    doc.text(`Item ${i + 1}: ${item.xactimate_code} \u2014 ${item.description}`, margin, y);
    y += 14;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(CL.textMuted);
    doc.text(`${item.quantity} ${item.unit} \u2014 ${fmt(item.total_price)}`, margin + 8, y);
    y += 16;

    // Denial reason (if AI-extracted)
    if (item.denial_reason) {
      checkPage(30);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      setColor(CL.red);
      doc.text("Stated denial reason:", margin + 8, y);
      y += 12;
      setColor(CL.text);
      const reasonLines = doc.splitTextToSize(`"${item.denial_reason}"`, contentWidth - 24);
      doc.text(reasonLines, margin + 8, y);
      y += reasonLines.length * 11 + 8;
    }

    // Code authority rebuttal
    const codes = getCodesForXactimateCode(item.xactimate_code, data.propertyState || "MD");
    if (codes.length > 0) {
      checkPage(40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(CL.primaryDark);
      doc.text("Code Authority:", margin + 8, y);
      y += 12;

      for (const code of codes) {
        checkPage(30);
        doc.setFont("helvetica", "normal");
        setColor(CL.text);
        const codeText = `IRC ${code.section} (${code.title}): ${code.rebuttal}`;
        const codeLines = doc.splitTextToSize(codeText, contentWidth - 28);
        doc.text(codeLines, margin + 16, y);
        y += codeLines.length * 11 + 4;
      }
    }

    // Manufacturer requirement rebuttal
    const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
    if (mfrMatches.length > 0) {
      checkPage(40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(CL.primaryDark);
      doc.text("Manufacturer Requirement:", margin + 8, y);
      y += 12;

      for (const { manufacturer, requirement: req } of mfrMatches) {
        checkPage(30);
        doc.setFont("helvetica", "normal");
        setColor(CL.text);
        const mfrText = `${manufacturer}: ${req.rebuttal}${req.mandatoryForWarranty ? ` (${req.warrantyImpact})` : ""}`;
        const mfrLines = doc.splitTextToSize(mfrText, contentWidth - 28);
        doc.text(mfrLines, margin + 16, y);
        y += mfrLines.length * 11 + 4;
      }
    }

    // Divider between items
    if (i < data.deniedItems.length - 1) {
      y += 6;
      doc.setDrawColor(CL.border[0], CL.border[1], CL.border[2]);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y, pageWidth - margin - 10, y);
      y += 14;
    }
  }

  // ── Closing ──
  y += 20;
  checkPage(100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(CL.text);

  const closing = [
    "Based on the above code citations and manufacturer requirements, we respectfully",
    "request reconsideration and approval of these supplemental items. These items are",
    "necessary for a code-compliant, manufacturer-warranted roof system.",
    "",
    "We are available to discuss any of these items in detail at your convenience.",
    "",
    "",
    "Respectfully,",
    "",
    data.companyName || "Contractor",
    data.companyPhone || "",
  ];

  for (const line of closing) {
    doc.text(line, margin, y);
    y += line === "" ? 8 : 14;
  }

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    setColor(CL.textMuted);
    doc.text(
      "This document is provided for informational and educational purposes only and does not constitute legal advice.",
      margin, pageHeight - 28
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `${data.companyName || "Contractor"}  |  ${data.generatedDate}`,
      margin, pageHeight - 18
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}
```

**Step 2: Verify build**

Run: `cd apps/contractor && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-rebuttal.ts
git commit -m "feat: add Rebuttal Letter PDF generator

Professional letterhead rebuttal with per-denied-item sections
citing code authority, manufacturer requirements, and optional
AI-extracted denial reasons."
```

---

## Task 4: Rebuttal API Routes + Migration

**Files:**
- Create: `apps/contractor/supabase/migrations/037_rebuttal_support.sql`
- Create: `apps/contractor/src/app/api/supplements/[id]/rebuttal/route.ts`
- Create: `apps/contractor/src/app/api/supplements/[id]/rebuttal/ai/route.ts`

**Step 1: Create migration**

```sql
-- 037_rebuttal_support.sql
-- Adds rebuttal PDF URL column for supplement denial responses

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS rebuttal_pdf_url TEXT;

COMMENT ON COLUMN supplements.rebuttal_pdf_url IS 'Storage path for generated rebuttal letter PDF';
```

**Step 2: Create manual rebuttal route**

Create `apps/contractor/src/app/api/supplements/[id]/rebuttal/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateRebuttalLetter,
  type RebuttalLetterData,
} from "@/lib/pdf/generate-rebuttal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deniedItemIds } = body as { deniedItemIds: string[] };

    if (!deniedItemIds || deniedItemIds.length === 0) {
      return NextResponse.json({ error: "No denied items selected" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch supplement + claim + company
    const { data: supplement, error } = await supabase
      .from("supplements")
      .select("*, claims(*, carriers(*))")
      .eq("id", supplementId)
      .single();

    if (error || !supplement) {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }

    const claim = supplement.claims as Record<string, unknown>;
    const carrier = (claim?.carriers as Record<string, unknown>) || null;

    // Fetch denied items
    const { data: items } = await admin
      .from("supplement_items")
      .select("*")
      .in("id", deniedItemIds)
      .eq("supplement_id", supplementId);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No matching items found" }, { status: 404 });
    }

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", supplement.company_id)
      .single();

    const companyAddress = company
      ? [company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")
      : "";

    const letterData: RebuttalLetterData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      carrierName: (carrier?.name as string) || "",
      propertyAddress: [claim.property_address, claim.property_city, claim.property_state, claim.property_zip]
        .filter(Boolean).join(", "),
      propertyState: (claim.property_state as string) || "",
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      adjusterName: (claim.adjuster_name as string) || "",
      deniedItems: items.map((item) => ({
        xactimate_code: item.xactimate_code,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        total_price: Number(item.total_price),
        justification: item.justification || "",
        irc_reference: item.irc_reference || "",
      })),
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    // Generate PDF
    const pdfBuffer = generateRebuttalLetter(letterData);

    // Upload to storage
    const timestamp = Date.now();
    const pdfPath = `${supplement.company_id}/${supplementId}/rebuttal-${timestamp}.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("[rebuttal] Upload failed:", uploadErr);
      return NextResponse.json({ error: "Failed to upload rebuttal PDF" }, { status: 500 });
    }

    // Update supplement record
    await admin.from("supplements").update({ rebuttal_pdf_url: pdfPath }).eq("id", supplementId);

    // Generate signed URL for immediate download
    const { data: signedData } = await admin.storage
      .from("supplements")
      .createSignedUrl(pdfPath, 3600);

    return NextResponse.json({
      success: true,
      pdfPath,
      downloadUrl: signedData?.signedUrl || null,
      itemCount: items.length,
    });
  } catch (err) {
    console.error("[rebuttal] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate rebuttal" },
      { status: 500 }
    );
  }
}
```

**Step 3: Create AI-powered rebuttal route**

Create `apps/contractor/src/app/api/supplements/[id]/rebuttal/ai/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateRebuttalLetter,
  type RebuttalLetterData,
} from "@/lib/pdf/generate-rebuttal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const denialFile = formData.get("denialLetter") as File | null;

    if (!denialFile) {
      return NextResponse.json({ error: "No denial letter uploaded" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch supplement + claim + company + items
    const { data: supplement, error } = await supabase
      .from("supplements")
      .select("*, claims(*, carriers(*))")
      .eq("id", supplementId)
      .single();

    if (error || !supplement) {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }

    const claim = supplement.claims as Record<string, unknown>;
    const carrier = (claim?.carriers as Record<string, unknown>) || null;

    const { data: allItems } = await admin
      .from("supplement_items")
      .select("*")
      .eq("supplement_id", supplementId)
      .in("status", ["accepted", "detected"]);

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({ error: "No supplement items found" }, { status: 404 });
    }

    // Convert file to base64 for Claude Vision
    const fileBuffer = await denialFile.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const mediaType = denialFile.type === "application/pdf" ? "application/pdf" : "image/jpeg";

    // Use Claude to extract denied items + reasons from denial letter
    const anthropic = new Anthropic();
    const itemList = allItems.map((i) => `${i.xactimate_code}: ${i.description}`).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analyze this insurance carrier denial/response letter. Extract which supplement line items were denied and the stated reason for each denial.

Here are the supplement items that were submitted:
${itemList}

Return a JSON array with objects matching this format:
[
  {
    "xactimate_code": "RFG STRP",
    "denial_reason": "the stated reason for denial from the letter"
  }
]

Only include items that were explicitly denied or disputed. If the letter denies all items, include all of them. Return ONLY the JSON array, no markdown.`,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    let deniedCodes: Array<{ xactimate_code: string; denial_reason: string }> = [];
    try {
      deniedCodes = JSON.parse(responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      console.error("[rebuttal/ai] Failed to parse Claude response:", responseText);
      return NextResponse.json({ error: "Could not parse denial letter" }, { status: 422 });
    }

    if (deniedCodes.length === 0) {
      return NextResponse.json({ error: "No denied items found in the letter" }, { status: 422 });
    }

    // Match denied codes to actual items
    const deniedCodeSet = new Set(deniedCodes.map((d) => d.xactimate_code));
    const denialReasons = new Map(deniedCodes.map((d) => [d.xactimate_code, d.denial_reason]));
    const matchedItems = allItems.filter((i) => deniedCodeSet.has(i.xactimate_code));

    if (matchedItems.length === 0) {
      return NextResponse.json({ error: "No denied items matched supplement items" }, { status: 422 });
    }

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", supplement.company_id)
      .single();

    const companyAddress = company
      ? [company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")
      : "";

    const letterData: RebuttalLetterData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      carrierName: (carrier?.name as string) || "",
      propertyAddress: [claim.property_address, claim.property_city, claim.property_state, claim.property_zip]
        .filter(Boolean).join(", "),
      propertyState: (claim.property_state as string) || "",
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      adjusterName: (claim.adjuster_name as string) || "",
      deniedItems: matchedItems.map((item) => ({
        xactimate_code: item.xactimate_code,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        total_price: Number(item.total_price),
        justification: item.justification || "",
        irc_reference: item.irc_reference || "",
        denial_reason: denialReasons.get(item.xactimate_code),
      })),
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    // Generate + upload
    const pdfBuffer = generateRebuttalLetter(letterData);
    const timestamp = Date.now();
    const pdfPath = `${supplement.company_id}/${supplementId}/rebuttal-${timestamp}.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: "Failed to upload rebuttal PDF" }, { status: 500 });
    }

    await admin.from("supplements").update({ rebuttal_pdf_url: pdfPath }).eq("id", supplementId);

    const { data: signedData } = await admin.storage
      .from("supplements")
      .createSignedUrl(pdfPath, 3600);

    return NextResponse.json({
      success: true,
      pdfPath,
      downloadUrl: signedData?.signedUrl || null,
      itemCount: matchedItems.length,
      deniedItems: deniedCodes,
    });
  } catch (err) {
    console.error("[rebuttal/ai] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process denial letter" },
      { status: 500 }
    );
  }
}
```

**Step 4: Verify build**

Run: `npx turbo build --filter=@4margin/contractor 2>&1 | tail -20`

**Step 5: Commit**

```bash
git add apps/contractor/supabase/migrations/037_rebuttal_support.sql \
       apps/contractor/src/app/api/supplements/[id]/rebuttal/route.ts \
       apps/contractor/src/app/api/supplements/[id]/rebuttal/ai/route.ts
git commit -m "feat: add rebuttal API routes + migration 037

Manual rebuttal: POST /api/supplements/[id]/rebuttal with deniedItemIds
AI rebuttal: POST /api/supplements/[id]/rebuttal/ai with denial letter PDF
Both generate branded rebuttal letter and upload to Supabase Storage."
```

---

## Task 5: Rebuttal Tools UI Card

**Files:**
- Create: `apps/contractor/src/components/supplements/rebuttal-tools.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`

**Step 1: Create RebuttalTools component**

Create `apps/contractor/src/components/supplements/rebuttal-tools.tsx`:

```typescript
"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RebuttalItem {
  id: string;
  xactimate_code: string;
  description: string;
  total_price: number;
}

interface RebuttalToolsProps {
  supplementId: string;
  items: RebuttalItem[];
  existingRebuttalUrl: string | null;
}

export function RebuttalTools({ supplementId, items, existingRebuttalUrl }: RebuttalToolsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [uploadingAi, setUploadingAi] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(existingRebuttalUrl);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleManualRebuttal = async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/supplements/${supplementId}/rebuttal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deniedItemIds: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate rebuttal");

      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleAiUpload = async (file: File) => {
    setUploadingAi(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("denialLetter", file);

      const res = await fetch(`/api/supplements/${supplementId}/rebuttal/ai`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process denial letter");

      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI processing failed");
    } finally {
      setUploadingAi(false);
    }
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Rebuttal Tools
          <Badge variant="destructive" className="ml-2 text-[10px]">DENIED</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Select denied items:</p>
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
              {selectedIds.size === items.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs font-mono text-sky-600 shrink-0">{item.xactimate_code}</span>
                <span className="text-xs truncate flex-1">{item.description}</span>
                <span className="text-xs font-medium text-gray-500 shrink-0">{fmt(item.total_price)}</span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleManualRebuttal}
            disabled={selectedIds.size === 0 || generating}
            className="w-full mt-3"
            variant="destructive"
          >
            {generating ? "Generating..." : `Generate Rebuttal Letter (${selectedIds.size} items)`}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-red-200" />
          <span className="text-[10px] font-medium text-red-400 uppercase">or</span>
          <div className="flex-1 h-px bg-red-200" />
        </div>

        {/* AI Upload */}
        <div>
          <p className="text-sm font-medium mb-2">Upload denial letter for AI analysis:</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAiUpload(file);
            }}
          />
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={uploadingAi}
            onClick={() => fileRef.current?.click()}
          >
            {uploadingAi ? "Analyzing denial letter..." : "Upload Denial Letter (PDF/Image)"}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1">
            AI will extract denied items and generate a point-by-point rebuttal.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-100 rounded-md px-3 py-2">{error}</p>
        )}

        {/* Download */}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Rebuttal Letter
          </a>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Wire RebuttalTools into supplement detail page**

In `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`:

Add import at top:
```typescript
import { RebuttalTools } from "@/components/supplements/rebuttal-tools";
```

Add rebuttal URL signed URL generation (after the `weatherPdfUrl` block, around line 106):
```typescript
  // Generate signed URL for rebuttal PDF
  let rebuttalPdfUrl: string | null = null;
  if (supplement.rebuttal_pdf_url) {
    rebuttalPdfUrl = await getSignedUrl("supplements", supplement.rebuttal_pdf_url);
  }
```

Add the RebuttalTools card right after the `SupplementChat` block (after line 253):
```tsx
      {/* Rebuttal Tools — shown for denied/partially approved supplements */}
      {(status === "denied" || status === "partially_approved") && lineItems && lineItems.length > 0 && (
        <RebuttalTools
          supplementId={id}
          items={lineItems.map((item) => ({
            id: item.id,
            xactimate_code: item.xactimate_code,
            description: item.description,
            total_price: Number(item.total_price),
          }))}
          existingRebuttalUrl={rebuttalPdfUrl}
        />
      )}
```

**Step 3: Build and verify**

Run: `npx turbo build --filter=@4margin/contractor 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add apps/contractor/src/components/supplements/rebuttal-tools.tsx \
       apps/contractor/src/app/\(dashboard\)/dashboard/supplements/[id]/page.tsx
git commit -m "feat: add Rebuttal Tools UI card on supplement detail page

Shows for denied/partially_approved supplements. Two paths:
manual item selection + generate, or upload denial letter for
AI-powered extraction + rebuttal generation."
```

---

## Task 6: Build + Push

**Step 1: Full build verification**

Run: `npx turbo build --filter=@4margin/contractor`
Expected: Build succeeds

**Step 2: Push to Vercel**

```bash
git push
```
