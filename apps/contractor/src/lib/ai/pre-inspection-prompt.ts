/**
 * Pre-Inspection Prep Prompt Builder (Policy Decoder Context).
 *
 * Generates pre-inspection talking points from POLICY ANALYSIS alone —
 * no supplement items needed. This is used on the policy decoder tab
 * because chronologically the contractor decodes the policy BEFORE the
 * adjuster inspects, so there are no supplement items yet.
 *
 * Focuses on:
 * - What the policy covers / excludes
 * - What to watch for during inspection based on policy terms
 * - Carrier-specific tactics and behavioral patterns
 * - Jurisdiction-specific code requirements
 * - Landmine provisions that could affect the claim
 */

import {
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  CARRIER_ENDORSEMENT_FORMS,
  getLandminesForClaimType,
  getClaimTypeFocusPrompt,
  getCarrierProfile,
  getCarrierCodeObjections,
  type LandmineRule,
  type CarrierEndorsementForm,
  type CarrierProfile,
  type CarrierCodeObjection,
} from "@/data/policy-knowledge";
import { BUILDING_CODES, type BuildingCode } from "@/data/building-codes";
import { lookupCountyByZip, type CountyJurisdiction } from "@/data/county-jurisdictions";

/* ─────── Types ─────── */

export interface PreInspectionContext {
  // From policy analysis
  carrierName: string;
  propertyState: string;
  propertyZip: string;
  policyType: string;
  depreciationMethod: string;
  policyAnalysis: Record<string, unknown> | null;
  // Optional claim context from decoder upload form
  claimType: string;
  // Company
  companyName: string;
}

export interface PreInspectionScript {
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

export function buildPreInspectionPrompt(ctx: PreInspectionContext): {
  system: string;
  user: string;
} {
  const county = ctx.propertyZip ? lookupCountyByZip(ctx.propertyZip) : undefined;
  const claimType = ctx.claimType || "wind_hail";
  const landmines = getLandminesForClaimType(claimType);
  const claimFocus = getClaimTypeFocusPrompt(claimType);
  const carrierForms = ctx.carrierName
    ? CARRIER_ENDORSEMENT_FORMS.filter(
        (f) => f.carrier.toLowerCase() === ctx.carrierName.toLowerCase()
      )
    : [];
  const highObjectionCodes = BUILDING_CODES.filter(
    (c) =>
      c.carrierObjectionRate === "high" &&
      c.jurisdictions.some(
        (j) => j.state === (ctx.propertyState || "").toUpperCase()
      )
  );
  const carrierProfile = ctx.carrierName
    ? getCarrierProfile(ctx.carrierName)
    : undefined;
  const carrierObjections = ctx.carrierName
    ? getCarrierCodeObjections(ctx.carrierName)
    : [];

  const system = `You are a roofing insurance claim expert generating pre-inspection preparation scripts for contractors. You produce structured, actionable content in two formats:

1. CONTRACTOR TALKING POINTS — bullet-point coaching scripts the contractor uses internally to prepare for the adjuster inspection
2. HOMEOWNER GUIDE — professional, plain-English content for a PDF the homeowner receives before the adjuster visit

CONTEXT: The contractor has decoded the homeowner's insurance policy but the adjuster inspection has NOT happened yet. There are no supplement items at this stage — the focus is on understanding the policy, knowing what the adjuster may try, and preparing the homeowner.

RULES:
- All content is educational, NOT legal advice
- Never reference 4Margin by name in HO-facing content — use "your contractor" or "your roofing professional"
- Be specific — cite code sections, manufacturer names, policy provisions when available
- Use plain English for HO content — no industry jargon
- For contractor content — use industry terminology, be direct and tactical
- Focus on what the POLICY reveals about coverage, risks, and carrier behavior
- Always include a disclaimer that this is educational information, not legal advice

You MUST respond with valid JSON matching this exact format:
{
  "contractorSections": [
    { "title": "Section Title", "bullets": ["Point 1", "Point 2"] }
  ],
  "hoSections": [
    { "title": "Section Title", "content": "Paragraph text for the homeowner PDF." }
  ]
}

Return ONLY the JSON object. No markdown, no commentary.`;

  const sections: string[] = [];

  sections.push(`## SCENARIO: PRE-INSPECTION PREPARATION`);
  sections.push(
    `Generate preparation scripts for BEFORE the insurance adjuster inspects the property. The policy has been decoded but no supplement has been created yet.`
  );
  sections.push(``);

  // Policy overview
  sections.push(`## POLICY OVERVIEW`);
  sections.push(`Carrier: ${ctx.carrierName || "Unknown"}`);
  sections.push(`Policy Type: ${ctx.policyType || "Unknown"}`);
  sections.push(`Property State: ${ctx.propertyState || "Unknown"}`);
  sections.push(`Depreciation: ${ctx.depreciationMethod || "Unknown"}`);
  if (ctx.claimType) {
    sections.push(`Expected Claim Type: ${ctx.claimType}`);
  }

  // Claim type focus
  if (claimFocus) {
    sections.push(``);
    sections.push(`## CLAIM TYPE FOCUS`);
    sections.push(claimFocus);
  }

  // Policy analysis data
  if (ctx.policyAnalysis) {
    sections.push(``);
    sections.push(`## DECODED POLICY ANALYSIS`);
    sections.push(
      JSON.stringify(ctx.policyAnalysis, null, 2).slice(0, 2000)
    );
  }

  // Policy landmines
  if (landmines.length > 0) {
    sections.push(``);
    sections.push(`## POLICY LANDMINES FOR THIS CLAIM TYPE`);
    for (const lm of landmines) {
      sections.push(
        `- [${lm.severity.toUpperCase()}] ${lm.name}: ${lm.impact}`
      );
      sections.push(`  Action: ${lm.actionItem}`);
    }
  }

  // Favorable provisions
  if (FAVORABLE_PROVISIONS.length > 0) {
    sections.push(``);
    sections.push(`## FAVORABLE PROVISIONS TO LEVERAGE`);
    for (const prov of FAVORABLE_PROVISIONS) {
      sections.push(`- ${prov.name}: ${prov.supplementRelevance}`);
    }
  }

  // Carrier-specific endorsements
  if (carrierForms.length > 0) {
    sections.push(``);
    sections.push(
      `## CARRIER-SPECIFIC ENDORSEMENTS (${ctx.carrierName})`
    );
    for (const form of carrierForms) {
      sections.push(
        `- Form ${form.formNumber}: ${form.name} — ${form.effect} [${form.severity}]`
      );
    }
  }

  // Carrier behavioral profile
  if (carrierProfile) {
    sections.push(``);
    sections.push(
      `## CARRIER BEHAVIOR PROFILE (${carrierProfile.name})`
    );
    sections.push(
      `Aggressiveness: ${carrierProfile.aggressiveness.toUpperCase()}`
    );
    sections.push(`Depreciation: ${carrierProfile.depreciationApproach}`);
    sections.push(
      `Cosmetic Stance: ${carrierProfile.cosmeticDamageStance}`
    );
    sections.push(``);
    sections.push(`Known Supplement Tactics:`);
    for (const tactic of carrierProfile.supplementTactics) {
      sections.push(`- ${tactic}`);
    }
    sections.push(``);
    sections.push(`Common Denial Language:`);
    for (const lang of carrierProfile.commonDenialLanguage) {
      sections.push(`- "${lang}"`);
    }
    sections.push(``);
    sections.push(`Weaknesses (items they consistently underpay):`);
    for (const w of carrierProfile.weaknesses) {
      sections.push(`- ${w}`);
    }
  }

  // Carrier-specific code objections
  if (carrierObjections.length > 0) {
    sections.push(``);
    sections.push(`## CARRIER CODE OBJECTION PATTERNS`);
    for (const obj of carrierObjections.slice(0, 6)) {
      sections.push(
        `- IRC ${obj.ircSection} [${obj.objectionRate}]: "${obj.typicalObjection}" → ${obj.effectiveRebuttal.slice(0, 150)}`
      );
    }
  }

  // Frequently disputed building codes
  if (highObjectionCodes.length > 0) {
    sections.push(``);
    sections.push(
      `## FREQUENTLY DISPUTED BUILDING CODES (${ctx.propertyState})`
    );
    for (const code of highObjectionCodes.slice(0, 8)) {
      sections.push(
        `- IRC ${code.section} (${code.title}): Adjuster objection: "${code.typicalObjection}" → Rebuttal: ${code.rebuttal}`
      );
    }
  }

  // County jurisdiction
  if (county) {
    sections.push(``);
    sections.push(`## JURISDICTION DATA`);
    sections.push(`County: ${county.county}, ${county.state}`);
    sections.push(
      `Climate Zone: ${county.climateZone} | Wind Speed: ${county.designWindSpeed} mph${county.highWindZone ? " (HIGH WIND)" : ""}`
    );
    sections.push(`Ice Barrier: ${county.iceBarrierRequirement}`);
    sections.push(
      `Permits: ${county.permit.required ? "Required" : "Not required"} — ${county.permit.ahjName}`
    );
  }

  sections.push(``);
  sections.push(`## INSTRUCTIONS`);
  sections.push(`Generate CONTRACTOR talking points with these sections:`);
  sections.push(
    `1. "Policy Coverage Summary" — key coverages, deductible type, depreciation method, and what they mean for this claim`
  );
  sections.push(
    `2. "What to Document During Inspection" — photos, measurements, adjuster statements to capture based on what the policy covers`
  );
  sections.push(
    `3. "Carrier Tactics to Watch For" — specific to ${ctx.carrierName || "this carrier"}, based on behavioral profile`
  );
  sections.push(
    `4. "Policy Landmines & Red Flags" — exclusions, endorsements, and provisions the contractor should be aware of`
  );
  sections.push(
    `5. "Building Code Requirements" — ${ctx.propertyState || "state"}-specific code requirements the adjuster may try to skip`
  );
  sections.push(``);
  sections.push(`Generate HOMEOWNER guide sections:`);
  sections.push(
    `1. "What to Expect" — the inspection process explained simply`
  );
  sections.push(
    `2. "Your Rights During the Inspection" — what they can ask, document, request`
  );
  sections.push(
    `3. "Questions to Ask the Adjuster" — specific questions based on this policy analysis`
  );
  sections.push(
    `4. "Protecting Your Claim" — documentation tips, what to avoid saying, next steps`
  );

  return { system, user: sections.join("\n") };
}
