// ── Building Code Verification Database — MD & PA ──────────────────────────
//
// Jurisdiction-verified building codes for roofing and exterior work.
// Mapped to Xactimate codes for direct injection into supplement analysis.
//
// Sources:
//   Maryland: 2018 IRC adopted via COMAR 09.12.01 (MD Building Performance Standards)
//   Pennsylvania: 2018 IRC w/ PA UCC amendments (Act 45 of 1999, 34 Pa. Code Ch. 403)
//
// PHASE 1: MD + PA (target markets)
// ──────────────────────────────────────────────────────────────────────────────

export interface BuildingCode {
  id: string;
  /** IRC section number (e.g., "R905.2.8.2") */
  section: string;
  /** Short title */
  title: string;
  /** What the code requires — plain English */
  requirement: string;
  /** Pre-written justification text for supplements */
  justificationText: string;
  /** Category of work */
  category: "roofing" | "flashing" | "ventilation" | "gutters" | "insulation" | "general";
  /** Xactimate codes this code supports */
  xactimateCodes: string[];
  /** Jurisdictions where this code applies */
  jurisdictions: JurisdictionCode[];
  /** How often carriers object to this item */
  carrierObjectionRate: "high" | "medium" | "low";
  /** Typical carrier objection */
  typicalObjection: string;
  /** Pre-written rebuttal */
  rebuttal: string;
}

export interface JurisdictionCode {
  /** State abbreviation */
  state: "MD" | "PA";
  /** IRC edition adopted */
  ircEdition: string;
  /** Whether the state has a local amendment that differs from base IRC */
  hasAmendment: boolean;
  /** Local amendment details (null if base IRC applies as-is) */
  amendmentNote: string | null;
  /** Source document reference */
  sourceRef: string;
}

// ── Maryland Jurisdiction Info ─────────────────────────────────────────────

export const MD_JURISDICTION = {
  state: "MD" as const,
  ircEdition: "2018 IRC",
  adoptionRef: "COMAR 09.12.01 — Maryland Building Performance Standards",
  notes: [
    "Maryland adopted the 2018 IRC with state-specific amendments",
    "Local jurisdictions (counties) may impose additional requirements",
    "Coastal areas (Ocean City, Eastern Shore) have enhanced wind zone requirements",
    "Maryland requires permits for roof replacement in most jurisdictions",
  ],
};

// ── Pennsylvania Jurisdiction Info ─────────────────────────────────────────

export const PA_JURISDICTION = {
  state: "PA" as const,
  ircEdition: "2018 IRC",
  adoptionRef: "34 Pa. Code Ch. 403 — Uniform Construction Code (Act 45 of 1999)",
  notes: [
    "Pennsylvania adopted the 2018 IRC via the Uniform Construction Code (UCC)",
    "PA UCC applies statewide — local jurisdictions cannot weaken state code",
    "Entire state is considered an ice barrier zone (ASHRAE Climate Zones 4A-6A)",
    "PA requires building permits for roof replacement (UCC §403.42)",
    "Third-party inspection agencies may be used for code compliance",
  ],
};

// ── Building Codes Database ───────────────────────────────────────────────

export const BUILDING_CODES: BuildingCode[] = [
  // ─── ROOFING — Shingle Requirements ────────────────────────────────────

  {
    id: "IRC-R905.2.1",
    section: "R905.2.1",
    title: "Sheathing Requirements",
    requirement:
      "Asphalt shingles shall be fastened to solidly sheathed decks. Damaged or deteriorated sheathing must be replaced to provide a solid nailing surface.",
    justificationText:
      "IRC R905.2.1 requires asphalt shingles to be applied to solidly sheathed decks. Any damaged, deteriorated, or delaminated sheathing must be replaced to ensure proper fastener holding and a code-compliant installation.",
    category: "roofing",
    xactimateCodes: ["RFG PLY", "RFG PLYT"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.1",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.1",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection:
      "Sheathing replacement is not warranted unless visible damage is present.",
    rebuttal:
      "IRC R905.2.1 requires a solidly sheathed deck. Sheathing that is soft, spongy, delaminated, or shows moisture damage cannot provide adequate fastener holding power per manufacturer nailing requirements. Failure to replace compromised sheathing voids the manufacturer's warranty and creates a code violation.",
  },

  {
    id: "IRC-R905.2.2",
    section: "R905.2.2",
    title: "Slope Requirements",
    requirement:
      "Asphalt shingles shall only be used on roof slopes of 2:12 or greater. Slopes between 2:12 and 4:12 require double underlayment or self-adhering underlayment.",
    justificationText:
      "IRC R905.2.2 mandates minimum slope requirements for asphalt shingles. Roof areas with slopes between 2:12 and 4:12 require enhanced underlayment (double layer or self-adhering membrane) per code.",
    category: "roofing",
    xactimateCodes: ["RFG FELT", "RFG SYNUN", "RFG IWS"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.2",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.2",
      },
    ],
    carrierObjectionRate: "low",
    typicalObjection: "Standard underlayment is sufficient.",
    rebuttal:
      "IRC R905.2.2 explicitly requires double underlayment or self-adhering membrane on slopes between 2:12 and 4:12. This is a code requirement, not an upgrade. Using standard single-layer underlayment on low slopes is a code violation.",
  },

  {
    id: "IRC-R905.2.3",
    section: "R905.2.3",
    title: "Underlayment Requirements",
    requirement:
      "Underlayment shall comply with ASTM D226 (asphalt-saturated felt) or ASTM D4869 (asphalt-coated felt) or equivalent synthetic underlayment meeting ASTM D226 Type II equivalency.",
    justificationText:
      "IRC R905.2.3 requires code-compliant underlayment beneath all asphalt shingles. Underlayment is a required component of the roof assembly, not an optional accessory.",
    category: "roofing",
    xactimateCodes: ["RFG FELT", "RFG SYNUN"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.3",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.3",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Underlayment is included in the shingle installation cost.",
    rebuttal:
      "Underlayment is a separate material and labor item per IRC R905.2.3. Xactimate prices shingles and underlayment separately because they are distinct components. Shingle pricing covers shingle installation only — underlayment material and labor are a separate line item.",
  },

  {
    id: "IRC-R905.2.5",
    section: "R905.2.5",
    title: "Fastener Requirements",
    requirement:
      "Asphalt shingles shall be fastened with minimum 4 nails per shingle (6 nails in high-wind areas). Nails shall be corrosion-resistant with minimum 3/8\" head diameter and sufficient length to penetrate 3/4\" into sheathing.",
    justificationText:
      "IRC R905.2.5 establishes minimum fastening requirements for asphalt shingles. In high-wind zones (110+ mph design wind speed), 6 nails per shingle are required, increasing material consumption by approximately 50%.",
    category: "roofing",
    xactimateCodes: ["RFG STRSA", "RFG STRS"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "MD coastal counties (Worcester, Wicomico, Somerset, Dorchester) are in 110+ mph wind zones requiring 6-nail pattern per ASCE 7.",
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.5; ASCE 7-16 Figure 26.5-1B",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.5",
      },
    ],
    carrierObjectionRate: "low",
    typicalObjection: "4 nails per shingle is standard.",
    rebuttal:
      "While 4 nails is the base requirement, manufacturer warranty requirements (GAF, CertainTeed, Owens Corning) typically specify 6-nail pattern for enhanced wind warranty coverage. Additionally, high-wind zones per ASCE 7 require 6 nails per IRC R905.2.5.",
  },

  // ─── ROOFING — Starter Strip ───────────────────────────────────────────

  {
    id: "IRC-R905.2.8.2",
    section: "R905.2.8.2",
    title: "Starter Strip Shingles",
    requirement:
      "A starter strip shall be installed along the eaves and rakes per manufacturer requirements. The starter strip provides the initial seal and wind resistance for the first course of shingles.",
    justificationText:
      "IRC R905.2.8.2 requires starter strip shingles along eaves and rakes. This is a mandatory component of any code-compliant shingle installation — not an optional upgrade. All major manufacturers (GAF, CertainTeed, Owens Corning) require starter strip for warranty coverage.",
    category: "roofing",
    xactimateCodes: ["RFG STRP"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.8.2",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.8.2",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection:
      "Starter strip is included in the shingle square price / not a separate line item.",
    rebuttal:
      "Starter strip is a separate material (distinct SKU from field shingles) requiring separate installation along eaves and rakes. IRC R905.2.8.2 mandates its use, and all major manufacturers require it for warranty eligibility. Xactimate correctly prices it as a separate line item because it is a separate material and labor component.",
  },

  // ─── ROOFING — Hip & Ridge Cap ─────────────────────────────────────────

  {
    id: "IRC-R905.2.8.3",
    section: "R905.2.8.3",
    title: "Hip and Ridge Cap Shingles",
    requirement:
      "Hips and ridges shall be covered with hip and ridge cap shingles or approved equivalent. Ridge and hip cap must overlap per manufacturer specifications.",
    justificationText:
      "IRC R905.2.8.3 requires dedicated hip and ridge cap shingles at all ridge and hip locations. This is a mandatory code and manufacturer requirement — field shingles cannot substitute for proper ridge/hip cap.",
    category: "roofing",
    xactimateCodes: ["RFG RDGC", "RFG HIPC"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.8.3",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.8.3",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Ridge cap is included in the shingle square.",
    rebuttal:
      "Ridge and hip cap is a separate manufactured product (different from field shingles) with separate material costs, installed using a different technique. IRC R905.2.8.3 and manufacturer instructions both require it. Xactimate correctly lists ridge cap (RFG RDGC) and hip cap (RFG HIPC) as separate line items.",
  },

  // ─── ROOFING — Drip Edge ───────────────────────────────────────────────

  {
    id: "IRC-R905.2.8.5",
    section: "R905.2.8.5",
    title: "Drip Edge Requirements",
    requirement:
      "A drip edge shall be provided at eaves and gable rake edges of shingle roofs. Drip edge shall be installed beneath the underlayment at eaves and over the underlayment at rakes.",
    justificationText:
      "IRC R905.2.8.5 mandates drip edge at all eave and rake edges. This is a required building code component — not an optional accessory. Drip edge must be installed beneath underlayment at eaves and over underlayment at rakes per the code-specified installation sequence.",
    category: "roofing",
    xactimateCodes: ["RFG DRIP", "RFG DRIPA"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.8.5",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.8.5",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection:
      "Drip edge was not on the original roof / is a code upgrade.",
    rebuttal:
      "IRC R905.2.8.5 requires drip edge on all asphalt shingle roofs — this is not optional. When a roof is replaced, the replacement must comply with current building code per IRC R105.1. Even if the original roof lacked drip edge, the replacement must include it. This is a code-required item, not an upgrade.",
  },

  // ─── ROOFING — Ice Barrier ─────────────────────────────────────────────

  {
    id: "IRC-R905.2.7.1",
    section: "R905.2.7.1",
    title: "Ice Barrier Requirements",
    requirement:
      "In areas where the average daily temperature in January is 25°F or less, or where there is a possibility of ice forming along the eaves causing a backup of water, an ice barrier that consists of at least two layers of underlayment cemented together or a self-adhering polymer-modified bitumen sheet shall be used.",
    justificationText:
      "IRC R905.2.7.1 requires ice barrier (ice & water shield) at all eave edges in climate zones where ice damming occurs. Both Maryland and Pennsylvania fall within the applicable climate zones requiring this protection.",
    category: "roofing",
    xactimateCodes: ["RFG IWS"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "Western MD counties (Garrett, Allegany, Washington) are in Climate Zone 5A — ice barrier required at eaves, valleys, and around penetrations. Central and Eastern MD counties are Zone 4A — ice barrier required at eaves.",
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.7.1; IECC Figure R301.1",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "All of Pennsylvania is in Climate Zone 4A, 5A, or 6A — ice barrier is required statewide at eaves. Northern PA (Climate Zone 6A) has the strictest requirements: ice barrier required extending minimum 24 inches past the interior wall line.",
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.7.1; IECC Figure R301.1",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection:
      "Ice & water shield is a code upgrade / was not on the original roof.",
    rebuttal:
      "IRC R905.2.7.1 requires ice barrier in all areas subject to ice damming. Both MD and PA are in applicable climate zones. Per IRC R105.1, roof replacements must comply with current code. The ice barrier must extend from the eave edge to a point at least 24 inches inside the exterior wall line. This is a mandatory code requirement, not an upgrade.",
  },

  // ─── FLASHING ──────────────────────────────────────────────────────────

  {
    id: "IRC-R903.2.1",
    section: "R903.2.1",
    title: "Flashing at Wall Intersections",
    requirement:
      "Flashing shall be installed at wall and roof intersections, at gutters, wherever there is a change in roof slope or direction, and around roof openings. Flashing shall direct water to the surface of an adjacent roof covering or to the exterior of the building.",
    justificationText:
      "IRC R903.2.1 requires proper flashing at all wall-roof intersections. Step flashing at sidewalls and counter-flashing at headwalls are mandatory building code requirements — not optional accessories.",
    category: "flashing",
    xactimateCodes: ["RFG STPFL", "RFG CNFL", "RFG BSFL"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R903.2.1",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R903.2.1",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Flashing is reusable and does not need replacement.",
    rebuttal:
      "IRC R903.2.1 requires proper flashing at all wall-roof intersections. When shingles are removed, step flashing is disturbed and the seal is broken. Manufacturer installation instructions (GAF, CertainTeed) require new step flashing with each roof installation to maintain warranty coverage. Reusing old flashing compromises the weather barrier and creates a code violation.",
  },

  {
    id: "IRC-R903.2.2",
    section: "R903.2.2",
    title: "Flashing at Roof Penetrations",
    requirement:
      "Flashings shall be installed at roof openings, penetrations, and edges. Pipe boots, chimney flashing, and skylight flashing shall create a watertight seal around all roof penetrations.",
    justificationText:
      "IRC R903.2.2 requires proper flashing at all roof penetrations including pipe vents, chimneys, skylights, and mechanical curbs. Existing pipe boots and flashings that are disturbed during re-roofing must be replaced to ensure a code-compliant watertight seal.",
    category: "flashing",
    xactimateCodes: ["RFG PIPE", "RFG CHFL", "RFG SKFL"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R903.2.2",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R903.2.2",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Pipe boots can be reused if not damaged.",
    rebuttal:
      "Pipe boots use a rubber gasket that seals around the pipe. Once the surrounding shingles are removed, the boot's seal is compromised. Industry standard practice and manufacturer requirements call for new pipe boots during re-roofing. Per IRC R903.2.2, all penetration flashings must provide a watertight seal — reusing a disturbed boot risks water intrusion.",
  },

  // ─── VENTILATION ───────────────────────────────────────────────────────

  {
    id: "IRC-R806.1",
    section: "R806.1",
    title: "Ventilation Required",
    requirement:
      "Enclosed attics and enclosed rafter spaces formed where ceilings are applied directly to the underside of roof rafters shall have cross ventilation for each separate space by ventilating openings. The minimum net free ventilating area shall be 1/150 of the area of the vented space (1/300 if certain conditions are met).",
    justificationText:
      "IRC R806.1 requires a minimum ventilation ratio of 1:150 (or 1:300 with balanced intake/exhaust). When a roof is replaced, the ventilation system must be brought to current code compliance. Ridge vent along all ridges with matching soffit intake is the most effective method.",
    category: "ventilation",
    xactimateCodes: ["RFG RDGV", "RFG VENT"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R806.1",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R806.1",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection:
      "Ridge vent is an upgrade / existing ventilation is adequate.",
    rebuttal:
      "IRC R806.1 mandates minimum attic ventilation ratios. When the existing roof is removed, ventilation must be evaluated and brought to current code per IRC R105.1. If existing ventilation is below the 1:150 (or 1:300) threshold, additional ventilation is required by code. Ridge vent is the industry standard method to achieve balanced ventilation. This is a code compliance item, not an upgrade.",
  },

  // ─── GUTTERS / ROOF DRAINAGE ───────────────────────────────────────────

  {
    id: "IRC-R903.4",
    section: "R903.4",
    title: "Roof Drainage",
    requirement:
      "Unless roofs are sloped to drain over roof edges, roof drains shall be installed at each low point of the roof. Gutters and downspouts shall be sized to handle the flow from the contributing roof area.",
    justificationText:
      "IRC R903.4 addresses roof drainage requirements. Where existing gutters are damaged by the same event that damaged the roof, or where gutter removal is necessary for proper roof installation, gutter replacement or reinstallation is a code-related item.",
    category: "gutters",
    xactimateCodes: ["GTR ALM5", "GTR DSAL"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R903.4",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R903.4",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Gutters are not part of the roofing claim.",
    rebuttal:
      "Gutters are part of the roof drainage system per IRC R903.4. When gutters are damaged by the same weather event that caused roof damage, or when gutter removal is necessary for proper drip edge installation per IRC R905.2.8.5, gutter work is directly related to the roofing claim. Detach and reset of gutters is a standard re-roofing requirement.",
  },

  // ─── CODE COMPLIANCE ON REPLACEMENT ────────────────────────────────────

  {
    id: "IRC-R105.1",
    section: "R105.1",
    title: "Permits and Code Compliance for Replacement",
    requirement:
      "Any owner or authorized agent who intends to construct, enlarge, alter, repair, move, demolish, or change the occupancy of a building shall obtain a permit. Work shall comply with the code in effect at the time of permit application.",
    justificationText:
      "IRC R105.1 establishes that roof replacement requires a permit and must comply with current building code. This means all code-required components (drip edge, ice barrier, proper ventilation, etc.) must be included even if the original roof predated these requirements.",
    category: "general",
    xactimateCodes: [],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "Maryland requires building permits for roof replacement in most jurisdictions. Contact local authority having jurisdiction (AHJ) for specific requirements.",
        sourceRef: "COMAR 09.12.01; 2018 IRC R105.1",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "Pennsylvania UCC (34 Pa. Code §403.42) requires building permits for roof replacement statewide. Third-party agencies may perform plan review and inspection.",
        sourceRef: "34 Pa. Code §403.42; 2018 IRC R105.1",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection: "Code upgrade items are the homeowner's responsibility.",
    rebuttal:
      "Per IRC R105.1, when a roof is replaced, the replacement must comply with current building code. Code-required items are not 'upgrades' — they are mandatory components of the replacement scope. The original roof may not have included these items because the code was different then, but a replacement today must meet today's code. Carriers are responsible for bringing the covered replacement to code compliance.",
  },

  // ─── STEEP PITCH LABOR ─────────────────────────────────────────────────

  {
    id: "IRC-R905.2.2-STEEP",
    section: "R905.2.2",
    title: "Steep Slope Additional Requirements",
    requirement:
      "Roof slopes of 7:12 and greater require enhanced safety measures including fall protection systems per OSHA 1926.501(b)(13). Additional labor time and specialized equipment are necessary for safe code-compliant installation on steep slopes.",
    justificationText:
      "Roofs with slopes of 7:12 or greater require additional safety equipment and labor time per OSHA 1926.501(b)(13). Xactimate includes steep pitch charges as a standard line item because installation time, safety requirements, and difficulty increase substantially on steep slopes. This is an industry-standard labor adjustment, not a discretionary charge.",
    category: "roofing",
    xactimateCodes: ["RFG STPCH"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "2018 IRC R905.2.2; OSHA 1926.501(b)(13)",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "2018 IRC R905.2.2; OSHA 1926.501(b)(13)",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection: "Steep pitch charges are included in the shingle price.",
    rebuttal:
      "Steep pitch charges compensate for the documented increase in labor time and safety equipment required for slopes 7:12 and above per OSHA 1926.501(b)(13). Xactimate specifically includes steep pitch as a separate line item (RFG STPCH) because labor productivity decreases approximately 20-40% on steep slopes. This is an industry-standard labor adjustment recognized by all major estimating platforms.",
  },

  // ─── VALLEY TREATMENT ──────────────────────────────────────────────────

  {
    id: "IRC-R905.2.8.4",
    section: "R905.2.8.4",
    title: "Valley Treatment Requirements",
    requirement:
      "Valley linings shall be installed in accordance with the manufacturer's installation instructions. Open valleys require a minimum 36-inch wide sheet of corrosion-resistant metal or self-adhering membrane. Closed valleys require ice & water shield underlayment.",
    justificationText:
      "IRC R905.2.8.4 requires proper valley treatment. Valleys concentrate water flow and are the highest-risk area for leaks. Ice & water shield membrane is required in valleys by building code and manufacturer specifications to prevent water intrusion from ice damming and wind-driven rain.",
    category: "roofing",
    xactimateCodes: ["RFG IWS", "RFG VMET"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "COMAR 09.12.01; 2018 IRC R905.2.8.4",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "34 Pa. Code Ch. 403; 2018 IRC R905.2.8.4",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Valley metal is reusable / ice & water in valleys is an upgrade.",
    rebuttal:
      "IRC R905.2.8.4 requires proper valley treatment per manufacturer specifications. All major manufacturers (GAF, CertainTeed, Owens Corning) require ice & water shield in valleys for warranty coverage. Valley metal that is disturbed during tear-off should be replaced to ensure a watertight installation. This is a code and manufacturer requirement.",
  },

  // ─── WASTE FACTOR ──────────────────────────────────────────────────────

  {
    id: "WASTE-FACTOR",
    section: "Industry Standard",
    title: "Material Waste Factor",
    requirement:
      "A material waste factor of 10-15% for standard complexity roofs and 15-20% for complex roofs (many hips, valleys, dormers) is industry standard and recognized by Xactimate, HAAG Engineering, and all major manufacturers.",
    justificationText:
      "Industry standard waste factors are 10-15% for standard roofs and 15-20% for complex roofs. This accounts for cutting, fitting at hips/valleys/penetrations, starter waste, and manufacturer-specified overlap requirements. Waste percentages below these ranges result in material shortages on the jobsite.",
    category: "general",
    xactimateCodes: [],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "Xactimate Industry Standards; HAAG Engineering Residential Roof Manual",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: false,
        amendmentNote: null,
        sourceRef: "Xactimate Industry Standards; HAAG Engineering Residential Roof Manual",
      },
    ],
    carrierObjectionRate: "high",
    typicalObjection: "The waste factor should be 5% or less.",
    rebuttal:
      "HAAG Engineering (the industry standard for roof inspections) recommends 10-15% waste for standard roofs and 15-20% for complex roofs. Xactimate's built-in waste calculations follow these same guidelines. A waste factor below 10% does not account for cutting at hips, valleys, penetrations, and manufacturer-specified overlaps. The EagleView/aerial measurement report provides a recommended waste percentage based on actual roof complexity — this measurement-based waste figure should be used.",
  },

  // ─── PERMIT FEE ────────────────────────────────────────────────────────

  {
    id: "PERMIT-FEE",
    section: "R105.1",
    title: "Building Permit Fee",
    requirement:
      "Building permits are required for roof replacement in both Maryland and Pennsylvania. The permit fee is a direct cost of the code-compliant replacement.",
    justificationText:
      "Building permits are required by IRC R105.1 for roof replacement. Both Maryland (COMAR 09.12.01) and Pennsylvania (34 Pa. Code §403.42) mandate permits for this work. The permit fee is a necessary cost of the insured replacement and should be included in the claim.",
    category: "general",
    xactimateCodes: ["GEN PRMT"],
    jurisdictions: [
      {
        state: "MD",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "Permit fees vary by county. Typical range: $75-$300 for residential roof replacement.",
        sourceRef: "COMAR 09.12.01; Local AHJ fee schedules",
      },
      {
        state: "PA",
        ircEdition: "2018 IRC",
        hasAmendment: true,
        amendmentNote:
          "Permit fees vary by municipality. Typical range: $50-$250 for residential roof replacement.",
        sourceRef: "34 Pa. Code §403.42; Local AHJ fee schedules",
      },
    ],
    carrierObjectionRate: "medium",
    typicalObjection: "Permit fees are the contractor's overhead.",
    rebuttal:
      "Building permits are a direct cost of the code-compliant roof replacement, required by law (IRC R105.1, MD COMAR 09.12.01, PA UCC 34 Pa. Code §403.42). This is not a general overhead item — it is a job-specific regulatory cost that the contractor pays to the local government on behalf of the project. Xactimate includes permit fees as a separate line item (GEN PRMT) because they are a direct project expense.",
  },
];

// ── Lookup Helpers ────────────────────────────────────────────────────────

/**
 * Get all building codes applicable to a jurisdiction.
 */
export function getCodesForState(state: string): BuildingCode[] {
  const stateUpper = state.toUpperCase();
  return BUILDING_CODES.filter((code) =>
    code.jurisdictions.some((j) => j.state === stateUpper)
  );
}

/**
 * Get building codes applicable to a specific Xactimate code in a jurisdiction.
 */
export function getCodesForXactimateCode(
  xactimateCode: string,
  state: string
): BuildingCode[] {
  const stateUpper = state.toUpperCase();
  return BUILDING_CODES.filter(
    (code) =>
      code.xactimateCodes.includes(xactimateCode) &&
      code.jurisdictions.some((j) => j.state === stateUpper)
  );
}

/**
 * Get the jurisdiction-specific info for a code in a state.
 */
export function getJurisdictionInfo(
  code: BuildingCode,
  state: string
): JurisdictionCode | undefined {
  return code.jurisdictions.find((j) => j.state === state.toUpperCase());
}

/**
 * Build a formatted string of jurisdiction-verified codes for injection into
 * the Claude analysis prompt. Groups codes by category.
 */
export function buildCodeContextForPrompt(state: string): string {
  const codes = getCodesForState(state);
  if (codes.length === 0) return "";

  const jurisdiction =
    state.toUpperCase() === "MD" ? MD_JURISDICTION : PA_JURISDICTION;

  const lines: string[] = [
    `## JURISDICTION-VERIFIED BUILDING CODES (${jurisdiction.state})`,
    `Adopted Code: ${jurisdiction.ircEdition} (${jurisdiction.adoptionRef})`,
    "",
    "Use these VERIFIED code references in your justifications. These are confirmed applicable in this jurisdiction:",
    "",
  ];

  // Group by category
  const categories = new Map<string, BuildingCode[]>();
  for (const code of codes) {
    const cat = code.category;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(code);
  }

  for (const [category, catCodes] of categories) {
    lines.push(`### ${category.toUpperCase()}`);
    for (const code of catCodes) {
      const jurisdictionInfo = getJurisdictionInfo(code, state);
      const xactCodes =
        code.xactimateCodes.length > 0
          ? ` [Xactimate: ${code.xactimateCodes.join(", ")}]`
          : "";

      lines.push(`- **${code.section}** — ${code.title}${xactCodes}`);
      lines.push(`  Requirement: ${code.requirement}`);
      lines.push(`  Justification: ${code.justificationText}`);

      if (jurisdictionInfo?.hasAmendment && jurisdictionInfo.amendmentNote) {
        lines.push(
          `  ⚠ ${jurisdiction.state} Amendment: ${jurisdictionInfo.amendmentNote}`
        );
      }

      lines.push("");
    }
  }

  lines.push(
    "IMPORTANT: When citing building codes in justifications, use the exact section numbers above (e.g., 'IRC R905.2.8.5'). These have been verified as applicable in this jurisdiction."
  );

  return lines.join("\n");
}

/**
 * Validate an IRC reference returned by Claude against our verified database.
 * Returns the matching code if valid, or null if not found.
 */
export function validateIrcReference(
  ircRef: string,
  state: string
): BuildingCode | null {
  if (!ircRef) return null;

  const codes = getCodesForState(state);

  // Try exact section match first
  const exactMatch = codes.find(
    (c) => ircRef.includes(c.section)
  );
  if (exactMatch) return exactMatch;

  // Try parent section match (e.g., "R905.2" matches "R905.2.8.2")
  const parentMatch = codes.find((c) => {
    const refSection = ircRef.replace(/^IRC\s*/i, "").trim();
    return c.section.startsWith(refSection) || refSection.startsWith(c.section);
  });

  return parentMatch || null;
}

/**
 * Enrich an IRC reference with verified jurisdiction data.
 * If the code is in our database, returns the full verified reference.
 * If not, returns the original reference unchanged.
 */
export function enrichIrcReference(
  ircRef: string,
  state: string
): { reference: string; verified: boolean; sourceRef: string | null } {
  const code = validateIrcReference(ircRef, state);
  if (!code) {
    return { reference: ircRef, verified: false, sourceRef: null };
  }

  const jurisdictionInfo = getJurisdictionInfo(code, state);
  return {
    reference: `IRC ${code.section} — ${code.title}`,
    verified: true,
    sourceRef: jurisdictionInfo?.sourceRef || null,
  };
}
