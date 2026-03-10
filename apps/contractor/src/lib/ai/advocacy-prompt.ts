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
  getCarrierProfile,
  getCarrierCodeObjections,
  type LandmineRule,
  type CarrierEndorsementForm,
  type CarrierProfile,
  type CarrierCodeObjection,
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
  const carrierProfile = getCarrierProfile(ctx.carrierName);
  const carrierObjections = getCarrierCodeObjections(ctx.carrierName);

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
    ? buildPreInspectionPrompt(ctx, landmines, carrierForms, highObjectionCodes, county, claimFocus, carrierProfile, carrierObjections)
    : buildPostDenialPrompt(ctx, landmines, carrierForms, highObjectionCodes, county, claimFocus, carrierProfile, carrierObjections);

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
  carrierProfile: CarrierProfile | undefined,
  carrierObjections: CarrierCodeObjection[],
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

  // Carrier behavioral profile
  if (carrierProfile) {
    sections.push(``);
    sections.push(`## CARRIER BEHAVIOR PROFILE (${carrierProfile.name})`);
    sections.push(`Aggressiveness: ${carrierProfile.aggressiveness.toUpperCase()}`);
    sections.push(`Depreciation: ${carrierProfile.depreciationApproach}`);
    sections.push(`Cosmetic Stance: ${carrierProfile.cosmeticDamageStance}`);
    sections.push(``);
    sections.push(`Known Tactics:`);
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
      sections.push(`- IRC ${obj.ircSection} [${obj.objectionRate}]: "${obj.typicalObjection}" → ${obj.effectiveRebuttal.slice(0, 150)}`);
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
  carrierProfile: CarrierProfile | undefined,
  carrierObjections: CarrierCodeObjection[],
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

  // Carrier behavioral profile
  if (carrierProfile) {
    sections.push(``);
    sections.push(`## CARRIER BEHAVIOR PROFILE (${carrierProfile.name})`);
    sections.push(`Aggressiveness: ${carrierProfile.aggressiveness.toUpperCase()}`);
    sections.push(`Depreciation: ${carrierProfile.depreciationApproach}`);
    sections.push(`Cosmetic Stance: ${carrierProfile.cosmeticDamageStance}`);
    sections.push(``);
    sections.push(`Known Tactics:`);
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
      sections.push(`- IRC ${obj.ircSection} [${obj.objectionRate}]: "${obj.typicalObjection}" → ${obj.effectiveRebuttal.slice(0, 150)}`);
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
