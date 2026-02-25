/**
 * Policy Decoder — AI-Powered HO Policy Parser (V2)
 *
 * 3-Pass Pipeline for 95%+ extraction accuracy:
 *   Pass 1: Document Intelligence — classify document type, carrier, form type, scan quality
 *   Pass 2: Full Extraction — structured data extraction with base form knowledge
 *   Pass 3: Verification — targeted re-check of deductibles, endorsements, exclusions
 *
 * Uses Claude with base64 PDF input for native document reading.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { withRetry } from "./retry";
import {
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  BASE_FORM_EXCLUSIONS,
  CARRIER_ENDORSEMENT_FORMS,
  type LandmineRule,
  type FavorableProvision,
} from "@/data/policy-knowledge";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
};

// ── Document Meta (Pass 1 Output) ───────────────────────────────────────────

export interface DocumentMeta {
  documentType:
    | "full_policy"
    | "dec_page_only"
    | "endorsement_only"
    | "unknown";
  pageCount: number | null;
  carrier: string | null;
  policyFormType: string | null;
  endorsementFormNumbers: string[];
  scanQuality: "good" | "fair" | "poor";
  missingDocumentWarning: string | null;
}

// ── Output Types ─────────────────────────────────────────────────────────────

export interface PolicyCoverage {
  section: string;
  label: string;
  limit: string | null;
  description: string;
}

export interface PolicyDeductible {
  type: string;
  amount: string;
  dollarAmount: number | null;
  appliesTo: string;
  needsVerification: boolean;
  verificationReason: string | null;
}

export interface PolicyExclusion {
  name: string;
  description: string;
  policyLanguage: string;
  severity: "critical" | "warning" | "info";
  impact: string;
  needsVerification: boolean;
  verificationReason: string | null;
}

export interface PolicyEndorsement {
  name: string;
  number: string | null;
  effectiveDate: string | null;
  description: string;
  impact: string;
  severity: "critical" | "warning" | "info";
  needsVerification: boolean;
  verificationReason: string | null;
}

export interface DetectedLandmine {
  ruleId: string;
  name: string;
  severity: "critical" | "warning" | "info";
  category: string;
  policyLanguage: string;
  impact: string;
  actionItem: string;
}

export interface DetectedFavorable {
  provisionId: string;
  name: string;
  policyLanguage: string;
  impact: string;
  supplementRelevance: string;
}

export interface SectionConfidence {
  policyMeta: number;
  coverages: number;
  deductibles: number;
  depreciation: number;
  exclusions: number;
  endorsements: number;
}

export interface PolicyAnalysis {
  // Meta
  policyType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  namedInsured: string;
  propertyAddress: string;

  // Coverages
  coverages: PolicyCoverage[];

  // Deductibles
  deductibles: PolicyDeductible[];

  // Depreciation
  depreciationMethod: "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN";
  depreciationNotes: string;

  // Exclusions & endorsements
  exclusions: PolicyExclusion[];
  endorsements: PolicyEndorsement[];

  // Landmines
  landmines: DetectedLandmine[];

  // Favorable provisions
  favorableProvisions: DetectedFavorable[];

  // Summary
  summaryForContractor: string;
  riskLevel: "low" | "medium" | "high";

  // V2: Document intelligence
  documentType:
    | "full_policy"
    | "dec_page_only"
    | "endorsement_only"
    | "unknown";
  scanQuality: "good" | "fair" | "poor";
  missingDocumentWarning: string | null;
  endorsementFormNumbers: string[];
  sectionConfidence: SectionConfidence;

  // Overall parse confidence (legacy + still useful)
  confidence: number;
  parseNotes: string;
}

// ── Zod Validation Schemas ──────────────────────────────────────────────────

const severitySchema = z.enum(["critical", "warning", "info"]);

const policyCoverageSchema = z.object({
  section: z.string().default("unknown"),
  label: z.string().default("Unknown Coverage"),
  limit: z.string().nullable().default(null),
  description: z.string().default(""),
});

const policyDeductibleSchema = z.object({
  type: z.string().default("standard"),
  amount: z.string().default("$0"),
  dollarAmount: z.number().nullable().default(null),
  appliesTo: z.string().default("all perils"),
  needsVerification: z.boolean().default(false),
  verificationReason: z.string().nullable().default(null),
});

const policyExclusionSchema = z.object({
  name: z.string().default("Unknown Exclusion"),
  description: z.string().default(""),
  policyLanguage: z.string().default(""),
  severity: severitySchema.default("info"),
  impact: z.string().default(""),
  needsVerification: z.boolean().default(false),
  verificationReason: z.string().nullable().default(null),
});

const policyEndorsementSchema = z.object({
  name: z.string().default("Unknown Endorsement"),
  number: z.string().nullable().default(null),
  effectiveDate: z.string().nullable().default(null),
  description: z.string().default(""),
  impact: z.string().default(""),
  severity: severitySchema.default("info"),
  needsVerification: z.boolean().default(false),
  verificationReason: z.string().nullable().default(null),
});

const detectedLandmineSchema = z.object({
  ruleId: z.string().default("unknown"),
  name: z.string().default("Unknown Landmine"),
  severity: severitySchema.default("warning"),
  category: z.string().default("unknown"),
  policyLanguage: z.string().default(""),
  impact: z.string().default(""),
  actionItem: z.string().default(""),
});

const detectedFavorableSchema = z.object({
  provisionId: z.string().default("unknown"),
  name: z.string().default("Unknown Provision"),
  policyLanguage: z.string().default(""),
  impact: z.string().default(""),
  supplementRelevance: z.string().default(""),
});

const sectionConfidenceSchema = z.object({
  policyMeta: z.number().min(0).max(1).default(0.5),
  coverages: z.number().min(0).max(1).default(0.5),
  deductibles: z.number().min(0).max(1).default(0.5),
  depreciation: z.number().min(0).max(1).default(0.5),
  exclusions: z.number().min(0).max(1).default(0.5),
  endorsements: z.number().min(0).max(1).default(0.5),
});

const policyAnalysisSchema = z.object({
  policyType: z.string().default("UNKNOWN"),
  carrier: z.string().default("Unknown Carrier"),
  policyNumber: z.string().default(""),
  effectiveDate: z.string().nullable().default(null),
  expirationDate: z.string().nullable().default(null),
  namedInsured: z.string().default(""),
  propertyAddress: z.string().default(""),

  coverages: z.array(policyCoverageSchema).default([]),
  deductibles: z.array(policyDeductibleSchema).default([]),

  depreciationMethod: z
    .enum(["RCV", "ACV", "MODIFIED_ACV", "UNKNOWN"])
    .default("UNKNOWN"),
  depreciationNotes: z.string().default(""),

  exclusions: z.array(policyExclusionSchema).default([]),
  endorsements: z.array(policyEndorsementSchema).default([]),

  landmines: z.array(detectedLandmineSchema).default([]),
  favorableProvisions: z.array(detectedFavorableSchema).default([]),

  summaryForContractor: z.string().default(""),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),

  // V2 fields — may not be in Claude's response (we inject them)
  documentType: z
    .enum(["full_policy", "dec_page_only", "endorsement_only", "unknown"])
    .default("unknown"),
  scanQuality: z.enum(["good", "fair", "poor"]).default("good"),
  missingDocumentWarning: z.string().nullable().default(null),
  endorsementFormNumbers: z.array(z.string()).default([]),
  sectionConfidence: sectionConfidenceSchema.default({
    policyMeta: 0.5,
    coverages: 0.5,
    deductibles: 0.5,
    depreciation: 0.5,
    exclusions: 0.5,
    endorsements: 0.5,
  }),

  confidence: z.number().min(0).max(1).default(0.5),
  parseNotes: z.string().default(""),
});

const documentMetaSchema = z.object({
  documentType: z
    .enum(["full_policy", "dec_page_only", "endorsement_only", "unknown"])
    .default("unknown"),
  pageCount: z.number().nullable().default(null),
  carrier: z.string().nullable().default(null),
  policyFormType: z.string().nullable().default(null),
  endorsementFormNumbers: z.array(z.string()).default([]),
  scanQuality: z.enum(["good", "fair", "poor"]).default("good"),
  missingDocumentWarning: z.string().nullable().default(null),
});

// ── JSON Extraction Helpers ─────────────────────────────────────────────────

function extractJson(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  // Find first { to last }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function extractTextFromResponse(
  response: Anthropic.Message
): string {
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }
  return textBlock.text;
}

// ── PASS 1: Document Intelligence ───────────────────────────────────────────

export async function analyzeDocumentType(
  pdfBase64: string
): Promise<DocumentMeta> {
  const client = getClient();

  const prompt = `Quickly analyze this insurance document and answer these questions. Return ONLY a JSON object.

{
  "documentType": "full_policy" | "dec_page_only" | "endorsement_only" | "unknown",
  "pageCount": <number or null>,
  "carrier": "<carrier name or null>",
  "policyFormType": "<HO-3, HO-5, HO-6, DP-1, DP-3, HO-4, HO-8, or null>",
  "endorsementFormNumbers": ["<list all endorsement form numbers visible in any schedule, e.g. HW 08 02, FE-5398>"],
  "scanQuality": "good" | "fair" | "poor",
  "missingDocumentWarning": "<warning message if document is incomplete, or null>"
}

Classification guide:
- "full_policy": Contains declarations page AND policy conditions/exclusions AND endorsement text (usually 20+ pages)
- "dec_page_only": Contains only the declarations/summary page(s) — shows coverage limits, deductibles, endorsement schedule, but NOT the actual endorsement or exclusion text (usually 2-8 pages)
- "endorsement_only": Contains only endorsement pages, not the base policy
- "unknown": Cannot determine

For endorsementFormNumbers: Look for a "Forms and Endorsements" schedule/table on the declarations page. List every form number you can find (e.g., "HO 00 03", "HW 08 02", "FE-5398", "IL 01 70").

For scanQuality: "good" = clear digital text, "fair" = readable but some blur/artifacts, "poor" = significant OCR issues, blurry, or hard to read.

Return ONLY the JSON object, no explanation.`;

  try {
    const response = await withRetry(
      () =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: pdfBase64,
                  },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      { maxRetries: 2, baseDelayMs: 1500, label: "document-intelligence" }
    );

    const raw = extractTextFromResponse(response);
    const json = extractJson(raw);
    const parsed = JSON.parse(json);
    const validated = documentMetaSchema.parse(parsed);

    // Add warning for dec page only
    if (
      validated.documentType === "dec_page_only" &&
      !validated.missingDocumentWarning
    ) {
      validated.missingDocumentWarning =
        "This appears to be a declarations page only. Endorsement and exclusion analysis may be incomplete. For full analysis, upload the complete policy document.";
    }

    console.log(
      `[policy-parser] Pass 1 — Doc type: ${validated.documentType}, Carrier: ${validated.carrier}, Form: ${validated.policyFormType}, Forms: ${validated.endorsementFormNumbers.length}, Scan: ${validated.scanQuality}`
    );

    return validated;
  } catch (err) {
    console.error("[policy-parser] Pass 1 failed, using defaults:", err);
    return {
      documentType: "unknown",
      pageCount: null,
      carrier: null,
      policyFormType: null,
      endorsementFormNumbers: [],
      scanQuality: "good",
      missingDocumentWarning: null,
    };
  }
}

// ── PASS 2: Full Extraction ─────────────────────────────────────────────────

async function fullExtraction(
  pdfBase64: string,
  claimType: string | undefined,
  docMeta: DocumentMeta
): Promise<PolicyAnalysis> {
  const client = getClient();

  const landmineSearchTerms = LANDMINE_RULES.map(
    (r: LandmineRule) =>
      `- ${r.name} (ID: ${r.id}): Look for: ${r.typicalLanguage.join(", ")}`
  ).join("\n");

  const favorableSearchTerms = FAVORABLE_PROVISIONS.map(
    (p: FavorableProvision) =>
      `- ${p.name} (ID: ${p.id}): Look for: ${p.searchTerms.join(", ")}`
  ).join("\n");

  // Build base form context if we know the policy type
  let baseFormContext = "";
  if (docMeta.policyFormType) {
    const baseExclusions = BASE_FORM_EXCLUSIONS.filter(
      (e) => e.formType === docMeta.policyFormType
    );
    if (baseExclusions.length > 0) {
      baseFormContext = `
### IMPORTANT: Base Form Knowledge
This appears to be a ${docMeta.policyFormType} policy. Standard ${docMeta.policyFormType} policies include these default exclusions:
${baseExclusions.map((e) => `- ${e.name}: ${e.description} (claim relevance: ${e.claimRelevance})`).join("\n")}

For exclusions: Report these standard exclusions as present UNLESS you find specific endorsement language that removes or modifies them. Also search for any ADDITIONAL exclusions beyond these defaults (especially endorsement-added exclusions like cosmetic damage, anti-matching, roof age schedules).`;
    }
  }

  // Build document type context
  let docTypeContext = "";
  if (docMeta.documentType === "dec_page_only") {
    docTypeContext = `
### DOCUMENT TYPE WARNING
This is a DECLARATIONS PAGE ONLY (not the full policy). You can extract:
- Policy type, carrier, policy number, dates, insured, address ✓
- Coverage limits and deductibles ✓
- Endorsement form numbers from the schedule ✓

You CANNOT reliably extract (mark as needsVerification=true):
- Exclusion details (text not in document)
- Endorsement effects (only form numbers visible, not the endorsement text)
- Exact policy language quotes

For endorsements: List the form numbers you can see and provide your best guess of what each form does based on the form number pattern. Mark each with needsVerification=true.`;
  } else if (docMeta.documentType === "endorsement_only") {
    docTypeContext = `
### DOCUMENT TYPE WARNING
This appears to contain only endorsement pages. Extract endorsement details but note that base policy information (coverages, deductibles) may be missing. Mark those sections with low confidence.`;
  }

  const prompt = `You are an expert insurance policy analyst for 4Margin, a roofing contractor supplement tool. Analyze this homeowner insurance policy PDF and extract structured data.

IMPORTANT: You are a TRANSLATOR, not an advisor. Extract and explain what the policy says in plain English. Do NOT provide legal advice or insurance advice.
${docTypeContext}
${baseFormContext}

## EXTRACTION TASKS

### 1. Policy Basics
Extract: policy type (HO-3, HO-5, HO-6, DP-1, DP-3, HO-4, HO-8, etc.), carrier name, policy number, effective/expiration dates, named insured, property address.

For policy type: Look for the ISO form number (e.g., "HO 00 03" = HO-3, "HO 00 05" = HO-5). Check the declarations page header, the forms schedule, and the policy jacket.

### 2. Coverage Sections
For each coverage found (A through D, plus any additional coverages):
- Section identifier
- Coverage limit (dollar amount)
- Brief plain-English description

Pay special attention to:
- **Coverage A (Dwelling)** — primary for roofing claims
- **Law & Ordinance Coverage** — critical for code-required items
- **Extended Replacement Cost** — pays above Coverage A limit

### 3. Deductible Structure
Extract ALL deductibles — this is critical, do not miss any:
- Standard deductible (all perils)
- Wind/hail deductible (if separate — may be flat dollar or percentage)
- Hurricane deductible (if applicable)
- Named storm deductible (if applicable)
- Any other special deductibles from endorsements

If percentage-based, note the percentage AND calculate the dollar amount using Coverage A limit.
If you find an endorsement that modifies the deductible, note both the original and modified amounts.

### 4. Depreciation Method
Determine: RCV (Replacement Cost Value) or ACV (Actual Cash Value)
- RCV = depreciation is recoverable after repairs
- ACV = depreciation is NOT recoverable
- Look for roof-specific payment schedules that convert roof coverage to ACV after certain age
- Note any endorsements that modify the depreciation method
- If the base policy is RCV but a roof schedule endorsement converts the roof to ACV, report MODIFIED_ACV

### 5. Exclusions
List every exclusion relevant to exterior damage claims. For each, include needsVerification if you're uncertain.
Search specifically for:
- Cosmetic damage exclusions (CRITICAL — affects hail claims)
- Matching limitations (CRITICAL — affects replacement scope)
- Wear and tear / gradual deterioration
- Maintenance/neglect
- Prior damage / pre-existing conditions
- Faulty workmanship / defective materials
- Earth movement
- Water/flood

For each, quote the relevant policy language if visible.

### 6. Endorsements
List ALL endorsements that affect roofing/siding claims. This is critical — do not miss any.
Search the entire document for endorsement headers, form numbers, and schedule listings.
- Cosmetic damage endorsement
- Roof payment schedule / roof age schedule
- Wind/hail deductible endorsement
- Matching limitations
- Law & ordinance modifications
- Any other endorsements affecting exterior claims

For each, note the endorsement form number if visible. If you can see the form number but not the endorsement text (common on dec pages), still list it with what you can determine from the form number.

### 7. Landmine Detection
Specifically search for these dangerous provisions:
${landmineSearchTerms}

For each found, quote the EXACT policy language.

### 8. Favorable Provisions
Search for provisions that HELP the homeowner:
${favorableSearchTerms}

For each found, quote the relevant language.

${claimType ? `### 9. Claim Type Context\nThis is a ${claimType} damage claim. Prioritize provisions most relevant to ${claimType} damage.` : ""}

### 10. Per-Section Confidence
Rate your confidence for each section from 0.0 to 1.0:
- 0.9-1.0 = Very confident, clear text, unambiguous
- 0.7-0.89 = Confident, found relevant sections, minor uncertainty
- 0.5-0.69 = Moderate confidence, some sections unclear or missing
- 0.0-0.49 = Low confidence, section not found or document too poor to read

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "policyType": "HO-3",
  "carrier": "State Farm",
  "policyNumber": "XX-XXXX-XXXX",
  "effectiveDate": "2025-06-01",
  "expirationDate": "2026-06-01",
  "namedInsured": "John Smith",
  "propertyAddress": "123 Main St, Baltimore, MD 21201",
  "coverages": [
    { "section": "coverage_a", "label": "Coverage A — Dwelling", "limit": "$350,000", "description": "Covers the dwelling structure..." }
  ],
  "deductibles": [
    { "type": "standard", "amount": "$1,000", "dollarAmount": 1000, "appliesTo": "all perils", "needsVerification": false, "verificationReason": null }
  ],
  "depreciationMethod": "RCV",
  "depreciationNotes": "Policy provides replacement cost coverage...",
  "exclusions": [
    { "name": "Cosmetic Damage Exclusion", "description": "...", "policyLanguage": "exact quote...", "severity": "critical", "impact": "...", "needsVerification": false, "verificationReason": null }
  ],
  "endorsements": [
    { "name": "Roof Payment Schedule", "number": "FE-5398", "effectiveDate": "2025-06-01", "description": "...", "impact": "...", "severity": "critical", "needsVerification": false, "verificationReason": null }
  ],
  "landmines": [
    { "ruleId": "cosmetic_exclusion", "name": "Cosmetic Damage Exclusion", "severity": "critical", "category": "endorsement", "policyLanguage": "exact quote...", "impact": "...", "actionItem": "..." }
  ],
  "favorableProvisions": [
    { "provisionId": "matching_required", "name": "Matching Provision", "policyLanguage": "quote...", "impact": "...", "supplementRelevance": "..." }
  ],
  "summaryForContractor": "2-3 sentence plain-English summary.",
  "riskLevel": "high",
  "sectionConfidence": {
    "policyMeta": 0.95,
    "coverages": 0.9,
    "deductibles": 0.85,
    "depreciation": 0.8,
    "exclusions": 0.7,
    "endorsements": 0.65
  },
  "confidence": 0.85,
  "parseNotes": "Any issues with parsing, unreadable sections, etc."
}

RULES:
- Return ONLY valid JSON, no markdown wrapping
- Quote actual policy language when possible (in policyLanguage fields)
- If a section is not found or not applicable, use empty arrays
- Set confidence AND sectionConfidence lower if the PDF is hard to read or sections are missing
- severity: "critical" = directly affects claim value, "warning" = could affect claim, "info" = good to know
- riskLevel: "high" if ANY critical landmines found, "medium" if warnings only, "low" if none
- Set needsVerification=true on any item you're uncertain about, with a reason in verificationReason`;

  const response = await withRetry(
    () =>
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    { maxRetries: 2, baseDelayMs: 2000, label: "full-extraction" }
  );

  const raw = extractTextFromResponse(response);
  const json = extractJson(raw);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    console.error(
      "[policy-parser] Pass 2 JSON parse failed, attempting retry:",
      json.slice(0, 300)
    );
    // Retry with explicit JSON-only instruction
    const retryResponse = await withRetry(
      () =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: pdfBase64,
                  },
                },
                { type: "text", text: prompt },
              ],
            },
            {
              role: "assistant",
              content: raw,
            },
            {
              role: "user",
              content:
                "Your response was not valid JSON. Please return ONLY the JSON object with no additional text, no markdown fencing, no explanation. Start with { and end with }.",
            },
          ],
        }),
      { maxRetries: 1, baseDelayMs: 2000, label: "full-extraction-retry" }
    );

    const retryRaw = extractTextFromResponse(retryResponse);
    const retryJson = extractJson(retryRaw);
    parsed = JSON.parse(retryJson);
  }

  // Validate with Zod (lenient — defaults fill missing fields)
  const validated = policyAnalysisSchema.parse(parsed);

  // Inject document meta from Pass 1
  validated.documentType = docMeta.documentType;
  validated.scanQuality = docMeta.scanQuality;
  validated.missingDocumentWarning = docMeta.missingDocumentWarning;
  validated.endorsementFormNumbers = docMeta.endorsementFormNumbers;

  // Post-process: enrich landmines with knowledge base data
  validated.landmines = enrichLandmines(validated.landmines);

  console.log(
    `[policy-parser] Pass 2 — Type: ${validated.policyType}, Carrier: ${validated.carrier}, Deductibles: ${validated.deductibles.length}, Endorsements: ${validated.endorsements.length}, Exclusions: ${validated.exclusions.length}, Landmines: ${validated.landmines.length}`
  );

  return validated;
}

// ── PASS 3: Verification ────────────────────────────────────────────────────

async function verifyExtraction(
  pdfBase64: string,
  extraction: PolicyAnalysis
): Promise<PolicyAnalysis> {
  const client = getClient();

  // Build Coverage A amount for percentage deductible calculations
  const coverageA = extraction.coverages.find(
    (c) => c.section === "coverage_a"
  );
  const coverageAAmount = coverageA?.limit || "unknown";

  // Summarize what we found for the verification prompt
  const deductibleSummary = extraction.deductibles
    .map(
      (d) =>
        `- ${d.type}: ${d.amount} (${d.appliesTo})${d.dollarAmount ? ` = $${d.dollarAmount.toLocaleString()}` : ""}`
    )
    .join("\n");

  const endorsementSummary = extraction.endorsements
    .map((e) => `- ${e.name}${e.number ? ` (${e.number})` : ""}: ${e.impact}`)
    .join("\n");

  const exclusionSummary = extraction.exclusions
    .map((e) => `- ${e.name} [${e.severity}]: ${e.description}`)
    .join("\n");

  const prompt = `You are verifying a policy analysis extraction. The same policy PDF is attached. A previous analysis extracted the following data. Your job is to CHECK for errors and FIND anything missed.

## PREVIOUS EXTRACTION RESULTS

**Policy:** ${extraction.policyType} from ${extraction.carrier}
**Coverage A:** ${coverageAAmount}
**Depreciation:** ${extraction.depreciationMethod} — ${extraction.depreciationNotes}

**Deductibles Found (${extraction.deductibles.length}):**
${deductibleSummary || "None found"}

**Endorsements Found (${extraction.endorsements.length}):**
${endorsementSummary || "None found"}

**Exclusions Found (${extraction.exclusions.length}):**
${exclusionSummary || "None found"}

## YOUR VERIFICATION TASKS

Check the FULL document again and answer:

1. **DEDUCTIBLES**: Are ALL deductibles captured? Specifically check:
   - Is there a separate wind/hail deductible? (often in endorsements)
   - Is there a hurricane or named-storm deductible?
   - Are there any percentage-based deductibles? If so, calculate the dollar amount using Coverage A = ${coverageAAmount}
   - Did any endorsement modify the base deductible?

2. **ENDORSEMENTS**: Are ALL endorsements captured? Check:
   - Every page for endorsement headers or form numbers
   - The forms schedule on the declarations page
   - Any endorsement that modifies deductibles, depreciation, exclusions, or coverages
   - Cosmetic damage endorsement (CRITICAL for hail claims)
   - Roof payment schedule / age schedule
   - Wind/hail deductible endorsement
   - Matching limitation endorsement

3. **EXCLUSIONS**: Are ALL relevant exclusions captured? Check:
   - Cosmetic damage exclusion (may be in an endorsement)
   - Anti-matching / limited matching provisions
   - Roof age restrictions
   - Prior damage / pre-existing condition language
   - Any endorsement that adds an exclusion

4. **DEPRECIATION**: Is the method correct?
   - Check for roof-specific payment schedules that convert to ACV
   - Check if any endorsement modifies the base depreciation method

## OUTPUT FORMAT
Return a JSON object with ONLY the corrections/additions:
{
  "corrections": {
    "depreciationMethod": "<corrected value or null if no change>",
    "depreciationNotes": "<corrected notes or null>"
  },
  "additionalDeductibles": [
    { "type": "...", "amount": "...", "dollarAmount": <number|null>, "appliesTo": "...", "needsVerification": false, "verificationReason": null }
  ],
  "additionalEndorsements": [
    { "name": "...", "number": "...", "effectiveDate": null, "description": "...", "impact": "...", "severity": "...", "needsVerification": false, "verificationReason": null }
  ],
  "additionalExclusions": [
    { "name": "...", "description": "...", "policyLanguage": "...", "severity": "...", "impact": "...", "needsVerification": false, "verificationReason": null }
  ],
  "additionalLandmines": [
    { "ruleId": "...", "name": "...", "severity": "...", "category": "...", "policyLanguage": "...", "impact": "...", "actionItem": "..." }
  ],
  "additionalFavorableProvisions": [
    { "provisionId": "...", "name": "...", "policyLanguage": "...", "impact": "...", "supplementRelevance": "..." }
  ],
  "confidenceAdjustments": {
    "deductibles": <0-1>,
    "endorsements": <0-1>,
    "exclusions": <0-1>,
    "depreciation": <0-1>
  },
  "verificationNotes": "Any observations about the extraction quality or issues found."
}

If nothing needs correction, return empty arrays and null corrections. Return ONLY valid JSON.`;

  try {
    const response = await withRetry(
      () =>
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: pdfBase64,
                  },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      { maxRetries: 2, baseDelayMs: 2000, label: "verification" }
    );

    const raw = extractTextFromResponse(response);
    const json = extractJson(raw);
    const verification = JSON.parse(json);

    // Merge corrections
    const result = { ...extraction };

    // Apply depreciation corrections
    if (verification.corrections?.depreciationMethod) {
      result.depreciationMethod = verification.corrections.depreciationMethod;
    }
    if (verification.corrections?.depreciationNotes) {
      result.depreciationNotes = verification.corrections.depreciationNotes;
    }

    // Merge additional items (deduplicate by name/type)
    if (verification.additionalDeductibles?.length > 0) {
      const existingTypes = new Set(result.deductibles.map((d) => d.type));
      for (const ded of verification.additionalDeductibles) {
        if (!existingTypes.has(ded.type)) {
          result.deductibles.push(policyDeductibleSchema.parse(ded));
        }
      }
    }

    if (verification.additionalEndorsements?.length > 0) {
      const existingNames = new Set(
        result.endorsements.map((e) => e.name.toLowerCase())
      );
      for (const end of verification.additionalEndorsements) {
        if (!existingNames.has(end.name?.toLowerCase())) {
          result.endorsements.push(policyEndorsementSchema.parse(end));
        }
      }
    }

    if (verification.additionalExclusions?.length > 0) {
      const existingNames = new Set(
        result.exclusions.map((e) => e.name.toLowerCase())
      );
      for (const exc of verification.additionalExclusions) {
        if (!existingNames.has(exc.name?.toLowerCase())) {
          result.exclusions.push(policyExclusionSchema.parse(exc));
        }
      }
    }

    if (verification.additionalLandmines?.length > 0) {
      const existingIds = new Set(result.landmines.map((l) => l.ruleId));
      for (const lm of verification.additionalLandmines) {
        if (!existingIds.has(lm.ruleId)) {
          result.landmines.push(detectedLandmineSchema.parse(lm));
        }
      }
      result.landmines = enrichLandmines(result.landmines);
    }

    if (verification.additionalFavorableProvisions?.length > 0) {
      const existingIds = new Set(
        result.favorableProvisions.map((f) => f.provisionId)
      );
      for (const fp of verification.additionalFavorableProvisions) {
        if (!existingIds.has(fp.provisionId)) {
          result.favorableProvisions.push(
            detectedFavorableSchema.parse(fp)
          );
        }
      }
    }

    // Apply confidence adjustments
    if (verification.confidenceAdjustments) {
      const adj = verification.confidenceAdjustments;
      if (typeof adj.deductibles === "number")
        result.sectionConfidence.deductibles = adj.deductibles;
      if (typeof adj.endorsements === "number")
        result.sectionConfidence.endorsements = adj.endorsements;
      if (typeof adj.exclusions === "number")
        result.sectionConfidence.exclusions = adj.exclusions;
      if (typeof adj.depreciation === "number")
        result.sectionConfidence.depreciation = adj.depreciation;
    }

    // Update overall confidence as weighted average
    const sc = result.sectionConfidence;
    result.confidence =
      (sc.policyMeta * 0.15 +
        sc.coverages * 0.15 +
        sc.deductibles * 0.2 +
        sc.depreciation * 0.15 +
        sc.exclusions * 0.2 +
        sc.endorsements * 0.15);

    // Append verification notes
    if (verification.verificationNotes) {
      result.parseNotes = result.parseNotes
        ? `${result.parseNotes} | Verification: ${verification.verificationNotes}`
        : `Verification: ${verification.verificationNotes}`;
    }

    // Recalculate risk level
    const hasCritical = result.landmines.some(
      (l) => l.severity === "critical"
    );
    const hasWarning = result.landmines.some(
      (l) => l.severity === "warning"
    );
    result.riskLevel = hasCritical ? "high" : hasWarning ? "medium" : "low";

    console.log(
      `[policy-parser] Pass 3 — Verification complete. Added: ${verification.additionalDeductibles?.length || 0} deductibles, ${verification.additionalEndorsements?.length || 0} endorsements, ${verification.additionalExclusions?.length || 0} exclusions. New confidence: ${result.confidence.toFixed(2)}`
    );

    return result;
  } catch (err) {
    console.error(
      "[policy-parser] Pass 3 verification failed, using Pass 2 results:",
      err
    );
    // Non-fatal — return Pass 2 results as-is
    return extraction;
  }
}

// ── Carrier Form Enrichment ─────────────────────────────────────────────────

function enrichWithCarrierForms(
  analysis: PolicyAnalysis,
  docMeta: DocumentMeta
): PolicyAnalysis {
  if (!docMeta.carrier || docMeta.endorsementFormNumbers.length === 0) {
    return analysis;
  }

  const carrierName = docMeta.carrier.toLowerCase();
  const matchingForms = CARRIER_ENDORSEMENT_FORMS.filter(
    (f) => carrierName.includes(f.carrier.toLowerCase())
  );

  if (matchingForms.length === 0) return analysis;

  const result = { ...analysis };
  const existingEndorsementNames = new Set(
    result.endorsements.map((e) => e.name.toLowerCase())
  );

  for (const formNumber of docMeta.endorsementFormNumbers) {
    const normalized = formNumber.trim().toUpperCase().replace(/\s+/g, " ");
    const knownForm = matchingForms.find(
      (f) =>
        normalized.includes(f.formNumber.toUpperCase().replace(/\s+/g, " "))
    );

    if (knownForm && !existingEndorsementNames.has(knownForm.name.toLowerCase())) {
      result.endorsements.push({
        name: knownForm.name,
        number: formNumber,
        effectiveDate: null,
        description: knownForm.effect,
        impact: knownForm.effect,
        severity: knownForm.severity,
        needsVerification:
          docMeta.documentType === "dec_page_only",
        verificationReason:
          docMeta.documentType === "dec_page_only"
            ? "Identified from form number on declarations page. Full endorsement text not available."
            : null,
      });
      existingEndorsementNames.add(knownForm.name.toLowerCase());

      // If this endorsement adds an exclusion, add it too
      if (knownForm.affectsFields.includes("exclusions")) {
        const exclusionExists = result.exclusions.some(
          (e) =>
            e.name.toLowerCase().includes(knownForm.name.toLowerCase()) ||
            knownForm.name.toLowerCase().includes(e.name.toLowerCase())
        );
        if (!exclusionExists) {
          result.exclusions.push({
            name: `${knownForm.name} (from endorsement ${formNumber})`,
            description: knownForm.effect,
            policyLanguage:
              "Identified from endorsement form number — full text not available",
            severity: knownForm.severity,
            impact: knownForm.effect,
            needsVerification: true,
            verificationReason:
              "Inferred from endorsement form number. Upload full policy to confirm exact language.",
          });
        }
      }

      console.log(
        `[policy-parser] Enriched: ${formNumber} → ${knownForm.name} (${knownForm.severity})`
      );
    }
  }

  return result;
}

// ── Post-Processing ──────────────────────────────────────────────────────────

function enrichLandmines(detected: DetectedLandmine[]): DetectedLandmine[] {
  return detected.map((landmine) => {
    const rule = LANDMINE_RULES.find(
      (r: LandmineRule) => r.id === landmine.ruleId
    );
    if (rule) {
      return {
        ...landmine,
        actionItem: landmine.actionItem || rule.actionItem,
        severity: rule.severity,
        category: rule.category,
      };
    }
    return landmine;
  });
}

// ── Percentage Deductible Calculator ────────────────────────────────────────

function calculatePercentageDeductibles(
  analysis: PolicyAnalysis
): PolicyAnalysis {
  const coverageA = analysis.coverages.find(
    (c) => c.section === "coverage_a"
  );
  if (!coverageA?.limit) return analysis;

  // Extract dollar amount from Coverage A limit
  const limitStr = coverageA.limit.replace(/[^0-9.]/g, "");
  const limitAmount = parseFloat(limitStr);
  if (isNaN(limitAmount) || limitAmount <= 0) return analysis;

  const result = { ...analysis };
  result.deductibles = result.deductibles.map((d) => {
    if (d.dollarAmount !== null) return d; // Already calculated

    // Check if amount contains a percentage
    const percentMatch = d.amount.match(/([\d.]+)\s*%/);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      if (!isNaN(percent) && percent > 0) {
        return {
          ...d,
          dollarAmount: Math.round(limitAmount * (percent / 100)),
        };
      }
    }

    // Try to extract dollar amount from string
    const dollarMatch = d.amount.replace(/[^0-9.]/g, "");
    const dollarAmount = parseFloat(dollarMatch);
    if (!isNaN(dollarAmount) && dollarAmount > 0) {
      return { ...d, dollarAmount };
    }

    return d;
  });

  return result;
}

// ── Degraded Result (Error Recovery) ────────────────────────────────────────

function createDegradedResult(
  error: string,
  docMeta?: DocumentMeta
): PolicyAnalysis {
  return {
    policyType: docMeta?.policyFormType || "UNKNOWN",
    carrier: docMeta?.carrier || "Unknown",
    policyNumber: "",
    effectiveDate: null,
    expirationDate: null,
    namedInsured: "",
    propertyAddress: "",
    coverages: [],
    deductibles: [],
    depreciationMethod: "UNKNOWN",
    depreciationNotes: "Could not determine — parsing failed.",
    exclusions: [],
    endorsements: [],
    landmines: [],
    favorableProvisions: [],
    summaryForContractor:
      "Policy analysis could not be completed. Please try uploading a clearer copy of the policy document.",
    riskLevel: "medium",
    documentType: docMeta?.documentType || "unknown",
    scanQuality: docMeta?.scanQuality || "poor",
    missingDocumentWarning:
      "Policy analysis failed. The document may be unreadable, password-protected, or in an unsupported format.",
    endorsementFormNumbers: docMeta?.endorsementFormNumbers || [],
    sectionConfidence: {
      policyMeta: 0,
      coverages: 0,
      deductibles: 0,
      depreciation: 0,
      exclusions: 0,
      endorsements: 0,
    },
    confidence: 0,
    parseNotes: `Analysis failed: ${error}`,
  };
}

// ── V2 ORCHESTRATOR (Main Entry Point) ──────────────────────────────────────

export async function parsePolicyPdfV2(
  pdfBase64: string,
  claimType?: string
): Promise<PolicyAnalysis> {
  try {
    // Pass 1: Document Intelligence
    console.log("[policy-parser] Starting Pass 1 — Document Intelligence...");
    const docMeta = await analyzeDocumentType(pdfBase64);

    // Pass 2: Full Extraction
    console.log("[policy-parser] Starting Pass 2 — Full Extraction...");
    let extraction = await fullExtraction(pdfBase64, claimType, docMeta);

    // Enrich with carrier form database
    extraction = enrichWithCarrierForms(extraction, docMeta);

    // Pass 3: Verification
    console.log("[policy-parser] Starting Pass 3 — Verification...");
    let verified = await verifyExtraction(pdfBase64, extraction);

    // Post-processing: calculate percentage deductibles
    verified = calculatePercentageDeductibles(verified);

    console.log(
      `[policy-parser] Pipeline complete. Final confidence: ${verified.confidence.toFixed(2)}, Risk: ${verified.riskLevel}, Deductibles: ${verified.deductibles.length}, Endorsements: ${verified.endorsements.length}, Exclusions: ${verified.exclusions.length}`
    );

    return verified;
  } catch (err) {
    console.error("[policy-parser] Pipeline failed:", err);
    // Return degraded result instead of crashing
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Try to at least get document meta if possible
    let docMeta: DocumentMeta | undefined;
    try {
      docMeta = await analyzeDocumentType(pdfBase64);
    } catch {
      // Even Pass 1 failed
    }

    return createDegradedResult(errorMsg, docMeta);
  }
}

// ── Legacy V1 Export (still used by existing supplement wizard) ──────────────

export async function parsePolicyPdf(
  pdfBase64: string,
  claimType?: string
): Promise<PolicyAnalysis> {
  // V1 now delegates to V2
  return parsePolicyPdfV2(pdfBase64, claimType);
}
