# HO Advocacy Scripts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-generated homeowner advocacy scripts (pre-inspection prep + post-denial response) with dual output: contractor talking points in-app + HO-facing PDF.

**Architecture:** Single API route dispatches to Claude with scenario-specific prompts built from the policy engine knowledge base, building codes, manufacturer requirements, and county jurisdictions. Response is structured JSON parsed into contractor sections (rendered in-app) and HO sections (rendered into a branded jsPDF document).

**Tech Stack:** Claude API (Anthropic SDK), jsPDF, Next.js API routes, Supabase Storage, React (shadcn/ui)

---

## Task 1: Advocacy Prompt Builder

**Files:**
- Create: `apps/contractor/src/lib/ai/advocacy-prompt.ts`

This builds the system + user prompts for each scenario, injecting all relevant data sources.

**Step 1: Create the prompt builder**

```typescript
/**
 * Advocacy Script Prompt Builder.
 *
 * Assembles Claude prompts for homeowner advocacy scripts, injecting
 * policy knowledge, building codes, manufacturer requirements, and
 * claim context per scenario.
 */

import {
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  CARRIER_ENDORSEMENT_FORMS,
  DEPRECIATION_METHODS,
  getLandminesForClaimType,
  getClaimTypeFocusPrompt,
  type LandmineRule,
  type CarrierEndorsementForm,
} from "@/data/policy-knowledge";
import { BUILDING_CODES, type BuildingCode } from "@/data/building-codes";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";
import { lookupCountyByZip, type CountyJurisdiction } from "@/data/county-jurisdictions";

/* ─────── Types ─────── */

export type AdvocacyScenario = "pre_inspection" | "post_denial";

export interface AdvocacyContext {
  scenario: AdvocacyScenario;
  // Claim
  carrierName: string;
  propertyState: string;
  propertyZip: string;
  claimType: string; // "hail" | "wind" | "wind_hail" | etc.
  dateOfLoss: string;
  claimNumber: string;
  policyNumber: string;
  // Policy
  policyAnalysis: Record<string, unknown> | null;
  // Supplement items
  items: Array<{
    xactimate_code: string;
    description: string;
    total_price: number;
    justification: string;
    status: string;
  }>;
  supplementTotal: number;
  // Company
  companyName: string;
}

export interface AdvocacyScript {
  scenario: AdvocacyScenario;
  contractorSections: Array<{
    title: string;
    bullets: string[];
  }>;
  hoSections: Array<{
    title: string;
    content: string;
  }>;
}

/* ─────── Prompt Builder ─────── */

export function buildAdvocacyPrompt(ctx: AdvocacyContext): {
  system: string;
  user: string;
} {
  const county = ctx.propertyZip ? lookupCountyByZip(ctx.propertyZip) : undefined;
  const landmines = getLandminesForClaimType(ctx.claimType);
  const claimFocus = getClaimTypeFocusPrompt(ctx.claimType);
  const carrierForms = CARRIER_ENDORSEMENT_FORMS.filter(
    (f) => f.carrier.toLowerCase() === ctx.carrierName.toLowerCase()
  );
  const highObjectionCodes = BUILDING_CODES.filter(
    (c) => c.carrierObjectionRate === "high" &&
      c.jurisdictions.some((j) => j.state === ctx.propertyState.toUpperCase())
  );

  // System prompt
  const system = `You are a roofing insurance claim expert generating homeowner advocacy scripts for contractors. You produce structured, actionable content in two formats:

1. CONTRACTOR TALKING POINTS — bullet-point coaching scripts the contractor uses internally
2. HOMEOWNER GUIDE — professional, plain-English content for a PDF the homeowner receives

RULES:
- All content is educational, NOT legal advice
- Never reference 4Margin by name in HO-facing content — use "your contractor" or "your roofing professional"
- Be specific — cite code sections, manufacturer names, dollar amounts when available
- Use plain English for HO content — no industry jargon
- For contractor content — use industry terminology, be direct and tactical
- Always include a disclaimer that this is educational information, not legal advice

You MUST respond with valid JSON matching this exact format:
{
  "scenario": "${ctx.scenario}",
  "contractorSections": [
    { "title": "Section Title", "bullets": ["Point 1", "Point 2"] }
  ],
  "hoSections": [
    { "title": "Section Title", "content": "Paragraph text for the homeowner PDF." }
  ]
}

Return ONLY the JSON object. No markdown, no commentary.`;

  // User prompt — scenario-specific
  const user = ctx.scenario === "pre_inspection"
    ? buildPreInspectionPrompt(ctx, landmines, carrierForms, highObjectionCodes, county, claimFocus)
    : buildPostDenialPrompt(ctx, landmines, carrierForms, highObjectionCodes, county, claimFocus);

  return { system, user };
}

/* ─────── Pre-Inspection Prompt ─────── */

function buildPreInspectionPrompt(
  ctx: AdvocacyContext,
  landmines: LandmineRule[],
  carrierForms: CarrierEndorsementForm[],
  highObjectionCodes: BuildingCode[],
  county: CountyJurisdiction | undefined,
  claimFocus: string,
): string {
  const sections: string[] = [];

  sections.push(`## SCENARIO: PRE-INSPECTION PREP`);
  sections.push(`Generate advocacy scripts for a homeowner BEFORE the insurance adjuster inspects the property.`);
  sections.push(``);
  sections.push(`## CLAIM CONTEXT`);
  sections.push(`Carrier: ${ctx.carrierName || "Unknown"}`);
  sections.push(`Property State: ${ctx.propertyState}`);
  sections.push(`Claim Type: ${ctx.claimType || "wind_hail"}`);
  sections.push(`Date of Loss: ${ctx.dateOfLoss || "N/A"}`);

  if (claimFocus) {
    sections.push(``);
    sections.push(`## CLAIM TYPE FOCUS`);
    sections.push(claimFocus);
  }

  // Supplement items detected
  if (ctx.items.length > 0) {
    sections.push(``);
    sections.push(`## SUPPLEMENT ITEMS DETECTED (${ctx.items.length} items, $${ctx.supplementTotal.toFixed(2)} total)`);
    for (const item of ctx.items.slice(0, 15)) {
      sections.push(`- ${item.xactimate_code}: ${item.description} ($${item.total_price.toFixed(2)})`);
    }
  }

  // Policy landmines
  if (landmines.length > 0) {
    sections.push(``);
    sections.push(`## POLICY LANDMINES FOR THIS CLAIM TYPE`);
    for (const lm of landmines) {
      sections.push(`- [${lm.severity.toUpperCase()}] ${lm.name}: ${lm.impact}`);
      sections.push(`  Action: ${lm.actionItem}`);
    }
  }

  // Carrier-specific forms
  if (carrierForms.length > 0) {
    sections.push(``);
    sections.push(`## CARRIER-SPECIFIC ENDORSEMENTS (${ctx.carrierName})`);
    for (const form of carrierForms) {
      sections.push(`- Form ${form.formNumber}: ${form.name} — ${form.effect} [${form.severity}]`);
    }
  }

  // High-objection building codes
  if (highObjectionCodes.length > 0) {
    sections.push(``);
    sections.push(`## FREQUENTLY DISPUTED BUILDING CODES (${ctx.propertyState})`);
    for (const code of highObjectionCodes.slice(0, 8)) {
      sections.push(`- IRC ${code.section} (${code.title}): Adjuster objection: "${code.typicalObjection}" → Rebuttal: ${code.rebuttal}`);
    }
  }

  // County jurisdiction
  if (county) {
    sections.push(``);
    sections.push(`## JURISDICTION DATA`);
    sections.push(`County: ${county.county}, ${county.state}`);
    sections.push(`Climate Zone: ${county.climateZone} | Wind Speed: ${county.designWindSpeed} mph${county.highWindZone ? " (HIGH WIND)" : ""}`);
    sections.push(`Ice Barrier: ${county.iceBarrierRequirement}`);
    sections.push(`Permits: ${county.permit.required ? "Required" : "Not required"} — ${county.permit.ahjName}`);
  }

  // Policy analysis
  if (ctx.policyAnalysis) {
    sections.push(``);
    sections.push(`## POLICY ANALYSIS RESULTS`);
    sections.push(JSON.stringify(ctx.policyAnalysis, null, 2).slice(0, 1500));
  }

  sections.push(``);
  sections.push(`## INSTRUCTIONS`);
  sections.push(`Generate CONTRACTOR talking points with these sections:`);
  sections.push(`1. "Items Adjusters Commonly Miss" — specific items from the supplement that adjusters undercount`);
  sections.push(`2. "What to Document During Inspection" — photos, measurements, adjuster statements to capture`);
  sections.push(`3. "Carrier Tactics to Watch For" — specific to ${ctx.carrierName || "this carrier"}`);
  sections.push(`4. "Policy Landmines" — what the HO should know about their coverage`);
  sections.push(``);
  sections.push(`Generate HOMEOWNER guide sections:`);
  sections.push(`1. "What to Expect" — the inspection process explained simply`);
  sections.push(`2. "Your Rights During the Inspection" — what they can ask, document, request`);
  sections.push(`3. "Questions to Ask the Adjuster" — specific questions based on this claim`);
  sections.push(`4. "Protecting Your Claim" — documentation tips, next steps`);

  return sections.join("\n");
}

/* ─────── Post-Denial Prompt ─────── */

function buildPostDenialPrompt(
  ctx: AdvocacyContext,
  landmines: LandmineRule[],
  carrierForms: CarrierEndorsementForm[],
  highObjectionCodes: BuildingCode[],
  county: CountyJurisdiction | undefined,
  claimFocus: string,
): string {
  const sections: string[] = [];

  sections.push(`## SCENARIO: POST-DENIAL RESPONSE`);
  sections.push(`Generate advocacy scripts for a homeowner whose supplement was DENIED or partially approved.`);
  sections.push(``);
  sections.push(`## CLAIM CONTEXT`);
  sections.push(`Carrier: ${ctx.carrierName || "Unknown"}`);
  sections.push(`Property State: ${ctx.propertyState}`);
  sections.push(`Claim Type: ${ctx.claimType || "wind_hail"}`);
  sections.push(`Date of Loss: ${ctx.dateOfLoss || "N/A"}`);

  // Denied/disputed items
  const deniedItems = ctx.items.filter((i) => i.status === "accepted" || i.status === "detected");
  if (deniedItems.length > 0) {
    sections.push(``);
    sections.push(`## DENIED/DISPUTED ITEMS ($${ctx.supplementTotal.toFixed(2)} at stake)`);
    for (const item of deniedItems) {
      sections.push(`- ${item.xactimate_code}: ${item.description} ($${item.total_price.toFixed(2)})`);
      if (item.justification) {
        sections.push(`  Justification: ${item.justification.slice(0, 200)}`);
      }

      // Add manufacturer rebuttals for this item
      const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
      if (mfrMatches.length > 0) {
        for (const { manufacturer, requirement: req } of mfrMatches.slice(0, 2)) {
          sections.push(`  ${manufacturer} rebuttal: ${req.rebuttal.slice(0, 150)}`);
          if (req.mandatoryForWarranty) {
            sections.push(`  ⚠ WARRANTY IMPACT: ${req.warrantyImpact}`);
          }
        }
      }
    }
  }

  // Policy landmines + carrier forms + building codes (same as pre-inspection)
  if (landmines.length > 0) {
    sections.push(``);
    sections.push(`## POLICY LANDMINES`);
    for (const lm of landmines) {
      sections.push(`- [${lm.severity.toUpperCase()}] ${lm.name}: ${lm.impact}`);
    }
  }

  if (carrierForms.length > 0) {
    sections.push(``);
    sections.push(`## CARRIER ENDORSEMENTS (${ctx.carrierName})`);
    for (const form of carrierForms) {
      sections.push(`- Form ${form.formNumber}: ${form.name} — ${form.effect} [${form.severity}]`);
    }
  }

  if (highObjectionCodes.length > 0) {
    sections.push(``);
    sections.push(`## RELEVANT BUILDING CODES`);
    for (const code of highObjectionCodes.slice(0, 8)) {
      sections.push(`- IRC ${code.section}: "${code.typicalObjection}" → ${code.rebuttal}`);
    }
  }

  if (county) {
    sections.push(``);
    sections.push(`## JURISDICTION`);
    sections.push(`${county.county} County, ${county.state} — Climate Zone ${county.climateZone}, ${county.designWindSpeed} mph wind`);
  }

  if (ctx.policyAnalysis) {
    sections.push(``);
    sections.push(`## POLICY ANALYSIS`);
    sections.push(JSON.stringify(ctx.policyAnalysis, null, 2).slice(0, 1500));
  }

  // Favorable provisions
  sections.push(``);
  sections.push(`## FAVORABLE PROVISIONS TO CITE`);
  for (const prov of FAVORABLE_PROVISIONS) {
    sections.push(`- ${prov.name}: ${prov.supplementRelevance}`);
  }

  sections.push(``);
  sections.push(`## INSTRUCTIONS`);
  sections.push(`Generate CONTRACTOR talking points with these sections:`);
  sections.push(`1. "What the Denial Means" — translate denial language into plain terms`);
  sections.push(`2. "Re-Inspection Strategy" — how to request and what to document`);
  sections.push(`3. "Appraisal Demand" — when to invoke, process, HO rights`);
  sections.push(`4. "Escalation Path" — DOI complaint, when to involve a public adjuster`);
  sections.push(`5. "Dollar Impact" — what the HO loses if they accept the denial`);
  sections.push(``);
  sections.push(`Generate HOMEOWNER guide sections:`);
  sections.push(`1. "What Happened With Your Claim" — plain-English summary`);
  sections.push(`2. "Why These Items Matter" — code compliance, warranty, safety`);
  sections.push(`3. "Your Options" — re-inspection, appraisal, DOI complaint explained simply`);
  sections.push(`4. "Next Steps" — timeline and what to do right now`);
  sections.push(`5. "Your Rights as a Policyholder" — state-specific rights in ${ctx.propertyState}`);

  return sections.join("\n");
}
```

**Step 2: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/ai/advocacy-prompt.ts
git commit -m "feat: add advocacy script prompt builder

Assembles scenario-specific Claude prompts for pre-inspection
and post-denial HO advocacy scripts, injecting policy landmines,
carrier endorsements, building codes, and jurisdiction data.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Advocacy PDF Generator

**Files:**
- Create: `apps/contractor/src/lib/pdf/generate-advocacy-pdf.ts`

Branded jsPDF document for homeowner-facing advocacy guide.

**Step 1: Create the PDF generator**

```typescript
/**
 * Advocacy Script PDF Generator — Homeowner-Facing Guide.
 *
 * Produces a branded PDF from the hoSections of an AdvocacyScript.
 * Designed for the homeowner to read — professional, plain-English,
 * no industry jargon.
 */

import { jsPDF } from "jspdf";
import type { AdvocacyScript } from "@/lib/ai/advocacy-prompt";

/* ─────── Colors ─────── */

const BRAND = {
  accent: [15, 23, 42] as [number, number, number],
  primary: [14, 165, 233] as [number, number, number],
  primaryDark: [2, 132, 199] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textLight: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/* ─────── Types ─────── */

export interface AdvocacyPdfData {
  script: AdvocacyScript;
  companyName: string;
  companyPhone: string;
  propertyAddress: string;
  carrierName: string;
  claimNumber: string;
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateAdvocacyPdf(data: AdvocacyPdfData): ArrayBuffer {
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

  const title = data.script.scenario === "pre_inspection"
    ? "YOUR UPCOMING INSPECTION"
    : "YOUR CLAIM RIGHTS";

  const subtitle = data.script.scenario === "pre_inspection"
    ? "A guide to help you prepare for your insurance inspection"
    : "Understanding your options after a claim decision";

  // ── Header ──
  setFill(BRAND.accent);
  doc.rect(0, 0, pageWidth, 72, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.white);
  doc.text("Prepared by Your Roofing Professional", margin, 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(BRAND.textLight);
  doc.text(data.companyName || "", margin, 44);
  doc.text(data.generatedDate, pageWidth - margin, 44, { align: "right" });

  y = 90;

  // ── Title ──
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text(title, margin, y);
  y += 8;

  setDraw(BRAND.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin + 260, y);
  y += 18;

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const subLines = doc.splitTextToSize(subtitle, contentWidth);
  doc.text(subLines, margin, y);
  y += subLines.length * 11 + 12;

  // ── Claim info strip ──
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, "FD");
  y += 12;

  doc.setFontSize(8);
  const fields = [
    ["Carrier", data.carrierName || "\u2014"],
    ["Claim #", data.claimNumber || "\u2014"],
    ["Property", data.propertyAddress || "\u2014"],
  ];
  const colW = contentWidth / 3;
  fields.forEach(([label, value], i) => {
    const x = margin + 12 + i * colW;
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    const val = value.length > 28 ? value.substring(0, 26) + "..." : value;
    doc.text(val, x, y + 10);
  });

  y += 32;

  // ── Content Sections ──
  for (const section of data.script.hoSections) {
    checkPage(60);

    // Section title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.primaryDark);
    doc.text(section.title, margin, y);
    y += 6;

    setDraw(BRAND.primary);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + Math.min(doc.getTextWidth(section.title) * 1.4, 200), y);
    y += 14;

    // Section content
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    setColor(BRAND.text);
    const lines = doc.splitTextToSize(section.content, contentWidth);

    for (let i = 0; i < lines.length; i++) {
      checkPage(12);
      doc.text(lines[i], margin, y);
      y += 12;
    }

    y += 12;
  }

  // ── Disclaimer ──
  checkPage(50);
  y += 8;
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 44, 3, 3, "FD");
  y += 14;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const disclaimer = "IMPORTANT: This document is provided for informational and educational purposes only. " +
    "It does not constitute legal advice or create an attorney-client relationship. Insurance policies vary " +
    "and you should consult with a licensed public adjuster or attorney for advice specific to your situation.";
  const discLines = doc.splitTextToSize(disclaimer, contentWidth - 20);
  doc.text(discLines, margin + 10, y);

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
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textLight);
    doc.text(`Prepared by ${data.companyName || "Your Contractor"}  |  ${data.generatedDate}`, margin, pageHeight - 18);

    setColor(BRAND.textMuted);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}
```

**Step 2: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-advocacy-pdf.ts
git commit -m "feat: add HO advocacy PDF generator

Branded homeowner-facing PDF with scenario-specific title,
claim info strip, content sections, and legal disclaimer.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Advocacy API Route

**Files:**
- Create: `apps/contractor/src/app/api/supplements/[id]/advocacy/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildAdvocacyPrompt,
  type AdvocacyScenario,
  type AdvocacyScript,
} from "@/lib/ai/advocacy-prompt";
import {
  generateAdvocacyPdf,
  type AdvocacyPdfData,
} from "@/lib/pdf/generate-advocacy-pdf";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const scenario = body.scenario as AdvocacyScenario;
    if (scenario !== "pre_inspection" && scenario !== "post_denial") {
      return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch supplement + claim + carrier
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

    // Fetch items
    const { data: items } = await admin
      .from("supplement_items")
      .select("*")
      .eq("supplement_id", supplementId)
      .in("status", ["accepted", "detected"])
      .order("category");

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip")
      .eq("id", supplement.company_id)
      .single();

    // Determine claim type from damage_types
    const damageTypes = (claim.damage_types as string[]) || [];
    const claimType = damageTypes.includes("hail") && damageTypes.includes("wind")
      ? "wind_hail"
      : damageTypes[0] || "wind_hail";

    // Build prompt
    const advocacyContext = {
      scenario,
      carrierName: (carrier?.name as string) || "",
      propertyState: (claim.property_state as string) || "",
      propertyZip: (claim.property_zip as string) || "",
      claimType,
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      policyAnalysis: supplement.policy_analysis as Record<string, unknown> | null,
      items: (items || []).map((i) => ({
        xactimate_code: i.xactimate_code,
        description: i.description,
        total_price: Number(i.total_price),
        justification: i.justification || "",
        status: i.status,
      })),
      supplementTotal: Number(supplement.supplement_total || 0),
      companyName: company?.name || "",
    };

    const { system, user: userPrompt } = buildAdvocacyPrompt(advocacyContext);

    // Call Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse response
    let script: AdvocacyScript;
    try {
      script = JSON.parse(responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      console.error("[advocacy] Failed to parse response:", responseText.slice(0, 500));
      return NextResponse.json({ error: "Failed to generate advocacy script" }, { status: 500 });
    }

    // Generate PDF
    const propertyAddress = [claim.property_address, claim.property_city, claim.property_state, claim.property_zip]
      .filter(Boolean).join(", ");

    const pdfData: AdvocacyPdfData = {
      script,
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      propertyAddress,
      carrierName: (carrier?.name as string) || "",
      claimNumber: (claim.claim_number as string) || "",
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    const pdfBuffer = generateAdvocacyPdf(pdfData);

    // Upload PDF
    const timestamp = Date.now();
    const pdfPath = `${supplement.company_id}/${supplementId}/advocacy-${scenario}-${timestamp}.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("[advocacy] Upload failed:", uploadErr);
      return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
    }

    // Get signed URL
    const { data: signedData } = await admin.storage
      .from("supplements")
      .createSignedUrl(pdfPath, 3600);

    return NextResponse.json({
      success: true,
      script,
      pdfUrl: signedData?.signedUrl || null,
    });
  } catch (err) {
    console.error("[advocacy] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate advocacy script" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify build**

Run: `npx turbo build --filter=@4margin/contractor 2>&1 | tail -20`

**Step 3: Commit**

```bash
git add apps/contractor/src/app/api/supplements/[id]/advocacy/route.ts
git commit -m "feat: add advocacy scripts API route

POST /api/supplements/[id]/advocacy with scenario param.
Calls Claude with full claim context, returns structured script
JSON + generates branded HO-facing PDF.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Advocacy Scripts UI Component + Wire Into Page

**Files:**
- Create: `apps/contractor/src/components/supplements/advocacy-scripts.tsx`
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`

**Step 1: Create the UI component**

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdvocacyScriptsProps {
  supplementId: string;
  scenario: "pre_inspection" | "post_denial";
}

interface ScriptSection {
  title: string;
  bullets: string[];
}

export function AdvocacyScripts({ supplementId, scenario }: AdvocacyScriptsProps) {
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<ScriptSection[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleSection = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/supplements/${supplementId}/advocacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      setSections(data.script.contractorSections);
      setPdfUrl(data.pdfUrl);
      // Auto-expand all sections
      setExpanded(new Set(data.script.contractorSections.map((_: unknown, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const isPreInspection = scenario === "pre_inspection";

  const config = isPreInspection
    ? {
        title: "Pre-Inspection Prep",
        badge: "PREP",
        badgeVariant: "default" as const,
        borderClass: "border-sky-200 bg-sky-50/30",
        icon: (
          <svg className="h-5 w-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        buttonText: "Generate Pre-Inspection Script",
        buttonVariant: "default" as const,
      }
    : {
        title: "Homeowner Advocacy",
        badge: "POST-DENIAL",
        badgeVariant: "destructive" as const,
        borderClass: "border-amber-200 bg-amber-50/30",
        icon: (
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        buttonText: "Generate Advocacy Script",
        buttonVariant: "default" as const,
      };

  return (
    <Card className={config.borderClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {config.icon}
          {config.title}
          <Badge variant={config.badgeVariant} className="ml-2 text-[10px]">
            {config.badge}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sections && (
          <>
            <p className="text-sm text-muted-foreground">
              {isPreInspection
                ? "Generate talking points and a homeowner guide for the upcoming adjuster inspection."
                : "Generate talking points and a homeowner rights guide to help navigate the denial."}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              variant={config.buttonVariant}
              className="w-full"
            >
              {generating ? "Generating script..." : config.buttonText}
            </Button>
          </>
        )}

        {/* Contractor Talking Points */}
        {sections && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contractor Talking Points
            </p>
            {sections.map((section, idx) => (
              <div key={idx} className="rounded-md border bg-white overflow-hidden">
                <button
                  onClick={() => toggleSection(idx)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">{section.title}</span>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${expanded.has(idx) ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expanded.has(idx) && (
                  <div className="px-3 pb-3 space-y-1">
                    {section.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex gap-2 text-sm">
                        <span className="text-sky-500 shrink-0 mt-0.5">&#x25B8;</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PDF Download */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Homeowner Guide (PDF)
          </a>
        )}

        {/* Regenerate */}
        {sections && (
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating} className="w-full text-xs">
            {generating ? "Regenerating..." : "Regenerate Script"}
          </Button>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-100 rounded-md px-3 py-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Wire into supplement detail page**

In `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`:

Add import:
```typescript
import { AdvocacyScripts } from "@/components/supplements/advocacy-scripts";
```

Add pre-inspection card — AFTER the SupplementChat block (after line 253), BEFORE the RebuttalTools block:
```tsx
      {/* Advocacy Scripts — Pre-inspection prep */}
      {status === "complete" && hasPdf && lineItems && lineItems.length > 0 && (
        <AdvocacyScripts supplementId={id} scenario="pre_inspection" />
      )}
```

Add post-denial card — AFTER the RebuttalTools block (after line 267):
```tsx
      {/* Advocacy Scripts — Post-denial response */}
      {(status === "denied" || status === "partially_approved") && lineItems && lineItems.length > 0 && (
        <AdvocacyScripts supplementId={id} scenario="post_denial" />
      )}
```

**Step 3: Build and verify**

Run: `npx turbo build --filter=@4margin/contractor 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add apps/contractor/src/components/supplements/advocacy-scripts.tsx \
       apps/contractor/src/app/\(dashboard\)/dashboard/supplements/\[id\]/page.tsx
git commit -m "feat: add Advocacy Scripts UI card on supplement detail page

Pre-inspection prep shown when complete+hasPdf, post-denial
shown alongside Rebuttal Tools. Expandable contractor talking
points + HO guide PDF download.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Build + Push

**Step 1: Full build**

Run: `npx turbo build --filter=@4margin/contractor`

**Step 2: Push**

```bash
git push
```
