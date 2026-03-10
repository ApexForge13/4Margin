# Carrier-Specific Policy Knowledge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add carrier behavioral profiles and per-carrier building code objection mappings for 13 carriers, injected into AI prompts for carrier-aware supplement output.

**Architecture:** New `carrier-profiles.ts` in the shared policy-engine package with two data structures (profiles + code objections) and lookup/formatting functions. Endorsement forms for 5 new carriers added to existing `knowledge.ts`. Re-exported through the chain (`policy-engine/index.ts` → `data/policy-knowledge.ts`). Injected into the analysis prompt alongside existing building code and manufacturer context.

**Tech Stack:** TypeScript, static data arrays, string formatting for prompt injection

---

## Task 1: Carrier Profiles Data + Lookup Functions

**Files:**
- Create: `packages/policy-engine/src/carrier-profiles.ts`

This is the big data file. 13 carrier profiles + carrier-code objection mappings + lookup functions + prompt builder.

**Step 1: Create the carrier profiles file**

```typescript
// ── Carrier-Specific Policy Knowledge ────────────────────────────────────────
//
// Behavioral profiles and code objection mappings for 13 carriers
// in the MD/PA/DE/DC/VA market. Injected into AI prompts for
// carrier-aware supplement generation.
//
// NOT customer-facing — purely AI training context.
//
// Phase 1: Static data from industry knowledge.
// Phase 2 (future): Replaced/supplemented by real outcome data from carrier_patterns table.
// ──────────────────────────────────────────────────────────────────────────────

/* ─────── Types ─────── */

export interface CarrierProfile {
  name: string;
  aliases: string[];
  aggressiveness: "low" | "moderate" | "aggressive";
  supplementTactics: string[];
  commonDenialLanguage: string[];
  adjusterBehavior: string[];
  depreciationApproach: string;
  cosmeticDamageStance: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CarrierCodeObjection {
  carrierName: string;
  ircSection: string;
  objectionRate: "high" | "medium" | "low";
  typicalObjection: string;
  effectiveRebuttal: string;
}

/* ─────── Carrier Profiles ─────── */

export const CARRIER_PROFILES: CarrierProfile[] = [
  // ── State Farm ──────────────────────────────────────────
  {
    name: "State Farm",
    aliases: ["SF", "State Farm Fire and Casualty", "State Farm General"],
    aggressiveness: "aggressive",
    supplementTactics: [
      "Delays supplement review 30-45 days to pressure contractors into accepting original scope",
      "Requires multiple re-inspections before approving additional items",
      "Uses internal pricing that undercuts Xactimate pricing database",
      "Assigns supplements to different adjusters than the original claim to reset relationship",
    ],
    commonDenialLanguage: [
      "Not in original scope of loss",
      "Pre-existing condition — not storm-related",
      "Cosmetic damage only — does not affect function",
      "Like-kind replacement does not require code upgrades",
      "Manufacturer specifications exceed policy coverage",
    ],
    adjusterBehavior: [
      "Staff adjusters often have limited roofing knowledge — rely on Xactimate defaults",
      "May bring their own measurement reports and reject EagleView/Hover data",
      "Tend to scope only the most obviously damaged slope, missing secondary damage",
      "Frequently omit starter strip, drip edge, and ice barrier from initial estimates",
    ],
    depreciationApproach: "Aggressive ACV depreciation on roofs over 10 years via FE-5398 payment schedule. Applies non-recoverable depreciation on labor even in RCV states.",
    cosmeticDamageStance: "Heavy use of cosmetic damage exclusion (HW 08 02). Applied broadly to hail claims — even functional damage may be initially classified as cosmetic.",
    strengths: [
      "Generally pays fair prices on approved items",
      "Supplement portal is organized and trackable",
      "Will approve code upgrades when Law & Ordinance endorsement is present",
    ],
    weaknesses: [
      "Consistently undercounts accessory D&R items (satellite, HVAC, solar)",
      "Routinely omits waste factor or uses unrealistically low waste percentage",
      "Frequently excludes ice & water shield beyond minimum code requirement",
      "Slow supplement cycle — 30-45 day response times common",
    ],
  },

  // ── Erie Insurance ──────────────────────────────────────
  {
    name: "Erie",
    aliases: ["Erie Insurance", "Erie Insurance Group", "Erie Indemnity"],
    aggressiveness: "moderate",
    supplementTactics: [
      "Generally responsive to supplements within 14-21 days",
      "May request contractor to meet adjuster on-site for re-inspection",
      "Prefers itemized justification with code references over narrative arguments",
      "Will negotiate on quantities but rarely disputes legitimate code requirements",
    ],
    commonDenialLanguage: [
      "Quantity exceeds what damage warrants",
      "Alternative repair method available at lower cost",
      "Not required by building code in this jurisdiction",
      "Matching not required — repaired area is acceptable",
    ],
    adjusterBehavior: [
      "Independent adjusters generally knowledgeable about PA/MD building codes",
      "Will accept EagleView measurements when contractor provides the report",
      "More likely to approve full replacement when matching is documented as impossible",
      "May push back on manufacturer-specific requirements if generic product can be used",
    ],
    depreciationApproach: "Moderate depreciation via EP 43 30 roof schedule. Generally applies age-based depreciation on materials only, not labor.",
    cosmeticDamageStance: "Uses EP 43 29 cosmetic limitation — less aggressive than State Farm. Will cover functional damage and sometimes borderline cosmetic-functional damage.",
    strengths: [
      "Reasonable on code-required upgrades — especially in PA where they are headquartered",
      "Matching endorsement (EP 43 19) often works in homeowner's favor",
      "Faster supplement turnaround than national carriers",
      "Generally fair on O&P when multiple trades are documented",
    ],
    weaknesses: [
      "Can be strict on waste percentages — wants documentation for anything over 10%",
      "May not cover full ridge vent replacement if only partial damage",
      "Sometimes disputes ice barrier beyond minimum code footprint",
    ],
  },

  // ── Nationwide ──────────────────────────────────────────
  {
    name: "Nationwide",
    aliases: ["Nationwide Mutual", "Nationwide Insurance", "Allied (Nationwide)"],
    aggressiveness: "aggressive",
    supplementTactics: [
      "Uses desk adjusters for supplement review — no on-site re-inspection",
      "Applies strict line-item-by-line-item review rather than holistic scope assessment",
      "May close claim before supplement is fully reviewed — requires reopening",
      "Requests detailed photo documentation for every disputed item",
    ],
    commonDenialLanguage: [
      "This item was included in the original estimate",
      "Photos do not support the need for this repair",
      "Matching is limited per policy endorsement NH 01 44",
      "Code upgrade not covered — no Law & Ordinance endorsement on policy",
    ],
    adjusterBehavior: [
      "Desk adjusters rely heavily on photo documentation — poor photos = denial",
      "May re-measure from satellite imagery instead of accepting field measurements",
      "Generally follow Xactimate pricing but apply aggressive line-item depreciation",
      "Less willing to approve items without specific code section citations",
    ],
    depreciationApproach: "Aggressive material depreciation via NH 01 55 schedule. Applies per-item depreciation rather than blanket percentage.",
    cosmeticDamageStance: "NH 01 45 cosmetic exclusion applied frequently. Strong stance on hail damage being cosmetic unless clear functional impairment documented.",
    strengths: [
      "Portal-based supplement submission is efficient",
      "Will approve items with strong IRC code citations",
      "Generally fair on permit costs when permits are documented",
    ],
    weaknesses: [
      "Limited matching endorsement (NH 01 44) severely restricts full-slope replacement",
      "Desk adjuster model means less flexibility on borderline items",
      "Frequently omits D&R for accessories that are clearly on the roof",
      "One of the slowest carriers for supplement resolution",
    ],
  },

  // ── Allstate ────────────────────────────────────────────
  {
    name: "Allstate",
    aliases: ["Allstate Insurance", "Allstate Fire and Casualty"],
    aggressiveness: "aggressive",
    supplementTactics: [
      "Aggressively applies anti-matching endorsement to limit full-slope or full-roof replacement",
      "Uses Virtual Assist (video call inspections) that often miss damage visible only in person",
      "May assign claim to catastrophe team during storm season — less familiar with local codes",
      "Supplement responses often include counter-offers at significantly reduced amounts",
    ],
    commonDenialLanguage: [
      "Matching is not required per policy terms",
      "Damage is cosmetic in nature — ACR5 applies",
      "Repair is preferred over replacement",
      "Price exceeds our accepted material pricing",
    ],
    adjusterBehavior: [
      "Catastrophe adjusters may have limited knowledge of state-specific codes",
      "Rely on Allstate internal pricing — may not align with local Xactimate pricing",
      "Often scope only obviously damaged areas and exclude adjacent slopes",
      "May request contractor to use Allstate-approved pricing rather than Xactimate",
    ],
    depreciationApproach: "Aggressive ACV schedule (ARS1) kicks in early — roofs over 8-10 years face significant depreciation.",
    cosmeticDamageStance: "ACR5 cosmetic exclusion is a core part of Allstate's hail strategy. Applied broadly — contractor must prove functional impairment.",
    strengths: [
      "Clear endorsement structure — easy to identify what's on the policy",
      "Will pay O&P when properly documented with trade breakdown",
      "Responsive to DOI complaints — escalation often produces results",
    ],
    weaknesses: [
      "Anti-matching (AMA1) is one of the most restrictive in the industry",
      "Virtual inspections miss significant damage",
      "Internal pricing frequently below market rates",
      "Aggressive on cosmetic exclusions for hail damage",
    ],
  },

  // ── Travelers ───────────────────────────────────────────
  {
    name: "Travelers",
    aliases: ["Travelers Insurance", "Travelers Indemnity", "St. Paul Travelers"],
    aggressiveness: "moderate",
    supplementTactics: [
      "Generally processes supplements within 14-21 days",
      "Prefers supplements submitted through their portal with photo documentation",
      "Will consider on-site re-inspection when contractor provides compelling evidence",
      "Tends to approve code upgrades when policy has Law & Ordinance coverage",
    ],
    commonDenialLanguage: [
      "Item not related to covered peril",
      "Quantity exceeds damaged area",
      "Alternative installation method acceptable",
      "Roof surface payment schedule applies per IL T 003",
    ],
    adjusterBehavior: [
      "Mix of staff and independent adjusters — quality varies",
      "Generally willing to accept contractor measurements with documentation",
      "More likely to approve supplements with IRC code references",
      "Reasonable on O&P when multiple trades are clearly required",
    ],
    depreciationApproach: "Moderate — IL T 003 payment schedule applies at 15+ years for asphalt shingles. More reasonable than State Farm or Allstate thresholds.",
    cosmeticDamageStance: "IL P 001 cosmetic limitation is moderate. Less aggressively applied than State Farm or Allstate equivalents.",
    strengths: [
      "Reasonable supplement turnaround times",
      "Generally fair on code-required upgrades",
      "Accepts IRC code citations as strong evidence",
      "Less aggressive on cosmetic exclusions than peers",
    ],
    weaknesses: [
      "May undercount linear footage on initial estimates",
      "Sometimes disputes manufacturer-specific requirements as 'gold plating'",
      "Wind/hail deductible (IL P 003) can be high percentage",
    ],
  },

  // ── USAA ────────────────────────────────────────────────
  {
    name: "USAA",
    aliases: ["USAA Insurance", "United Services Automobile Association"],
    aggressiveness: "moderate",
    supplementTactics: [
      "Generally fair and responsive — military service culture promotes honor in claims",
      "Uses both staff and independent adjusters — quality varies by region",
      "Supplements processed through online portal — response within 10-21 days",
      "May request detailed scope comparison between original and supplement",
    ],
    commonDenialLanguage: [
      "Not caused by covered peril",
      "Roof age schedule reduces payment per HO-220",
      "Cosmetic damage excluded per HO-230",
      "Scope already included in original estimate",
    ],
    adjusterBehavior: [
      "Generally more willing to discuss scope disagreements",
      "Accepts professional measurement reports",
      "Tends to follow Xactimate pricing without heavy modification",
      "More receptive to code-based arguments than other carriers",
    ],
    depreciationApproach: "Moderate via HO-220. Applies age schedule but less aggressively than State Farm. Tends to be fair on recoverable depreciation.",
    cosmeticDamageStance: "HO-230 cosmetic exclusion exists but applied more selectively. More likely to cover borderline functional-cosmetic damage.",
    strengths: [
      "Generally fair claims handling — above-industry customer satisfaction",
      "Faster supplement review than most national carriers",
      "Receptive to well-documented code and manufacturer arguments",
      "Fair on O&P calculations",
    ],
    weaknesses: [
      "May still apply aggressive roof age depreciation on older homes",
      "HO-230 cosmetic exclusion can be an issue on marginal hail claims",
      "Limited physical adjuster presence — may rely on desk review",
    ],
  },

  // ── Farmers ─────────────────────────────────────────────
  {
    name: "Farmers",
    aliases: ["Farmers Insurance", "Farmers Insurance Group", "21st Century (Farmers)"],
    aggressiveness: "aggressive",
    supplementTactics: [
      "Uses Bristol West/21st Century subsidiaries with different claim processes",
      "May require multiple re-inspections before approving supplement items",
      "Supplement responses often significantly below requested amounts",
      "Tends to close claims quickly — may require formal reopening for supplements",
    ],
    commonDenialLanguage: [
      "Damage does not warrant full replacement",
      "Repair is the appropriate remedy",
      "HE-375 payment schedule applies",
      "Not a covered expense under the policy",
    ],
    adjusterBehavior: [
      "Often use third-party adjusting firms with variable quality",
      "Less familiar with Mid-Atlantic building codes — headquarters in CA",
      "May apply West Coast construction standards to East Coast properties",
      "Tend to underestimate labor costs for steep-pitch and complex roofs",
    ],
    depreciationApproach: "Aggressive via HE-375 payment schedule. Applies early depreciation — sometimes starting at 7-8 year mark.",
    cosmeticDamageStance: "HE-370 cosmetic endorsement applied frequently on hail claims. Broadly interpreted.",
    strengths: [
      "Will respond to formal escalation and DOI complaints",
      "Accepts code citations when properly formatted",
      "Fair on permits when required by local jurisdiction",
    ],
    weaknesses: [
      "Aggressive depreciation schedule kicks in early",
      "Third-party adjusters may lack regional code knowledge",
      "Slow supplement processing — 30+ days common",
      "Frequently disputes waste percentages over 10%",
    ],
  },

  // ── Liberty Mutual ──────────────────────────────────────
  {
    name: "Liberty Mutual",
    aliases: ["Liberty Mutual Insurance", "Liberty Mutual Group", "Safeco (Liberty Mutual)"],
    aggressiveness: "moderate",
    supplementTactics: [
      "Generally processes supplements within 14-28 days",
      "Uses both staff and independent adjusters",
      "Prefers photo-documented supplements with line-by-line justification",
      "May counter-offer at reduced quantities rather than outright denial",
    ],
    commonDenialLanguage: [
      "Roof age schedule reduces payment",
      "Cosmetic damage excluded per LM-RCE",
      "Quantity exceeds documented damage area",
      "Alternative repair method is appropriate",
    ],
    adjusterBehavior: [
      "Staff adjusters generally knowledgeable",
      "Will accept EagleView measurements with documentation",
      "Reasonable on code upgrades when Law & Ordinance coverage present",
      "May negotiate quantities rather than outright deny",
    ],
    depreciationApproach: "Moderate via LM-RAS age schedule. Generally fair — less aggressive than State Farm or Farmers.",
    cosmeticDamageStance: "LM-RCE cosmetic exclusion exists but applied with moderate strictness. More flexible than State Farm or Allstate.",
    strengths: [
      "Reasonable negotiation approach — counter-offers rather than denials",
      "Fair Xactimate pricing acceptance",
      "Good on O&P when documented properly",
      "Safeco subsidiary often more contractor-friendly",
    ],
    weaknesses: [
      "Roof age schedule can still reduce payments significantly on older roofs",
      "May dispute ice barrier coverage beyond minimum code footprint",
      "Supplement portal can be cumbersome",
    ],
  },

  // ── Progressive ─────────────────────────────────────────
  {
    name: "Progressive",
    aliases: ["Progressive Insurance", "Progressive Home", "ASI (Progressive)"],
    aggressiveness: "aggressive",
    supplementTactics: [
      "Growing homeowners book — supplement process still maturing",
      "Uses ASI and HomeGard subsidiaries with inconsistent claim procedures",
      "Desk adjuster heavy — limited field re-inspections for supplements",
      "May apply auto insurance claims mentality to property claims",
    ],
    commonDenialLanguage: [
      "Damage not consistent with reported peril",
      "Repair vs. replacement — repair is adequate",
      "Pricing exceeds our guidelines",
      "Item not related to claimed damage",
    ],
    adjusterBehavior: [
      "Newer to homeowners — adjusters may lack roofing expertise",
      "Heavily reliant on desk review and photo documentation",
      "May use internal pricing below Xactimate market rates",
      "Less familiar with regional building code requirements",
    ],
    depreciationApproach: "Aggressive ACV depreciation. Growing reputation for heavy-handed depreciation on roof claims.",
    cosmeticDamageStance: "Cosmetic exclusions applied aggressively on hail claims. Newer endorsement forms — less established case law.",
    strengths: [
      "Digital-first approach means faster initial claim processing",
      "Will respond to well-documented code-based arguments",
      "Growing carrier — may be more flexible to build contractor relationships",
    ],
    weaknesses: [
      "Inexperienced with property supplement process",
      "Desk-heavy model misses damage details",
      "Internal pricing may not align with Xactimate",
      "Adjusters may lack regional building code knowledge",
    ],
  },

  // ── Amica ───────────────────────────────────────────────
  {
    name: "Amica",
    aliases: ["Amica Mutual", "Amica Insurance"],
    aggressiveness: "low",
    supplementTactics: [
      "Generally fair and responsive — consistently rated top in customer satisfaction",
      "Supplements reviewed within 10-14 days typically",
      "Willing to schedule field re-inspections when evidence supports additional items",
      "Tends to approve supplements with proper documentation without excessive pushback",
    ],
    commonDenialLanguage: [
      "Scope already captured in original estimate",
      "Quantity appears to exceed damaged area",
      "Documentation does not support this line item",
    ],
    adjusterBehavior: [
      "Staff adjusters tend to be well-trained and knowledgeable",
      "Accepts professional measurement reports readily",
      "More willing to discuss scope in good faith",
      "Follows Xactimate pricing without significant modification",
    ],
    depreciationApproach: "Fair depreciation practices. Less likely to use aggressive age schedules. Tends toward RCV settlement when policy supports it.",
    cosmeticDamageStance: "Less aggressive on cosmetic exclusions than most carriers. More likely to cover marginal cosmetic-functional damage.",
    strengths: [
      "Fastest and fairest supplement process among carriers in this list",
      "Generally pays fair market prices",
      "Receptive to code and manufacturer evidence",
      "Fair O&P practices",
      "High customer satisfaction — claims culture prioritizes fairness",
    ],
    weaknesses: [
      "Smaller carrier — less predictable adjuster availability in some areas",
      "May still dispute items without strong documentation",
      "Premium pricing means policyholder expectations are high",
    ],
  },

  // ── Auto-Owners ─────────────────────────────────────────
  {
    name: "Auto-Owners",
    aliases: ["Auto-Owners Insurance", "Auto Owners", "Auto-Owners Group"],
    aggressiveness: "moderate",
    supplementTactics: [
      "Supplements processed within 14-28 days — average speed",
      "Uses both staff and independent adjusters depending on region",
      "Generally willing to re-inspect when contractor provides new evidence",
      "May negotiate quantities and pricing rather than outright deny",
    ],
    commonDenialLanguage: [
      "Repair is adequate — replacement not warranted",
      "Quantity exceeds damaged area measurements",
      "Item not required by local building code",
      "Pre-existing wear and tear — not storm damage",
    ],
    adjusterBehavior: [
      "Staff adjusters in core states (MI, OH, IN) well-trained — independent adjusters in expansion states less consistent",
      "Generally accepts EagleView/measurement report documentation",
      "Reasonable on code requirements when properly cited",
      "May be less familiar with MD/DE-specific code amendments",
    ],
    depreciationApproach: "Moderate depreciation. Does not use overly aggressive age schedules. Generally applies standard depreciation on materials.",
    cosmeticDamageStance: "Has cosmetic exclusion endorsements but applies them moderately. Less aggressive than national carriers.",
    strengths: [
      "Generally contractor-friendly — willing to negotiate in good faith",
      "Fair pricing acceptance aligned with Xactimate",
      "Reasonable O&P practices",
      "Regional presence means adjusters may know local market better",
    ],
    weaknesses: [
      "Slow supplement turnaround in busy seasons",
      "Independent adjusters in expansion states may lack expertise",
      "May not be as familiar with Mid-Atlantic building codes as Erie or Nationwide",
    ],
  },

  // ── Chubb ──────────────────────────────────────────────
  {
    name: "Chubb",
    aliases: ["Chubb Insurance", "Chubb Limited", "ACE (Chubb)", "Chubb Personal Risk Services"],
    aggressiveness: "low",
    supplementTactics: [
      "High-value carrier — expects premium documentation but generally fair",
      "Supplements reviewed promptly — typically 7-14 days",
      "Willing to pay for quality materials and workmanship matching home's standard",
      "Less focused on line-item battles — more holistic scope approach",
    ],
    commonDenialLanguage: [
      "Documentation does not support the scope requested",
      "Alternative approach would be more appropriate for this property",
      "Pricing exceeds reasonable market rates for this area",
    ],
    adjusterBehavior: [
      "Adjusters tend to be experienced with high-value properties",
      "Expects detailed documentation but rewards thoroughness",
      "Will pay for matching and aesthetic considerations on luxury homes",
      "More flexible on manufacturer-specific requirements for premium products",
    ],
    depreciationApproach: "Generally fair — many Chubb policies are guaranteed replacement cost with less depreciation pressure. High-value policies may have no depreciation cap.",
    cosmeticDamageStance: "Less focused on cosmetic exclusions — high-value policies often cover cosmetic damage. Understands that appearance matters for luxury properties.",
    strengths: [
      "Best-in-class for high-value properties — will pay for quality",
      "Fast supplement turnaround",
      "Guaranteed replacement cost policies common — less depreciation fighting",
      "Will approve matching and premium materials",
      "Holistic scope approach rather than line-item nickel-and-diming",
    ],
    weaknesses: [
      "Expects premium-quality documentation and workmanship",
      "May use preferred contractor networks — can create friction",
      "Smaller policyholder base — less common in standard residential",
    ],
  },

  // ── Encompass (Allstate subsidiary) ─────────────────────
  {
    name: "Encompass",
    aliases: ["Encompass Insurance", "Encompass Home", "Encompass (Allstate)"],
    aggressiveness: "moderate",
    supplementTactics: [
      "Operates somewhat independently from Allstate but uses similar endorsement structures",
      "Supplement process is less aggressive than parent company Allstate",
      "Uses independent adjusters more frequently than Allstate staff",
      "May apply Allstate-style counter-offers but with more willingness to negotiate",
    ],
    commonDenialLanguage: [
      "Repair is the appropriate remedy",
      "Matching not required under policy terms",
      "Item not related to covered loss",
      "Pricing exceeds our accepted guidelines",
    ],
    adjusterBehavior: [
      "Independent adjusters — quality varies by firm",
      "Less rigid than Allstate staff adjusters on scope disputes",
      "May accept contractor measurements more readily than parent Allstate",
      "Generally follows Xactimate pricing without heavy modification",
    ],
    depreciationApproach: "Moderate — similar endorsement structure to Allstate but applied less aggressively. Age-based schedule but with higher thresholds.",
    cosmeticDamageStance: "Has cosmetic exclusion endorsements similar to Allstate but applies them with more moderation. More open to functional-cosmetic arguments.",
    strengths: [
      "More negotiable than parent company Allstate",
      "Uses independent adjusters who may be more flexible",
      "Reasonable on code upgrades with documentation",
      "Faster supplement response than Allstate in many regions",
    ],
    weaknesses: [
      "Shares some Allstate endorsement structures including matching limitations",
      "Independent adjuster quality varies significantly",
      "Less established supplement process than larger carriers",
      "May defer to Allstate guidelines on complex claims",
    ],
  },
];

/* ─────── Carrier-Code Objection Map ─────── */

export const CARRIER_CODE_OBJECTIONS: CarrierCodeObjection[] = [
  // ── Ice & Water Shield (R905.1.2) ──────────────────────
  {
    carrierName: "State Farm",
    ircSection: "R905.1.2",
    objectionRate: "high",
    typicalObjection: "Ice barrier was included in the original scope — no additional coverage needed",
    effectiveRebuttal: "IRC R905.1.2 requires ice barrier in the entire area from the eave to 24 inches inside the exterior wall. The adjuster's estimate only includes ice barrier at the eaves, not extending to the required 24-inch interior line. This is a code requirement, not an upgrade.",
  },
  {
    carrierName: "Nationwide",
    ircSection: "R905.1.2",
    objectionRate: "high",
    typicalObjection: "Like-kind replacement does not require ice barrier upgrade",
    effectiveRebuttal: "When a full roof replacement is performed, the jurisdiction requires compliance with current IRC R905.1.2. This is not an upgrade — it is mandatory code compliance. The existing roof was installed under older standards that did not require ice barrier to the 24-inch line.",
  },
  {
    carrierName: "Allstate",
    ircSection: "R905.1.2",
    objectionRate: "high",
    typicalObjection: "Ice barrier only required at eaves — not full valley and sidewall coverage",
    effectiveRebuttal: "IRC R905.1.2 requires ice barrier at eaves, valleys, and around penetrations in climate zones 4A and above. This property is in climate zone 4A. The code requires full ice barrier at all vulnerable areas, not just eaves.",
  },
  {
    carrierName: "Erie",
    ircSection: "R905.1.2",
    objectionRate: "medium",
    typicalObjection: "Quantity of ice barrier exceeds what the code requires",
    effectiveRebuttal: "The ice barrier quantity matches the measured linear footage at eaves, valleys, and sidewalls per IRC R905.1.2 requirements. The measurement report documents the exact footage.",
  },
  {
    carrierName: "Farmers",
    ircSection: "R905.1.2",
    objectionRate: "high",
    typicalObjection: "Ice barrier is an upgrade, not a repair",
    effectiveRebuttal: "In jurisdictions that have adopted the 2018 IRC (including MD and PA), ice barrier is a code requirement for any full roof replacement. This is mandatory compliance, not an optional upgrade. The building permit requires it.",
  },

  // ── Starter Strip (R905.2.8.2) ─────────────────────────
  {
    carrierName: "State Farm",
    ircSection: "R905.2.8.2",
    objectionRate: "high",
    typicalObjection: "Starter strip is included in shingle installation — not a separate line item",
    effectiveRebuttal: "Starter strip is a distinct material (pre-cut adhesive strip) separate from field shingles. IRC R905.2.8.2 requires it at all eaves and rakes. It is a separate Xactimate line item because it is separate material with separate labor.",
  },
  {
    carrierName: "Nationwide",
    ircSection: "R905.2.8.2",
    objectionRate: "medium",
    typicalObjection: "Starter strip footage exceeds the eave measurement",
    effectiveRebuttal: "IRC R905.2.8.2 requires starter strip at eaves AND rakes. The total footage includes both eave and rake measurements from the measurement report.",
  },
  {
    carrierName: "Allstate",
    ircSection: "R905.2.8.2",
    objectionRate: "high",
    typicalObjection: "Starter included in the per-square shingle price",
    effectiveRebuttal: "Starter strip is not included in Xactimate per-square shingle pricing. It is a separate code-required material (IRC R905.2.8.2) at eaves and rakes, with its own Xactimate code and pricing.",
  },

  // ── Drip Edge (R905.2.8.5) ─────────────────────────────
  {
    carrierName: "State Farm",
    ircSection: "R905.2.8.5",
    objectionRate: "high",
    typicalObjection: "Existing drip edge can be reused",
    effectiveRebuttal: "During a full tear-off and replacement, existing drip edge is removed and cannot be properly reinstalled. IRC R905.2.8.5 requires drip edge at eaves and rakes. New drip edge must be installed under the ice barrier and over the underlayment per manufacturer specifications.",
  },
  {
    carrierName: "Farmers",
    ircSection: "R905.2.8.5",
    objectionRate: "high",
    typicalObjection: "Drip edge is not required by code in this area",
    effectiveRebuttal: "IRC R905.2.8.5 requires drip edge at all eave and rake edges. MD and PA have adopted the 2018 IRC which includes this requirement. The building permit requires compliance with adopted codes.",
  },
  {
    carrierName: "Nationwide",
    ircSection: "R905.2.8.5",
    objectionRate: "medium",
    typicalObjection: "Only replace drip edge on damaged sections",
    effectiveRebuttal: "During a full roof replacement, all drip edge is removed during tear-off. IRC R905.2.8.5 requires drip edge at all eaves and rakes — partial installation creates code violations and warranty issues.",
  },

  // ── Ridge Ventilation (R806.1) ─────────────────────────
  {
    carrierName: "State Farm",
    ircSection: "R806.1",
    objectionRate: "medium",
    typicalObjection: "Existing ventilation is adequate — no upgrade required",
    effectiveRebuttal: "IRC R806.1 requires 1 sq ft of net free ventilation per 150 sq ft of attic space. When the existing ridge vent is removed during tear-off, a new ridge vent must be installed to meet code. This is replacement, not an upgrade.",
  },
  {
    carrierName: "Allstate",
    ircSection: "R806.1",
    objectionRate: "medium",
    typicalObjection: "Ridge vent replacement is included in the roofing scope",
    effectiveRebuttal: "Ridge vent is a separate material and labor item, not included in per-square shingle pricing. IRC R806.1 requires proper ventilation — the ridge vent removed during tear-off must be replaced as a separate line item.",
  },

  // ── Flashing (R905.2.8.3) ─────────────────────────────
  {
    carrierName: "State Farm",
    ircSection: "R905.2.8.3",
    objectionRate: "high",
    typicalObjection: "Existing flashing can be reused — no replacement necessary",
    effectiveRebuttal: "IRC R905.2.8.3 requires flashing at wall-roof intersections, chimneys, and penetrations. During full replacement, step flashing is embedded under shingles and cannot be reused. All manufacturer installation instructions require new flashing for warranty compliance.",
  },
  {
    carrierName: "Nationwide",
    ircSection: "R905.2.8.3",
    objectionRate: "high",
    typicalObjection: "Only replace flashing that shows visible damage",
    effectiveRebuttal: "Step flashing is removed during tear-off because it is woven between shingle courses. IRC R905.2.8.3 requires proper flashing at all intersections. Reinstalling damaged or bent flashing creates leak points and voids the manufacturer warranty.",
  },
  {
    carrierName: "Farmers",
    ircSection: "R905.2.8.3",
    objectionRate: "medium",
    typicalObjection: "Flashing footage is excessive for this roof",
    effectiveRebuttal: "The flashing footage matches the measured linear footage at wall-roof intersections, chimneys, and penetrations from the measurement report. IRC R905.2.8.3 requires flashing at every intersection — the quantity is driven by roof geometry.",
  },

  // ── Underlayment (R905.1.1) ────────────────────────────
  {
    carrierName: "State Farm",
    ircSection: "R905.1.1",
    objectionRate: "medium",
    typicalObjection: "Synthetic underlayment is an upgrade — felt paper is adequate",
    effectiveRebuttal: "All major shingle manufacturers (GAF, CertainTeed, Owens Corning) require synthetic underlayment for warranty compliance. Using felt paper voids the manufacturer warranty. IRC R905.1.1 requires underlayment — the manufacturer specifies the type.",
  },
  {
    carrierName: "Progressive",
    ircSection: "R905.1.1",
    objectionRate: "high",
    typicalObjection: "Underlayment included in shingle installation cost",
    effectiveRebuttal: "Underlayment is a separate material required by IRC R905.1.1, not included in per-square shingle pricing in Xactimate. It is a distinct code-required material with its own labor for installation.",
  },

  // ── Pipe Boot Replacement (R905.2.8.3) ─────────────────
  {
    carrierName: "State Farm",
    ircSection: "R905.2.8.3",
    objectionRate: "medium",
    typicalObjection: "Pipe boots are not storm damaged — no replacement needed",
    effectiveRebuttal: "During full roof replacement, pipe boots are removed with the old roofing. New pipe boots must be installed with proper flashing per IRC R905.2.8.3 and manufacturer specifications. The old neoprene boots cannot be resealed to the new roofing surface.",
  },
  {
    carrierName: "Allstate",
    ircSection: "R905.2.8.3",
    objectionRate: "medium",
    typicalObjection: "Only damaged pipe boots need replacement",
    effectiveRebuttal: "All pipe boot flanges are embedded under shingles and are disturbed during tear-off. IRC R905.2.8.3 requires proper flashing at all penetrations. Reinstalling old pipe boots on a new roof creates leak risks and voids manufacturer warranty.",
  },

  // ── Permit (general code compliance) ───────────────────
  {
    carrierName: "State Farm",
    ircSection: "general",
    objectionRate: "medium",
    typicalObjection: "Permit cost is the contractor's overhead — not a covered expense",
    effectiveRebuttal: "Building permits are required by the local jurisdiction for roof replacement. The permit is a direct cost of the repair, not contractor overhead. It is a legitimate Xactimate line item (PRMT) required to perform the insured work.",
  },
  {
    carrierName: "Allstate",
    ircSection: "general",
    objectionRate: "medium",
    typicalObjection: "Permit not required in this jurisdiction",
    effectiveRebuttal: "The property is located in a jurisdiction that requires permits for roof replacement. The permit requirement is verified through the county AHJ (Authority Having Jurisdiction). PRMT is a legitimate covered expense.",
  },
  {
    carrierName: "Progressive",
    ircSection: "general",
    objectionRate: "high",
    typicalObjection: "We do not cover permit costs",
    effectiveRebuttal: "Permits are a required cost to legally perform the covered repair. They are a standard Xactimate line item and a direct cost of the insured loss, not contractor overhead. Most carriers cover permits — this is industry standard.",
  },

  // ── Dumpster / Haul-off ────────────────────────────────
  {
    carrierName: "Nationwide",
    ircSection: "general",
    objectionRate: "medium",
    typicalObjection: "Disposal included in tear-off line item",
    effectiveRebuttal: "Tear-off line items in Xactimate cover labor for removal from the roof. Dumpster rental and disposal hauling are separate costs not included in tear-off pricing. DUMR is the standard Xactimate code for this necessary expense.",
  },
  {
    carrierName: "Progressive",
    ircSection: "general",
    objectionRate: "high",
    typicalObjection: "Debris removal is contractor responsibility",
    effectiveRebuttal: "Debris removal via dumpster is a direct cost of the insured repair, not contractor overhead. Xactimate prices tear-off and disposal as separate line items because they are separate operations with separate costs.",
  },
];

/* ─────── Lookup Functions ─────── */

/**
 * Find a carrier profile by name (case-insensitive, supports aliases).
 */
export function getCarrierProfile(name: string): CarrierProfile | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();

  return CARRIER_PROFILES.find(
    (p) =>
      p.name.toLowerCase() === normalized ||
      p.aliases.some((a) => a.toLowerCase() === normalized)
  );
}

/**
 * Get all code objections for a specific carrier.
 */
export function getCarrierCodeObjections(
  carrierName: string
): CarrierCodeObjection[] {
  if (!carrierName) return [];
  const normalized = carrierName.toLowerCase().trim();

  // First try exact carrier name match
  const direct = CARRIER_CODE_OBJECTIONS.filter(
    (o) => o.carrierName.toLowerCase() === normalized
  );
  if (direct.length > 0) return direct;

  // Try alias match via profile
  const profile = getCarrierProfile(carrierName);
  if (profile) {
    return CARRIER_CODE_OBJECTIONS.filter(
      (o) => o.carrierName.toLowerCase() === profile.name.toLowerCase()
    );
  }

  return [];
}

/**
 * Build a formatted string of carrier intelligence for injection into
 * the Claude analysis prompt.
 */
export function buildCarrierContextForPrompt(carrierName: string): string {
  const profile = getCarrierProfile(carrierName);
  if (!profile) return "";

  const lines: string[] = [
    `## CARRIER INTELLIGENCE: ${profile.name.toUpperCase()}`,
    "",
    `Aggressiveness: ${profile.aggressiveness.toUpperCase()}`,
    "",
    "### Supplement Tactics (how this carrier handles supplements)",
  ];

  for (const tactic of profile.supplementTactics) {
    lines.push(`- ${tactic}`);
  }

  lines.push("");
  lines.push("### Common Denial Language (exact phrases this carrier uses)");
  for (const lang of profile.commonDenialLanguage) {
    lines.push(`- "${lang}"`);
  }

  lines.push("");
  lines.push("### Adjuster Behavior Patterns");
  for (const behavior of profile.adjusterBehavior) {
    lines.push(`- ${behavior}`);
  }

  lines.push("");
  lines.push(`### Depreciation: ${profile.depreciationApproach}`);
  lines.push(`### Cosmetic Damage: ${profile.cosmeticDamageStance}`);

  lines.push("");
  lines.push("### Known Weaknesses (items this carrier consistently underpays)");
  for (const weakness of profile.weaknesses) {
    lines.push(`- ${weakness}`);
  }

  // Add carrier-specific code objections
  const objections = getCarrierCodeObjections(carrierName);
  if (objections.length > 0) {
    lines.push("");
    lines.push("### Code-Specific Objection Patterns");
    lines.push("For each code below, this carrier has a KNOWN pattern of pushing back. Preemptively strengthen justifications for these items.");
    lines.push("");

    for (const obj of objections) {
      lines.push(`- **IRC ${obj.ircSection}** [${obj.objectionRate.toUpperCase()} objection rate]`);
      lines.push(`  Typical objection: "${obj.typicalObjection}"`);
      lines.push(`  Effective rebuttal: ${obj.effectiveRebuttal}`);
      lines.push("");
    }
  }

  lines.push("");
  lines.push(
    "IMPORTANT: Use this carrier intelligence to STRENGTHEN justifications for items this carrier commonly disputes. " +
    "Preemptively address their known objections in your justification text. " +
    "Do NOT soften or weaken justifications based on carrier behavior — strengthen them."
  );

  return lines.join("\n");
}
```

**Step 2: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin" && npx turbo build --filter=@4margin/policy-engine 2>&1 | tail -10`

If policy-engine doesn't have a build script (it uses direct TS imports), run tsc from the contractor app instead:
`cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/policy-engine/src/carrier-profiles.ts
git commit -m "feat: add carrier profiles and code objection mappings

13 carrier behavioral profiles with supplement tactics, denial
language, adjuster behavior patterns, and per-carrier building
code objection mappings (~30 code-specific entries).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Endorsement Forms for 5 New Carriers

**Files:**
- Modify: `packages/policy-engine/src/knowledge.ts` (append to CARRIER_ENDORSEMENT_FORMS array, after line 1058)

**Step 1: Add endorsement forms**

Append these entries to the `CARRIER_ENDORSEMENT_FORMS` array (before the closing `];`):

```typescript
  // ── Progressive ─────────────────────────────────────────────────
  {
    carrier: "Progressive",
    formNumber: "PH-4401",
    name: "Cosmetic Damage Exclusion — Roof",
    effect:
      "Excludes coverage for cosmetic damage to roof surfacing. Only damage affecting the functional integrity of the roof is covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Progressive",
    formNumber: "PH-4410",
    name: "Roof Surface Payment Schedule",
    effect:
      "Age-based payment schedule for roof surfaces. Applies ACV depreciation to roof claims based on roof age and material type.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Progressive",
    formNumber: "PH-4405",
    name: "Wind/Hail Percentage Deductible",
    effect:
      "Separate percentage-based deductible for wind and hail damage. Typically 1-5% of Coverage A.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },

  // ── Amica ───────────────────────────────────────────────────────
  {
    carrier: "Amica",
    formNumber: "AM-HO-120",
    name: "Roof Surface Material Limitation",
    effect:
      "May limit roof surface coverage based on age. Applied less aggressively than most carriers — Amica tends toward RCV settlement.",
    severity: "warning",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Amica",
    formNumber: "AM-HO-105",
    name: "Wind/Hail Deductible",
    effect:
      "Separate deductible for wind and hail perils. Typically a flat dollar amount rather than percentage-based.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "Amica",
    formNumber: "AM-HO-130",
    name: "Ordinance or Law Coverage",
    effect:
      "Provides coverage for code-required upgrades during covered repairs. Standard on most Amica policies.",
    severity: "info",
    affectsFields: ["coverages"],
  },

  // ── Auto-Owners ─────────────────────────────────────────────────
  {
    carrier: "Auto-Owners",
    formNumber: "AO-4501",
    name: "Cosmetic Damage Limitation",
    effect:
      "Limits coverage for cosmetic damage to roof and exterior surfaces. Functional damage remains covered.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Auto-Owners",
    formNumber: "AO-4510",
    name: "Roof Surface Depreciation Schedule",
    effect:
      "Applies age-based depreciation to roof surfaces. Moderate thresholds compared to national carriers.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Auto-Owners",
    formNumber: "AO-4505",
    name: "Wind/Hail Deductible",
    effect:
      "Separate deductible for wind and hail losses. May be flat dollar or percentage-based depending on policy.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },

  // ── Chubb ──────────────────────────────────────────────────────
  {
    carrier: "Chubb",
    formNumber: "CB-MH-200",
    name: "Masterpiece Homeowners — Guaranteed Replacement Cost",
    effect:
      "Provides guaranteed replacement cost coverage without depreciation caps. One of the most favorable roof coverage provisions in the market.",
    severity: "info",
    affectsFields: ["coverages"],
  },
  {
    carrier: "Chubb",
    formNumber: "CB-MH-210",
    name: "Extended Replacement Cost",
    effect:
      "Extends replacement cost coverage beyond dwelling limit. Typically 120-150% of Coverage A.",
    severity: "info",
    affectsFields: ["coverages"],
  },
  {
    carrier: "Chubb",
    formNumber: "CB-MH-205",
    name: "Ordinance or Law — Enhanced",
    effect:
      "Enhanced code upgrade coverage. Covers full cost of code-required upgrades without sublimits typical of other carriers.",
    severity: "info",
    affectsFields: ["coverages"],
  },

  // ── Encompass (Allstate subsidiary) ────────────────────────────
  {
    carrier: "Encompass",
    formNumber: "EN-4201",
    name: "Cosmetic Damage Exclusion — Roof",
    effect:
      "Excludes cosmetic roof damage. Similar structure to parent company Allstate's ACR5 but applied with moderate strictness.",
    severity: "critical",
    affectsFields: ["exclusions"],
  },
  {
    carrier: "Encompass",
    formNumber: "EN-4210",
    name: "Roof Surface Payment Schedule",
    effect:
      "Age-based depreciation for roof surfaces. Similar to Allstate ARS1 but with slightly higher thresholds.",
    severity: "critical",
    affectsFields: ["depreciation"],
  },
  {
    carrier: "Encompass",
    formNumber: "EN-4205",
    name: "Wind/Hail Deductible",
    effect:
      "Separate wind/hail deductible. May be percentage or flat dollar amount.",
    severity: "warning",
    affectsFields: ["deductibles"],
  },
  {
    carrier: "Encompass",
    formNumber: "EN-4215",
    name: "Limited Matching Endorsement",
    effect:
      "Limits carrier obligation to match undamaged areas. Less restrictive than Allstate's AMA1 anti-matching endorsement.",
    severity: "warning",
    affectsFields: ["exclusions"],
  },
```

**Step 2: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/policy-engine/src/knowledge.ts
git commit -m "feat: add endorsement forms for 5 new carriers

Progressive (3), Amica (3), Auto-Owners (3), Chubb (3),
Encompass (4) — 16 new endorsement forms bringing total to 57.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Re-export Through the Chain

**Files:**
- Modify: `packages/policy-engine/src/index.ts`
- Modify: `apps/contractor/src/data/policy-knowledge.ts`

**Step 1: Update policy-engine index.ts**

Add these exports to `packages/policy-engine/src/index.ts`:

```typescript
export {
  CARRIER_PROFILES,
  CARRIER_CODE_OBJECTIONS,
  getCarrierProfile,
  getCarrierCodeObjections,
  buildCarrierContextForPrompt,
} from "./carrier-profiles";

export type {
  CarrierProfile,
  CarrierCodeObjection,
} from "./carrier-profiles";
```

**Step 2: Update data/policy-knowledge.ts**

Add to the re-export list in `apps/contractor/src/data/policy-knowledge.ts`:

```typescript
export {
  // ... existing exports ...
  CARRIER_PROFILES,
  CARRIER_CODE_OBJECTIONS,
  getCarrierProfile,
  getCarrierCodeObjections,
  buildCarrierContextForPrompt,
  type CarrierProfile,
  type CarrierCodeObjection,
} from "@4margin/policy-engine";
```

**Step 3: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add packages/policy-engine/src/index.ts apps/contractor/src/data/policy-knowledge.ts
git commit -m "feat: re-export carrier profiles through package chain

policy-engine/index.ts → data/policy-knowledge.ts for
contractor app consumption.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Inject Carrier Context into AI Analysis Prompt

**Files:**
- Modify: `apps/contractor/src/lib/ai/analyze.ts` (~lines 11-16, 96, 161-172, 421-431)

**Step 1: Add import**

Add to the imports at the top of `analyze.ts`:

```typescript
import { buildCarrierContextForPrompt } from "@/data/policy-knowledge";
```

**Step 2: Add carrierName to AnalysisInput**

The `AnalysisInput` interface already has no `carrierName` field. Add it:

```typescript
  carrierName?: string | null; // Insurance carrier name (for carrier-specific intelligence)
```

**Step 3: Build carrier context alongside other contexts**

After the `manufacturerContext` build (~line 160), add:

```typescript
  // Build carrier-specific intelligence context
  const carrierContext = input.carrierName
    ? buildCarrierContextForPrompt(input.carrierName)
    : "";
```

**Step 4: Pass carrierContext to buildAnalysisPrompt**

Add `carrierContext` to both the call site and the function signature of `buildAnalysisPrompt`:

In the call (~line 162):
```typescript
  const prompt = buildAnalysisPrompt({
    codesContext,
    measurementsContext,
    claimDescription: input.claimDescription,
    adjusterScopeNotes: input.adjusterScopeNotes,
    itemsBelievedMissing: input.itemsBelievedMissing,
    damageTypes: input.damageTypes,
    policyContext: input.policyContext || null,
    buildingCodeContext,
    manufacturerContext,
    carrierContext,  // NEW
  });
```

In the function signature (~line 421):
```typescript
function buildAnalysisPrompt(ctx: {
  codesContext: string;
  measurementsContext: string;
  claimDescription: string;
  adjusterScopeNotes: string;
  itemsBelievedMissing: string;
  damageTypes: string[];
  policyContext: string | null;
  buildingCodeContext: string;
  manufacturerContext: string;
  carrierContext: string;  // NEW
}): string {
```

**Step 5: Inject carrier context into the prompt**

Inside `buildAnalysisPrompt`, after the manufacturer context injection (search for `manufacturerContext` in the template string), add:

```typescript
${ctx.carrierContext ? `\n${ctx.carrierContext}\n` : ""}
```

**Step 6: Pass carrierName from pipeline**

In `apps/contractor/src/lib/ai/pipeline.ts`, find where `detectMissingItems` is called and ensure `carrierName` is passed. Search for the call site and add the field if it's available from the claim data.

**Step 7: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -30`

**Step 8: Commit**

```bash
git add apps/contractor/src/lib/ai/analyze.ts apps/contractor/src/lib/ai/pipeline.ts
git commit -m "feat: inject carrier intelligence into AI analysis prompt

Carrier profile (tactics, denial language, behavior patterns)
and code-specific objection mappings injected alongside building
codes and manufacturer requirements.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Inject Carrier Context into Advocacy Prompt

**Files:**
- Modify: `apps/contractor/src/lib/ai/advocacy-prompt.ts` (~lines 31-43, 88-136)

**Step 1: Add import**

Add to imports:

```typescript
import { getCarrierProfile, getCarrierCodeObjections } from "@/data/policy-knowledge";
```

**Step 2: Add carrier profile to both prompts**

In `buildAdvocacyPrompt()`, after the `highObjectionCodes` lookup (~line 101), add:

```typescript
  const carrierProfile = getCarrierProfile(ctx.carrierName);
  const carrierObjections = getCarrierCodeObjections(ctx.carrierName);
```

**Step 3: Inject into both prompt builders**

In both `buildPreInspectionPrompt` and `buildPostDenialPrompt`, add a parameter for the profile and inject it. After the carrier endorsement forms section, add:

```typescript
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
```

Pass `carrierProfile` and `carrierObjections` through the function parameters.

**Step 4: Verify build**

Run: `cd "C:/Users/New User/OneDrive/Desktop/4Margin/apps/contractor" && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 5: Commit**

```bash
git add apps/contractor/src/lib/ai/advocacy-prompt.ts
git commit -m "feat: inject carrier profile into advocacy scripts

Carrier behavior patterns, denial language, and code objection
patterns now inform pre-inspection and post-denial advocacy
script generation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Build + Push

**Step 1: Full build**

Run: `npx turbo build --filter=@4margin/contractor`

**Step 2: Push**

```bash
git push
```

---

## Verification

1. **Build passes:** `npx turbo build --filter=@4margin/contractor` succeeds
2. **Profile lookup:** `getCarrierProfile("State Farm")` returns profile with `aggressiveness: "aggressive"`
3. **Alias lookup:** `getCarrierProfile("SF")` returns State Farm profile
4. **Code objections:** `getCarrierCodeObjections("State Farm")` returns entries for R905.1.2, R905.2.8.2, R905.2.8.5, etc.
5. **Prompt builder:** `buildCarrierContextForPrompt("State Farm")` returns formatted string with all sections
6. **Unknown carrier:** `getCarrierProfile("Unknown Carrier")` returns `undefined` (graceful fallback)
7. **Endorsement count:** 57 total endorsement forms (41 existing + 16 new)
