// ── Policy Knowledge Base ────────────────────────────────────────────────────
//
// Structured knowledge for parsing HO (homeowner) insurance policies.
// Used by the Policy Decoder to identify coverages, exclusions, and landmines.
//
// Target policy types: HO-3 (Special Form), HO-5 (Comprehensive), HO-6 (Condo)
// Target markets: MD, PA

// ── Coverage Section Definitions ─────────────────────────────────────────────

export interface CoverageSection {
  id: string;
  label: string;
  description: string;
  /** What to look for in the policy PDF */
  searchTerms: string[];
  /** Relevance to roofing/siding claims */
  claimRelevance: "primary" | "secondary" | "reference";
}

export const COVERAGE_SECTIONS: CoverageSection[] = [
  {
    id: "coverage_a",
    label: "Coverage A — Dwelling",
    description:
      "Covers the structure itself including roof, siding, attached structures. This is the primary coverage for roofing/siding claims.",
    searchTerms: [
      "Coverage A",
      "Dwelling",
      "dwelling coverage",
      "Coverage A - Dwelling",
      "SECTION I - COVERAGES",
    ],
    claimRelevance: "primary",
  },
  {
    id: "coverage_b",
    label: "Coverage B — Other Structures",
    description:
      "Covers detached structures (sheds, detached garages, fences). Usually 10% of Coverage A. Relevant if detached structures have roof/siding damage.",
    searchTerms: [
      "Coverage B",
      "Other Structures",
      "other structures coverage",
    ],
    claimRelevance: "secondary",
  },
  {
    id: "coverage_c",
    label: "Coverage C — Personal Property",
    description:
      "Covers personal belongings. Not directly relevant to roofing/siding but may cover interior damage from roof leaks.",
    searchTerms: ["Coverage C", "Personal Property", "contents coverage"],
    claimRelevance: "reference",
  },
  {
    id: "coverage_d",
    label: "Coverage D — Loss of Use / ALE",
    description:
      "Additional Living Expenses if home is uninhabitable. Relevant for severe roof damage requiring temporary relocation.",
    searchTerms: [
      "Coverage D",
      "Loss of Use",
      "Additional Living Expense",
      "ALE",
    ],
    claimRelevance: "secondary",
  },
  {
    id: "law_ordinance",
    label: "Law & Ordinance Coverage",
    description:
      "Covers cost to bring property to current building code during repairs. CRITICAL for roofing — if code requires ice & water shield, ventilation upgrades, or drip edge that the original roof didn't have, this coverage pays for it.",
    searchTerms: [
      "Law and Ordinance",
      "Law or Ordinance",
      "Ordinance or Law",
      "building code",
      "code upgrade",
      "code enforcement",
    ],
    claimRelevance: "primary",
  },
  {
    id: "extended_replacement",
    label: "Extended Replacement Cost",
    description:
      "Pays above Coverage A limit (typically 25-50% extra) if costs exceed the dwelling limit. Important for large claims.",
    searchTerms: [
      "Extended Replacement",
      "extended dwelling",
      "guaranteed replacement",
      "additional replacement",
    ],
    claimRelevance: "secondary",
  },
];

// ── Depreciation Methods ─────────────────────────────────────────────────────

export type DepreciationMethod = "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN";

export interface DepreciationInfo {
  method: DepreciationMethod;
  label: string;
  description: string;
  impact: string;
}

export const DEPRECIATION_METHODS: Record<DepreciationMethod, DepreciationInfo> =
  {
    RCV: {
      method: "RCV",
      label: "Replacement Cost Value",
      description:
        "Carrier pays full cost to replace with like kind and quality, minus deductible. Depreciation is recoverable after repairs are completed.",
      impact:
        "FAVORABLE — Homeowner recovers full replacement cost after completing repairs. Initial payment may include depreciation holdback that is released upon proof of completed work.",
    },
    ACV: {
      method: "ACV",
      label: "Actual Cash Value",
      description:
        "Carrier pays replacement cost MINUS depreciation. Depreciation is NOT recoverable. Older roofs get significantly less.",
      impact:
        "UNFAVORABLE — On a 15-year-old roof with 25-year shingles, carrier may depreciate 60% of the replacement cost. Homeowner pays the difference out of pocket. This is a LANDMINE if the homeowner doesn't understand it.",
    },
    MODIFIED_ACV: {
      method: "MODIFIED_ACV",
      label: "Modified/Scheduled ACV",
      description:
        "Some states or policies use modified ACV where only materials are depreciated, not labor. Or depreciation follows a schedule.",
      impact:
        "VARIES — Check state law. Some states (e.g., several have anti-depreciation-of-labor statutes) prohibit depreciating labor costs.",
    },
    UNKNOWN: {
      method: "UNKNOWN",
      label: "Could Not Determine",
      description:
        "The depreciation method could not be clearly determined from the policy. Recommend manual review.",
      impact: "REVIEW NEEDED — Confirm with carrier or agent before proceeding.",
    },
  };

// ── Landmine Definitions ─────────────────────────────────────────────────────
// These are policy provisions that can hurt the homeowner if not caught early.

export interface LandmineRule {
  id: string;
  name: string;
  severity: "critical" | "warning" | "info";
  category: "exclusion" | "limitation" | "condition" | "endorsement";
  description: string;
  /** What the policy language typically says */
  typicalLanguage: string[];
  /** What this means for the claim */
  impact: string;
  /** What the homeowner should do */
  actionItem: string;
  /** Which claim types this affects */
  affectedClaimTypes: string[];
}

export const LANDMINE_RULES: LandmineRule[] = [
  {
    id: "cosmetic_exclusion",
    name: "Cosmetic Damage Exclusion",
    severity: "critical",
    category: "endorsement",
    description:
      "Excludes coverage for damage that is cosmetic in nature — damage that affects appearance but not function. Common on metal roofs and siding. Some carriers apply it to shingles (hail dents that don't crack the shingle).",
    typicalLanguage: [
      "cosmetic damage",
      "cosmetic exclusion",
      "does not affect the function",
      "marring, pitting, or denting",
      "appearance only",
      "functional damage",
      "cosmetic loss",
    ],
    impact:
      "If present, carrier will ONLY pay for damage that affects the roof's function (leaks, missing shingles, cracked shingles). Hail dents that don't crack the shingle mat may be excluded. This can reduce a $15,000 claim to $0.",
    actionItem:
      "Check if the endorsement was added at renewal (not original policy). Document ALL functional damage — cracked shingles, exposed fiberglass mat, broken seal strips. Get manufacturer statement that cosmetic damage voids warranty.",
    affectedClaimTypes: ["hail", "wind_hail", "impact"],
  },
  {
    id: "anti_matching",
    name: "Anti-Matching / Limited Matching",
    severity: "critical",
    category: "limitation",
    description:
      "Limits the carrier's obligation to match undamaged areas. If only one slope is damaged, carrier may only pay to replace that slope — even if the new shingles don't match the existing (different color, weathering, discontinued line).",
    typicalLanguage: [
      "matching",
      "we will not pay for undamaged",
      "uniform appearance",
      "match in color",
      "match in quality",
      "cosmetic matching",
      "we will not pay to replace undamaged property",
      "consistent appearance",
    ],
    impact:
      "Carrier may refuse to replace the entire roof even when new shingles visibly don't match existing. Homeowner is left with a mismatched roof that reduces property value.",
    actionItem:
      "Check state law — many states require matching (MD, VA have case law supporting matching). Get manufacturer documentation that the shingle line is discontinued or color is unavailable. Document the visible mismatch with photos.",
    affectedClaimTypes: ["hail", "wind", "wind_hail", "impact"],
  },
  {
    id: "acv_depreciation",
    name: "ACV (Actual Cash Value) Policy",
    severity: "critical",
    category: "condition",
    description:
      "Policy settles on Actual Cash Value basis — depreciation is NOT recoverable. Homeowner receives replacement cost minus depreciation minus deductible.",
    typicalLanguage: [
      "actual cash value",
      "ACV",
      "depreciation is not recoverable",
      "we will pay the actual cash value",
      "less depreciation",
      "depreciated value",
    ],
    impact:
      "On a 15-year-old architectural shingle roof (25-year warranty), depreciation could be 40-60% of replacement cost. A $20,000 replacement could net only $8,000-$12,000 minus deductible.",
    actionItem:
      "Calculate the depreciation impact early so the homeowner understands their out-of-pocket. Check if the policy was converted from RCV to ACV at a renewal (homeowner may not know). Check state law on depreciation of labor.",
    affectedClaimTypes: ["hail", "wind", "wind_hail", "fire", "impact"],
  },
  {
    id: "roof_age_schedule",
    name: "Roof Age / Payment Schedule",
    severity: "critical",
    category: "endorsement",
    description:
      "Some policies include a roof payment schedule that reduces payment based on roof age. A roof over 10-15 years old may only receive ACV even on an otherwise RCV policy.",
    typicalLanguage: [
      "roof payment schedule",
      "roof surfacing",
      "roof age",
      "age of roof",
      "roof covering",
      "roof surface material",
      "roof schedule",
      "roof surfaces age",
    ],
    impact:
      "Even on RCV policies, if the roof is over the schedule threshold (often 10 or 15 years), the claim settles at ACV for the roof portion only. This is increasingly common and is a MAJOR landmine.",
    actionItem:
      "Check the endorsement effective date. If added at renewal, document when. Verify the roof age — sometimes the carrier's records are wrong. Check if there are state regulations limiting these schedules.",
    affectedClaimTypes: ["hail", "wind", "wind_hail"],
  },
  {
    id: "sublimit_wind_hail",
    name: "Wind/Hail Sublimit or Separate Deductible",
    severity: "warning",
    category: "limitation",
    description:
      "Some policies have a separate (higher) deductible for wind or hail damage, or a sublimit that caps wind/hail payments below the Coverage A limit.",
    typicalLanguage: [
      "wind deductible",
      "hail deductible",
      "hurricane deductible",
      "wind/hail deductible",
      "named storm deductible",
      "percentage deductible",
      "separate deductible for wind",
    ],
    impact:
      "A 2% wind/hail deductible on a $400,000 home = $8,000 deductible instead of $1,000. The homeowner may not realize their deductible is this high until the claim is filed.",
    actionItem:
      "Calculate the actual deductible amount immediately. If it's a percentage deductible, explain the dollar impact. Check if the damage qualifies as a different peril with a lower deductible.",
    affectedClaimTypes: ["wind", "hail", "wind_hail"],
  },
  {
    id: "duty_to_cooperate",
    name: "Duty to Cooperate / Duty to Mitigate",
    severity: "warning",
    category: "condition",
    description:
      "Policy requires the insured to cooperate with the carrier's investigation and to mitigate (prevent further) damage. Failure can be used to deny the claim.",
    typicalLanguage: [
      "duty to cooperate",
      "duties after loss",
      "protect the property",
      "mitigate",
      "prevent further damage",
      "make temporary repairs",
      "cooperate with our investigation",
    ],
    impact:
      "If the homeowner doesn't tarp a leaking roof or refuses to provide requested documents, the carrier can use this to delay or deny payment.",
    actionItem:
      "Document all temporary repairs with photos and receipts. Respond to all carrier requests in writing. Keep a log of all communications. Temporary repair costs are typically covered under the claim.",
    affectedClaimTypes: ["hail", "wind", "wind_hail", "fire", "impact"],
  },
  {
    id: "no_law_ordinance",
    name: "No Law & Ordinance Coverage",
    severity: "warning",
    category: "exclusion",
    description:
      "Policy does NOT include Law & Ordinance coverage, or includes it with a very low sublimit. This means code-required upgrades during re-roof are NOT covered.",
    typicalLanguage: [
      "ordinance or law exclusion",
      "we do not pay for the cost to comply",
      "building codes",
      "enforcement of any ordinance or law",
      "law or ordinance",
    ],
    impact:
      "If the building code requires ice & water shield, new drip edge, ventilation upgrades, or permits that the original roof didn't have, the homeowner pays for all code-required upgrades out of pocket.",
    actionItem:
      "Identify all code-required items (ice & water, drip edge, ventilation per IRC) and calculate the cost. Present to homeowner so they understand the gap. These items should still be in the supplement as code-required — the carrier may concede them even without L&O coverage.",
    affectedClaimTypes: ["hail", "wind", "wind_hail", "fire"],
  },
  {
    id: "prior_damage_exclusion",
    name: "Prior/Pre-Existing Damage Language",
    severity: "warning",
    category: "condition",
    description:
      "Policy or carrier may exclude damage that predates the covered loss event. Carriers sometimes attribute all damage to pre-existing conditions rather than the claimed event.",
    typicalLanguage: [
      "pre-existing",
      "prior damage",
      "wear and tear",
      "gradual deterioration",
      "maintenance",
      "inherent vice",
      "faulty workmanship",
      "defective material",
    ],
    impact:
      "Carrier may attribute legitimate storm damage to pre-existing wear, reducing or denying the claim. This is a common denial tactic, especially on older roofs.",
    actionItem:
      "Document the roof condition BEFORE the loss event if possible. Get weather data confirming the storm event. Show that the damage pattern is consistent with the claimed peril (e.g., hail hits on one slope facing the storm direction).",
    affectedClaimTypes: ["hail", "wind", "wind_hail", "impact"],
  },
  {
    id: "assignment_of_benefits",
    name: "Anti-Assignment / AOB Restriction",
    severity: "info",
    category: "condition",
    description:
      "Some policies restrict Assignment of Benefits (AOB), preventing the homeowner from assigning their insurance benefits to a contractor.",
    typicalLanguage: [
      "assignment of benefits",
      "AOB",
      "may not assign",
      "assignment of this policy",
      "transfer of benefits",
    ],
    impact:
      "If present, the contractor cannot receive payment directly from the carrier. All payments go to the homeowner. This affects the contractor's business model but not the claim value.",
    actionItem:
      "If AOB is restricted, ensure the contractor's agreement accounts for this. Payment will go through the homeowner. This does NOT affect the supplement amount — only the payment flow.",
    affectedClaimTypes: ["hail", "wind", "wind_hail", "fire", "impact"],
  },
];

// ── Commonly Missed Policy Provisions (Favorable to Homeowner) ───────────────

export interface FavorableProvision {
  id: string;
  name: string;
  description: string;
  searchTerms: string[];
  impact: string;
  /** How this links to supplement line items */
  supplementRelevance: string;
}

export const FAVORABLE_PROVISIONS: FavorableProvision[] = [
  {
    id: "matching_required",
    name: "Matching Provision",
    description:
      "Policy explicitly requires the carrier to match repairs to undamaged areas for uniform appearance.",
    searchTerms: [
      "uniform appearance",
      "matching",
      "match undamaged",
      "reasonably uniform",
      "consistent appearance",
      "like kind and quality",
    ],
    impact:
      "If the policy has matching language, the carrier must replace enough material to achieve a uniform appearance — potentially the entire roof even if only one slope was damaged.",
    supplementRelevance:
      "Justifies full roof replacement when new shingles cannot match existing. Document with photos showing color/texture difference.",
  },
  {
    id: "code_upgrade_coverage",
    name: "Code Upgrade / Law & Ordinance Coverage",
    description:
      "Policy includes coverage for bringing the property to current building code during covered repairs.",
    searchTerms: [
      "law and ordinance",
      "building code",
      "code upgrade",
      "ordinance coverage",
    ],
    impact:
      "Pays for code-required items: ice & water shield, drip edge, ventilation upgrades, permits. This can add $500-$3,000 to a roofing claim.",
    supplementRelevance:
      "Justifies line items: RFG FELT+ (ice & water), RFG DRIP (drip edge), RFG VENT+ (ventilation), permits. Cross-reference with local building code requirements.",
  },
  {
    id: "overhead_profit",
    name: "Overhead & Profit Allowance",
    description:
      "Policy language that supports contractor overhead and profit (typically 10% + 10% = 20%).",
    searchTerms: [
      "overhead and profit",
      "overhead & profit",
      "O&P",
      "general contractor",
      "reasonable costs",
      "contractor overhead",
    ],
    impact:
      "O&P is denied ~85% of the time on first submission but is recoverable when three or more trades are involved (roofing + gutters + siding = 3 trades).",
    supplementRelevance:
      "Justifies O&P line item when multiple trades are needed. Document each trade separately in the supplement.",
  },
  {
    id: "recoverable_depreciation",
    name: "Recoverable Depreciation (RCV)",
    description:
      "Policy confirms replacement cost valuation with recoverable depreciation after repairs are completed.",
    searchTerms: [
      "replacement cost",
      "recoverable depreciation",
      "depreciation holdback",
      "upon completion of repairs",
      "proof of completed repairs",
    ],
    impact:
      "Homeowner can recover the full replacement cost after completing repairs. This is the most favorable settlement basis.",
    supplementRelevance:
      "All line items should be priced at full replacement cost. The initial payment may include a depreciation holdback that is released upon proof of completion.",
  },
];

// ── Claim Type Relevance Filters ─────────────────────────────────────────────

export const CLAIM_TYPE_POLICY_SECTIONS: Record<string, string[]> = {
  wind: [
    "coverage_a",
    "law_ordinance",
    "extended_replacement",
    "sublimit_wind_hail",
  ],
  hail: [
    "coverage_a",
    "law_ordinance",
    "extended_replacement",
    "sublimit_wind_hail",
    "cosmetic_exclusion",
  ],
  wind_hail: [
    "coverage_a",
    "law_ordinance",
    "extended_replacement",
    "sublimit_wind_hail",
    "cosmetic_exclusion",
  ],
  fire: ["coverage_a", "coverage_d", "law_ordinance", "extended_replacement"],
  impact: ["coverage_a", "law_ordinance", "extended_replacement"],
};

// ── Base Form Exclusions ────────────────────────────────────────────────────
// Standard exclusions that exist in EVERY policy of a given form type.
// These don't need to be "found" — they're always present in the base form.
// Used by the V2 parser to provide baseline knowledge.

export interface BaseFormExclusion {
  formType: string; // "HO-3", "HO-5", "HO-6"
  name: string;
  description: string;
  isStandard: boolean; // true = in every policy of this type
  claimRelevance: "high" | "medium" | "low";
}

export const BASE_FORM_EXCLUSIONS: BaseFormExclusion[] = [
  // ── HO-3 Standard Exclusions (Section I — Exclusions) ─────────────
  {
    formType: "HO-3",
    name: "Ordinance or Law",
    description:
      "Excludes enforcement of any ordinance or law regulating construction, repair, or demolition — UNLESS the policy includes Law & Ordinance coverage as an endorsement or added coverage.",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-3",
    name: "Earth Movement",
    description:
      "Excludes damage from earthquake, landslide, mudflow, earth sinking/shifting, or erosion. Does NOT apply to ensuing fire or explosion.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-3",
    name: "Water Damage (Flood)",
    description:
      "Excludes flood, surface water, waves, tidal water, overflow of a body of water, and spray from any of these. Separate flood policy (NFIP) required.",
    isStandard: true,
    claimRelevance: "medium",
  },
  {
    formType: "HO-3",
    name: "Power Failure",
    description:
      "Excludes loss caused by failure of power or other utility service if the failure originates away from the insured premises.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-3",
    name: "Neglect",
    description:
      "Excludes loss resulting from neglect of the insured to use all reasonable means to save and preserve property at and after the time of loss.",
    isStandard: true,
    claimRelevance: "medium",
  },
  {
    formType: "HO-3",
    name: "War",
    description:
      "Excludes loss caused by war, including undeclared war, civil war, insurrection, rebellion, or revolution.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-3",
    name: "Nuclear Hazard",
    description:
      "Excludes loss caused by nuclear hazard including nuclear reaction, radiation, or radioactive contamination.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-3",
    name: "Intentional Loss",
    description:
      "Excludes loss arising out of any act committed by or at the direction of an insured with intent to cause a loss.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-3",
    name: "Government Action",
    description:
      "Excludes seizure or destruction of property by order of governmental authority. Exception: acts taken to prevent spread of fire.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-3",
    name: "Wear & Tear / Gradual Deterioration",
    description:
      "Excludes damage from wear and tear, marring, deterioration, inherent vice, latent defect, mechanical breakdown, rust, mold, wet/dry rot. Standard in Section I — Perils Excluded.",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-3",
    name: "Faulty Workmanship / Defective Materials",
    description:
      "Excludes faulty, inadequate, or defective planning, design, workmanship, materials, or maintenance. Does NOT exclude ensuing covered loss (e.g., a leak from bad installation that lets rain in — the rain damage may be covered).",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-3",
    name: "Smog / Smoke from Agriculture or Industry",
    description:
      "Excludes damage from smog, smoke from agricultural or industrial operations.",
    isStandard: true,
    claimRelevance: "low",
  },

  // ── HO-5 Standard Exclusions ──────────────────────────────────────
  // HO-5 is broader than HO-3 (open perils on personal property too)
  // but shares the same Section I exclusions
  {
    formType: "HO-5",
    name: "Ordinance or Law",
    description:
      "Same as HO-3: excludes code enforcement costs unless L&O coverage added.",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-5",
    name: "Earth Movement",
    description: "Same as HO-3: excludes earthquake, landslide, etc.",
    isStandard: true,
    claimRelevance: "low",
  },
  {
    formType: "HO-5",
    name: "Water Damage (Flood)",
    description: "Same as HO-3: excludes flood, surface water.",
    isStandard: true,
    claimRelevance: "medium",
  },
  {
    formType: "HO-5",
    name: "Wear & Tear / Gradual Deterioration",
    description: "Same as HO-3: excludes wear and tear, rot, mold, rust.",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-5",
    name: "Faulty Workmanship / Defective Materials",
    description:
      "Same as HO-3: excludes faulty workmanship, but ensuing covered loss may still be payable.",
    isStandard: true,
    claimRelevance: "high",
  },

  // ── HO-6 Standard Exclusions (Condo) ──────────────────────────────
  {
    formType: "HO-6",
    name: "Ordinance or Law",
    description:
      "Same exclusion as HO-3, but for condo unit owner's portion only.",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-6",
    name: "Wear & Tear / Gradual Deterioration",
    description:
      "Standard exclusion. For condos, distinguish between unit owner responsibility and HOA responsibility.",
    isStandard: true,
    claimRelevance: "high",
  },
  {
    formType: "HO-6",
    name: "Water Damage (Flood)",
    description: "Same flood exclusion as HO-3.",
    isStandard: true,
    claimRelevance: "medium",
  },
];

// ── Carrier Endorsement Form Database ───────────────────────────────────────
// Maps known carrier form numbers to their effects.
// Used by V2 parser to interpret endorsement form numbers from dec pages.
// Phase 1: Top carriers in MD/PA market.

export interface CarrierEndorsementForm {
  carrier: string;
  formNumber: string;
  name: string;
  effect: string;
  severity: "critical" | "warning" | "info";
  affectsFields: (
    | "exclusions"
    | "deductibles"
    | "depreciation"
    | "coverages"
  )[];
}

export const CARRIER_ENDORSEMENT_FORMS: CarrierEndorsementForm[] = [
  // ── State Farm ────────────────────────────────────────────────────
  {
    carrier: "State Farm",
    formNumber: "HW 08 02",
    name: "Cosmetic Damage Exclusion",
    effect:
      "Excludes coverage for cosmetic damage to roof, gutters, and siding — damage that affects appearance but not function. Hail dents that don't crack shingles may be excluded.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "State Farm",
    formNumber: "FE-5398",
    name: "Roof Payment Schedule",
    effect:
      "Modifies roof coverage payment based on roof age. Roofs over the schedule threshold (often 10-15 years) settle at ACV instead of RCV. Significantly reduces payout on older roofs.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "State Farm",
    formNumber: "FE-5397",
    name: "Wind/Hail Deductible Endorsement",
    effect:
      "Establishes a separate (often higher) deductible for wind and hail damage. May be a percentage of Coverage A instead of a flat dollar amount.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "State Farm",
    formNumber: "FE-3784",
    name: "Ordinance or Law Coverage",
    effect:
      "Adds Law & Ordinance coverage. Pays for code-required upgrades during covered repairs (ice & water shield, drip edge, ventilation, permits).",
    severity: "info",
    affectsFields: ["coverages"],
  },
  {
    carrier: "State Farm",
    formNumber: "FE-6148",
    name: "Water Backup Coverage",
    effect:
      "Covers water backup through sewers, drains, or sump pump failure. Not directly relevant to roofing but indicates broader coverage.",
    severity: "info",
    affectsFields: ["coverages"],
  },

  // ── Erie Insurance ────────────────────────────────────────────────
  {
    carrier: "Erie",
    formNumber: "EP 43 29",
    name: "Cosmetic Damage Limitation",
    effect:
      "Limits coverage for cosmetic damage to roof and siding. Functional damage (leaks, missing pieces, cracks) is still covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Erie",
    formNumber: "EP 43 30",
    name: "Roof Surface Payment Schedule",
    effect:
      "Age-based payment schedule for roof surfaces. Older roofs receive depreciated (ACV) payment instead of full replacement cost.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Erie",
    formNumber: "EP 43 09",
    name: "Wind/Hail Percentage Deductible",
    effect:
      "Sets a percentage-based deductible (typically 1-5% of Coverage A) for wind and hail damage instead of the standard flat deductible.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "Erie",
    formNumber: "EP 43 19",
    name: "Matching of Undamaged Siding or Roofing",
    effect:
      "Addresses matching requirements. May limit or support the carrier's obligation to match undamaged areas for uniform appearance.",
    severity: "warning",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Erie",
    formNumber: "EP 43 06",
    name: "Ordinance or Law Coverage",
    effect:
      "Adds building code upgrade coverage for covered repairs.",
    severity: "info",
    affectsFields: ["coverages"],
  },

  // ── Nationwide ────────────────────────────────────────────────────
  {
    carrier: "Nationwide",
    formNumber: "NH 01 45",
    name: "Cosmetic Damage Exclusion",
    effect:
      "Excludes cosmetic damage to roof and exterior surfaces. Only functional damage (affecting structural integrity or weather protection) is covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Nationwide",
    formNumber: "NH 01 55",
    name: "Roof Surface Material Payment Schedule",
    effect:
      "Applies depreciation schedule to roof surface materials based on age and type. Older composition shingles depreciate more heavily.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Nationwide",
    formNumber: "NH 01 32",
    name: "Separate Wind/Hail Deductible",
    effect:
      "Creates a separate deductible for wind and hail losses, typically higher than the all-perils deductible.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "Nationwide",
    formNumber: "NH 01 44",
    name: "Limited Matching Endorsement",
    effect:
      "Limits the carrier's obligation to replace undamaged materials for matching purposes. Carrier will repair/replace damaged areas only.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },

  // ── Allstate ──────────────────────────────────────────────────────
  {
    carrier: "Allstate",
    formNumber: "ACR5",
    name: "Cosmetic Damage to Roof Exclusion",
    effect:
      "Excludes cosmetic roof damage from coverage. Only damage that impairs the functional purpose of the roof is covered. Common on hail claims.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Allstate",
    formNumber: "ARS1",
    name: "Roof Surface Depreciation Schedule",
    effect:
      "Implements age-based depreciation schedule for roof surfaces. Payment decreases as roof ages past specified thresholds.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Allstate",
    formNumber: "AWH1",
    name: "Wind/Hail Deductible Endorsement",
    effect:
      "Separate deductible for wind and hail damage. May be flat dollar or percentage of dwelling coverage.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "Allstate",
    formNumber: "AMA1",
    name: "Limited Matching / Anti-Matching",
    effect:
      "Limits the insurer's obligation to match undamaged portions of the property. Carrier only replaces damaged sections.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },

  // ── Travelers ─────────────────────────────────────────────────────
  {
    carrier: "Travelers",
    formNumber: "IL P 001",
    name: "Cosmetic Damage Limitation",
    effect:
      "Limits coverage for cosmetic damage to roof surfaces, gutters, and downspouts. Only functional damage to these surfaces is covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Travelers",
    formNumber: "IL T 003",
    name: "Roof Surfaces Payment Schedule",
    effect:
      "Age and material-based payment schedule for roof surfaces. Asphalt shingle roofs over 15 years may settle at ACV.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Travelers",
    formNumber: "IL P 003",
    name: "Wind/Hail Deductible",
    effect:
      "Establishes a separate deductible specifically for wind and hail perils.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },

  // ── USAA ──────────────────────────────────────────────────────────
  {
    carrier: "USAA",
    formNumber: "HO-230",
    name: "Cosmetic Damage Exclusion — Roof",
    effect:
      "Excludes cosmetic damage to roof surfacing. Functional damage only covered under wind/hail peril.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "USAA",
    formNumber: "HO-220",
    name: "Roof Surfacing Payment Schedule",
    effect:
      "Payment schedule based on roof age. Reduces payment percentage as roof ages.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "USAA",
    formNumber: "HO-205",
    name: "Wind/Hail Deductible",
    effect:
      "Separate wind/hail deductible, often percentage-based on dwelling coverage.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "USAA",
    formNumber: "HO-210",
    name: "Ordinance or Law Increased Coverage",
    effect:
      "Increases Law & Ordinance coverage limits for code-required upgrades during repairs.",
    severity: "info",
    affectsFields: ["coverages"],
  },

  // ── Farmers Insurance ─────────────────────────────────────────────
  {
    carrier: "Farmers",
    formNumber: "HE-370",
    name: "Cosmetic Damage to Roof Endorsement",
    effect:
      "Excludes cosmetic damage to roof surfaces. Only functional damage covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Farmers",
    formNumber: "HE-375",
    name: "Roof Payment Schedule",
    effect:
      "Age-based depreciation schedule applied to roof claim payments.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Farmers",
    formNumber: "HE-340",
    name: "Separate Wind/Hail Deductible",
    effect:
      "Separate deductible for wind and hail damage claims.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },

  // ── Liberty Mutual ────────────────────────────────────────────────
  {
    carrier: "Liberty Mutual",
    formNumber: "LM-RCE",
    name: "Roof Cosmetic Exclusion",
    effect:
      "Cosmetic damage exclusion for roof, siding, and gutters. Only functional damage covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Liberty Mutual",
    formNumber: "LM-RAS",
    name: "Roof Age Schedule",
    effect:
      "Roof payment schedule based on roof age and material type.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Liberty Mutual",
    formNumber: "LM-WHD",
    name: "Wind/Hail Deductible",
    effect:
      "Separate deductible applied to wind and hail damage losses.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
];
