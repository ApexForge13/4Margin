// ── Manufacturer Installation Requirements Database ──────────────────────────
//
// Maps manufacturer installation requirements to Xactimate line items for
// supplement justification. Sourced from public installation manuals and
// warranty documents.
//
// PHASE 1: GAF + CertainTeed (roofing)
// TODO Phase 1: Owens Corning, IKO, Tamko, James Hardie, CertainTeed Siding, LP SmartSide

export interface ManufacturerRequirement {
  id: string;
  requirement: string;
  description: string;
  mandatoryForWarranty: boolean;
  warrantyImpact: string;
  xactimateCode: string;
  xactimateDescription: string;
  xactimateUnit: string;
  commonlyMissedByAdjusters: boolean;
  typicalAdjusterObjection: string;
  rebuttal: string;
  sourceSection: string;
  sourceUrl: string;
}

export interface WarrantyTier {
  tier: string;
  requiredAccessories?: number;
  requiredItems?: string[];
  installerRequirement?: string;
  windCoverage: string;
  description: string;
  shingleRequirement?: string;
  workmanshipCoverage?: string;
}

export interface ProductLine {
  name: string;
  type: string;
  warrantyTerm: string;
  windWarranty?: string;
  sourceDoc?: string;
}

export interface Manufacturer {
  type: "roofing" | "siding";
  website: string;
  documentLibrary: string;
  productLines: ProductLine[];
  installationRequirements: ManufacturerRequirement[];
  warrantyTiers: WarrantyTier[];
}

export interface JustificationSource {
  manufacturer: string;
  requirement: string;
  sourceRef: string;
}

export interface JustificationEntry {
  lineItem: string;
  unit: string;
  justificationSources: JustificationSource[];
  codeRequirement: string;
  typicalRecovery: string;
}

// ── GAF Requirements ────────────────────────────────────────────────────────

export const GAF: Manufacturer = {
  type: "roofing",
  website: "https://www.gaf.com",
  documentLibrary: "https://www.gaf.com/en-us/document-library",
  productLines: [
    {
      name: "Timberline HDZ",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      sourceDoc:
        "https://www.gaf.com/en-us/document-library/documents/productdocuments/residentialroofingdocuments/shinglesdocuments/timberlineroofingshinglesdocuments/architecturalshinglesdocuments/timberlinehdzdocuments/Installation_Instructions__Timberline_HDZ_High_Definition_Lifetime_Shingles_.pdf",
    },
    {
      name: "Timberline AS II",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "Timberline UHDZ",
      type: "ultra_premium_shingle",
      warrantyTerm: "Lifetime Limited",
    },
  ],
  installationRequirements: [
    {
      id: "GAF-REQ-001",
      requirement: "Starter Strip Shingles",
      description:
        "GAF Starter Strip Shingles are required at eaves and rakes for warranty coverage. Required for WindProven Limited Wind Warranty and all enhanced warranties (System Plus, Silver Pledge, Golden Pledge).",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Without GAF starter strips, roof does NOT qualify for Lifetime Roofing System warranty, WindProven wind warranty, or any enhanced warranty tier.",
      xactimateCode: "RFG STRP",
      xactimateDescription: "Starter strip shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Starter strip is included in the shingle installation labor",
      rebuttal:
        'GAF installation instructions explicitly require GAF Starter Strip Shingles as a separate component. It is a distinct material not included in shingle installation labor. Without it, the manufacturer warranty is voided. Per GAF Roofing System Limited Warranty: "You must install at least three (3) qualifying GAF Accessory Products" including GAF Starter Strip Shingles.',
      sourceSection:
        "GAF Installation Instructions — Starter Course section; GAF Roofing System Limited Warranty — Required Products section",
      sourceUrl:
        "https://www.gaf.com/en-us/resources/warranties/gaf-roofing-system",
    },
    {
      id: "GAF-REQ-002",
      requirement: "Non-Corroding Metal Drip Edge",
      description:
        "Non-corroding metal drip edge (aluminum or galvanized steel) is required at eaves and rakes. At eaves, drip edge is installed first (under underlayment). At rakes, drip edge goes over underlayment. Must be nailed every 8-10 inches, or every 4 inches in high-wind areas.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required for Silver Pledge and Golden Pledge warranty installations. Code-required in most jurisdictions per IRC R905.2.8.5.",
      xactimateCode: "RFG DRIP",
      xactimateDescription: "Drip edge - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Drip edge is existing and does not need replacement",
      rebuttal:
        "When re-roofing, existing drip edge is typically bent, corroded, or improperly seated after tear-off. GAF Pro Field Guide requires non-corroding metal drip edge installed per specific sequence (under underlayment at eaves, over underlayment at rakes). IRC R905.2.8.5 requires drip edge at eaves and gable rake edges. Reusing damaged drip edge voids warranty compliance.",
      sourceSection:
        "GAF Pro Field Guide v2.1 — Drip Edge section; IRC R905.2.8.5",
      sourceUrl:
        "https://www.gaf.com/en-us/document-library/documents/installation-instructions-&-guides/pro-field-guide-for-steep-slope-roofs-resgn103.pdf",
    },
    {
      id: "GAF-REQ-003",
      requirement: "Leak Barrier (Ice & Water Shield)",
      description:
        "GAF Leak Barrier (StormGuard or WeatherWatch) required at eaves extending minimum 24 inches beyond interior wall line. Also required in valleys, around chimneys, at skylights, and at wall-to-roof intersections. Required by building code in areas where January average temperature is 25\u00B0F or lower.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "GAF Leak Barrier is one of the qualifying accessory products required for the Lifetime Roofing System warranty and WindProven wind warranty.",
      xactimateCode: "RFG FELT+",
      xactimateDescription: "Ice & water barrier / leak barrier",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Ice and water shield is only required in cold climates / not code-required here",
      rebuttal:
        'GAF requires Leak Barrier installation regardless of climate zone for warranty compliance. Even in areas where code does not mandate it at eaves, GAF requires it in valleys, around penetrations, at wall-to-roof intersections, and around chimneys. In MD/DE/PA/DC/VA, ice dam protection IS code-required per IRC R905.1.2 in areas where January mean temperature is 25\u00B0F or below. Additionally, GAF WeatherWatch product page states it provides "critical protection against wind-driven rain" in all climate zones.',
      sourceSection:
        "GAF Installation Instructions — Underlayment section; IRC R905.1.2",
      sourceUrl:
        "https://www.gaf.com/en-us/roofing-materials/residential-roofing-materials/leak-barriers/weatherwatch-ice-and-water-leak-barrier",
    },
    {
      id: "GAF-REQ-004",
      requirement: "Roof Deck Protection (Underlayment)",
      description:
        "GAF Roof Deck Protection (synthetic or felt underlayment) required over entire roof deck. For slopes 4:12 or greater, one layer. For slopes 2:12 to less than 4:12, two layers. Required for UL Class A fire rating. Underlayment is required by most code bodies.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "GAF Roof Deck Protection is a qualifying accessory required for Lifetime Roofing System warranty and WindProven warranty.",
      xactimateCode: "RFG FELT",
      xactimateDescription: "Roofing felt / synthetic underlayment",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection: "Already included in roofing labor",
      rebuttal:
        "Underlayment is a separate material line item. It is not included in shingle installation labor. It is required by GAF for warranty compliance, required by IRC R905.1.1 for asphalt shingle installations, and required to maintain UL Class A fire rating.",
      sourceSection:
        "GAF Installation Instructions — Underlayment section; IRC R905.1.1",
      sourceUrl:
        "https://documents.gaf.com/installation-instructions-&-guides/timberline-layerlock-installation-instructions-trilingual-restl622.pdf",
    },
    {
      id: "GAF-REQ-005",
      requirement: "Ridge Cap Shingles",
      description:
        "GAF Ridge Cap Shingles (Seal-A-Ridge, TimberTex, or Ridglass) required at all hips and ridges. Required qualifying accessory for all enhanced warranty tiers.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "GAF Ridge Cap Shingles are a required qualifying accessory for Lifetime Roofing System warranty and WindProven warranty.",
      xactimateCode: "RFG RIDG",
      xactimateDescription: "Ridge cap shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Ridge cap quantity is overstated / can use field shingles for ridge",
      rebuttal:
        "GAF specifically requires GAF Ridge Cap Shingles — not field-cut shingles — for warranty compliance. Using field shingles cut for ridge cap does not meet GAF warranty requirements and may void all enhanced warranty coverage.",
      sourceSection:
        "GAF Roofing System Limited Warranty — Required Products",
      sourceUrl:
        "https://www.gaf.com/en-us/resources/warranties/gaf-roofing-system",
    },
    {
      id: "GAF-REQ-006",
      requirement: "Attic Ventilation",
      description:
        "GAF Cobra Attic Ventilation or equivalent adequate ventilation required. Proper ventilation extends shingle life and is required for optimal system performance. GAF Cobra ridge vent or equivalent is a qualifying accessory product.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "GAF Cobra Attic Ventilation is one of the qualifying accessory options for WindProven warranty (choice of Leak Barrier OR Attic Ventilation as 4th accessory).",
      xactimateCode: "RFG VENT+",
      xactimateDescription: "Ridge vent",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing ventilation is adequate / ventilation is not storm-related",
      rebuttal:
        'When re-roofing, existing ridge vent is removed during tear-off and must be replaced. GAF installation instructions state "Install GAF ventilation products for optimal shingle life." Ventilation is required by IRC R806.1 — minimum 1 sq ft NFA per 150 sq ft of attic floor (or 1:300 with balanced intake/exhaust). If existing ventilation was inadequate, it must be brought to code during re-roof per most jurisdictions.',
      sourceSection:
        "GAF Installation Instructions — Ventilation section; IRC R806.1",
      sourceUrl:
        "https://documents.gaf.com/installation-instructions-&-guides/timberline-layerlock-installation-instructions-trilingual-restl622.pdf",
    },
    {
      id: "GAF-REQ-007",
      requirement: "Step Flashing at Wall Intersections",
      description:
        "Step flashing is required at all sloped roof-to-wall intersections. Minimum 4x4 inch L-shaped metal pieces, installed shingle-by-shingle up the wall. Must not be face-nailed through the metal.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Improper flashing installation voids warranty at those locations. GAF instructions explicitly detail step flashing requirements.",
      xactimateCode: "RFG FLSH",
      xactimateDescription: "Step flashing - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing step flashing can be reused / step flashing is not damaged",
      rebuttal:
        "GAF installation instructions require new step flashing at wall intersections. During tear-off, step flashing is typically disturbed, bent, or removed. Reusing compromised step flashing creates leak points and does not meet manufacturer installation requirements. IRC R905.2.8.3 requires base flashing and counter-flashing at wall intersections.",
      sourceSection:
        "GAF Installation Instructions — Wall Flashing section; IRC R905.2.8.3",
      sourceUrl:
        "https://documents.gaf.com/installation-instructions-&-guides/timberline-layerlock-installation-instructions-trilingual-restl622.pdf",
    },
    {
      id: "GAF-REQ-008",
      requirement: "Chimney Cricket/Saddle Flashing",
      description:
        "For chimneys wider than 30 inches, a cricket (saddle) must be installed on the back side. Cricket must extend at least 6 inches up the back of the chimney and at least 12 inches up the roof deck. Shop-fabricated metal cricket flashings required.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required by GAF installation instructions and building code for chimneys over 30 inches wide.",
      xactimateCode: "RFG FLCR",
      xactimateDescription: "Cricket/saddle flashing at chimney",
      xactimateUnit: "EA",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Cricket is existing / not storm-damaged",
      rebuttal:
        "During re-roof, chimney flashing including crickets must be replaced to ensure proper integration with new roofing system. GAF instructions require cricket flashings that extend 6 inches up chimney back and 12 inches up roof deck. IRC R903.2.2 requires crickets on the ridge side of chimneys more than 30 inches wide. Reusing old cricket flashing with new shingles creates leak potential at the transition.",
      sourceSection:
        "GAF Installation Instructions — Chimney Flashing section; IRC R903.2.2",
      sourceUrl:
        "https://documents.gaf.com/installation-instructions-&-guides/timberline-layerlock-installation-instructions-trilingual-restl622.pdf",
    },
    {
      id: "GAF-REQ-009",
      requirement: "Proper Fastener Specifications",
      description:
        "Zinc-coated steel or aluminum, 10-12 gauge, barbed/deformed/smooth shank roofing nails with 3/8 to 7/16 inch diameter heads. Must penetrate wood deck minimum 3/4 inch or through plywood. 4 nails per shingle standard, 6 nails for high-wind or steep slope. Nails must be driven flush — overdriving damages shingle.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "WindProven warranty specifically requires 4 nails per shingle for LayerLock technology. Improper nailing voids wind warranty coverage entirely.",
      xactimateCode: "RFG NAIL",
      xactimateDescription:
        "Roofing nails - additional for high-wind nailing pattern",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Nails are included in shingle installation",
      rebuttal:
        "Standard shingle installation pricing assumes 4 nails per shingle. When high-wind nailing (6 nails) is required by manufacturer specs or local code (common in coastal MD, DE, VA), additional fastener quantity and labor are a legitimate separate line item.",
      sourceSection: "GAF Installation Instructions — Fasteners section",
      sourceUrl:
        "https://documents.gaf.com/installation-instructions-&-guides/timberline-layerlock-installation-instructions-trilingual-restl622.pdf",
    },
  ],
  warrantyTiers: [
    {
      tier: "Standard Shingle & Accessory",
      requiredAccessories: 0,
      windCoverage: "130 mph (4 nails) / 110 mph",
      description: "Base warranty on shingles only",
    },
    {
      tier: "System Plus",
      requiredAccessories: 3,
      requiredItems: [
        "Roof Deck Protection",
        "Starter Strip Shingles",
        "Ridge Cap Shingles",
        "Leak Barrier OR Cobra Ventilation",
      ],
      installerRequirement: "GAF Certified Contractor",
      windCoverage: "130 mph",
      description:
        "Requires Lifetime Shingles + 3 qualifying accessories",
    },
    {
      tier: "Silver Pledge",
      requiredAccessories: 4,
      requiredItems: [
        "Roof Deck Protection",
        "Starter Strip Shingles",
        "Ridge Cap Shingles",
        "Leak Barrier",
        "Cobra Ventilation",
      ],
      installerRequirement: "GAF Certified Plus or Master Elite",
      windCoverage: "130 mph",
      description:
        "Requires Lifetime Shingles + 4 qualifying accessories",
    },
    {
      tier: "Golden Pledge",
      requiredAccessories: 5,
      requiredItems: [
        "Roof Deck Protection",
        "Starter Strip Shingles",
        "Ridge Cap Shingles",
        "Leak Barrier",
        "Cobra Ventilation",
        "Additional qualifying accessory",
      ],
      installerRequirement: "GAF Master Elite",
      windCoverage: "130 mph",
      description:
        "Requires Lifetime Shingles + 5 qualifying accessories",
    },
    {
      tier: "WindProven",
      requiredAccessories: 4,
      requiredItems: [
        "Roof Deck Protection",
        "Starter Strip Shingles",
        "Ridge Cap Shingles",
        "Leak Barrier OR Cobra Ventilation",
      ],
      shingleRequirement: "LayerLock-labeled shingles only",
      windCoverage: "No maximum wind speed limitation",
      description:
        "Industry's first wind warranty with no wind speed maximum. Requires LayerLock shingles + 4 qualifying accessories.",
    },
  ],
};

// ── CertainTeed Requirements ─────────────────────────────────────────────────

export const CERTAINTEED: Manufacturer = {
  type: "roofing",
  website: "https://www.certainteed.com",
  documentLibrary: "https://www.certainteed.com/resources",
  productLines: [
    {
      name: "Landmark",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph standard, upgradable to 130/160 mph",
    },
    {
      name: "Landmark Pro",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "Presidential Shake",
      type: "luxury_shingle",
      warrantyTerm: "Lifetime Limited",
    },
  ],
  installationRequirements: [
    {
      id: "CT-REQ-001",
      requirement: "CertainTeed Starter Strip",
      description:
        "CertainTeed starter strip shingles required at eaves and rakes. Starter course provides sealant adhesion for first course of shingles and protects against wind uplift at the most vulnerable roof edge.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "CertainTeed starter and CertainTeed hip and ridge are required for wind warranty upgrade to 130 mph or 160 mph. Required for all SureStart Plus enhanced warranty tiers (3-Star, 4-Star, 5-Star).",
      xactimateCode: "RFG STRP",
      xactimateDescription: "Starter strip shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Starter strip included in shingle installation",
      rebuttal:
        'CertainTeed Landmark product page explicitly states "CertainTeed starter and CertainTeed hip and ridge required" for wind warranty coverage. Starter strip is a separate material and separate line item. Without it, wind warranty drops from 130 mph to base level.',
      sourceSection:
        "CertainTeed Landmark Product Page; CertainTeed Applicator's Manual Chapter 10/12",
      sourceUrl:
        "https://www.certainteed.com/products/residential-roofing-products/landmark",
    },
    {
      id: "CT-REQ-002",
      requirement: "Drip Edge",
      description:
        "Metal drip edge required at eaves and rakes. At eaves, drip edge installed under underlayment. At rakes, drip edge installed over underlayment. Overhang of 1/2 inch from eaves and rakes when drip edge is used; 3/4 inch overhang when drip edge is NOT used.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required for proper installation per CertainTeed Applicator's Manual.",
      xactimateCode: "RFG DRIP",
      xactimateDescription: "Drip edge - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing drip edge adequate",
      rebuttal:
        "CertainTeed Applicator's Manual specifies drip edge installation requirements including specific overhang dimensions and installation sequence. During tear-off, existing drip edge is compromised. New drip edge ensures proper integration with new underlayment and shingle system.",
      sourceSection:
        "CertainTeed Applicator's Manual — Starter and Drip Edge section",
      sourceUrl:
        "https://education.nachi.org/coursemedia/course-67/documents/landmarkinstall.pdf",
    },
    {
      id: "CT-REQ-003",
      requirement: "Underlayment",
      description:
        "CertainTeed Roofers Select Felt or Diamond Deck Synthetic Underlayment recommended. Other ASTM-rated underlayments accepted. Required for UL fire rating. Must be applied flat and without wrinkles.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "CertainTeed requires ASTM-rated underlayment. CertainTeed branded underlayment required for enhanced warranty tiers.",
      xactimateCode: "RFG FELT",
      xactimateDescription: "Roofing felt / synthetic underlayment",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection: "Included in labor",
      rebuttal:
        "Underlayment is a separate material line item required by CertainTeed installation specifications and IRC R905.1.1.",
      sourceSection:
        "CertainTeed Applicator's Manual — Underlayment section",
      sourceUrl:
        "https://www.certainteed.com/resources/20-30-202_MSA_Manual_2021_Chapter5.pdf",
    },
    {
      id: "CT-REQ-004",
      requirement: "CertainTeed Ridge Cap (Pre-Cut Ridge Product)",
      description:
        "CertainTeed pre-cut ridge products required: Shadow Ridge, Cedar Crest Ridge, or Mountain Ridge. CertainTeed XT5 3-tab also acceptable on hips and ridges. 3-tab shingles CANNOT be used on ridge when upgrading to 130 mph wind warranty.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "CertainTeed ridge vent and CertainTeed pre-cut ridge required for enhanced warranty tiers and wind warranty upgrades.",
      xactimateCode: "RFG RIDG",
      xactimateDescription: "Ridge cap shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Can use field-cut 3-tab for ridge cap",
      rebuttal:
        "CertainTeed specifically requires pre-cut ridge products (Shadow Ridge, Cedar Crest Ridge, or Mountain Ridge) for enhanced warranty coverage. When upgrading to 130 mph wind warranty, 3-tab CANNOT be used on ridge.",
      sourceSection:
        "CertainTeed Warranty Requirements; WABO Roofing Guide",
      sourceUrl:
        "https://waboroofing.com/roofing-service/certainteed-roofing-warranty-guide/",
    },
    {
      id: "CT-REQ-005",
      requirement: "CertainTeed Ridge Vent",
      description:
        "If roof has ridge vent, CertainTeed Ridge Vent must be installed for enhanced warranty coverage. If roof does not have ridge vent, CertainTeed only requires adequate ventilation.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "CertainTeed branded ridge vent required for Integrity Roof System and enhanced SureStart Plus warranties.",
      xactimateCode: "RFG VENT+",
      xactimateDescription: "Ridge vent",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing ventilation adequate / not storm damaged",
      rebuttal:
        'CertainTeed warranty requirements state "If roof has ridgevent, CertainTeed Ridgevent must be installed." During re-roof, existing ridge vent is removed during tear-off. Replacement with CertainTeed branded product is required for enhanced warranty compliance.',
      sourceSection:
        "CertainTeed Integrity Roof System Requirements",
      sourceUrl:
        "https://waboroofing.com/roofing-service/certainteed-roofing-warranty-guide/",
    },
    {
      id: "CT-REQ-006",
      requirement: "Step Flashing",
      description:
        "Step flashing required at all roof-to-wall intersections. Minimum dimensions specified in Applicator's Manual. Must use 7-5/8 inch or more for metric dimension and Landmark TL shingles.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required per CertainTeed installation instructions for proper waterproofing at wall transitions.",
      xactimateCode: "RFG FLSH",
      xactimateDescription: "Step flashing - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing flashing can be reused",
      rebuttal:
        "CertainTeed Applicator's Manual specifies minimum step flashing dimensions and requires proper installation at all roof-to-wall intersections. Step flashing is disturbed during tear-off and must be replaced for system integrity.",
      sourceSection:
        "CertainTeed Applicator's Manual — Step Flashing section",
      sourceUrl:
        "https://education.nachi.org/coursemedia/course-67/documents/landmarkinstall.pdf",
    },
  ],
  warrantyTiers: [
    {
      tier: "Standard Limited Warranty",
      windCoverage: "110 mph",
      description:
        "Base warranty, no special requirements beyond proper installation",
    },
    {
      tier: "3-Star SureStart Plus",
      windCoverage: "130 mph",
      installerRequirement: "ShingleMaster or Select ShingleMaster",
      requiredItems: ["Full CertainTeed Integrity Roof System components"],
      description: "Extends non-prorated period to 20 years",
    },
    {
      tier: "4-Star SureStart Plus",
      windCoverage: "130 mph",
      installerRequirement: "Select ShingleMaster",
      requiredItems: ["Full CertainTeed Integrity Roof System components"],
      description: "Extends non-prorated period to 50 years",
    },
    {
      tier: "5-Star SureStart Plus",
      windCoverage: "160 mph",
      installerRequirement: "Select ShingleMaster",
      requiredItems: ["Full CertainTeed Integrity Roof System components"],
      workmanshipCoverage: "25 years",
      description:
        "Extends non-prorated period to 50 years + 25-year workmanship warranty",
    },
  ],
};

// ── All Manufacturers (index) ────────────────────────────────────────────────

export const MANUFACTURERS: Record<string, Manufacturer> = {
  GAF,
  CertainTeed: CERTAINTEED,
};

// ── Supplement Justification Matrix ──────────────────────────────────────────
// Quick lookup: for each commonly missed Xactimate line item, which
// manufacturer requirements justify its inclusion.

export const JUSTIFICATION_MATRIX: Record<string, JustificationEntry> = {
  "RFG STRP": {
    lineItem: "Starter strip shingles",
    unit: "LF",
    justificationSources: [
      {
        manufacturer: "GAF",
        requirement:
          "Required for all warranty tiers. Required for WindProven wind warranty. Separate material from shingle installation.",
        sourceRef: "GAF-REQ-001",
      },
      {
        manufacturer: "CertainTeed",
        requirement:
          "Required for wind warranty upgrade (130/160 mph). Required for all SureStart Plus tiers.",
        sourceRef: "CT-REQ-001",
      },
    ],
    codeRequirement:
      "Not explicitly code-required but manufacturer-required for warranty compliance",
    typicalRecovery: "$150-$400 per claim",
  },
  "RFG DRIP": {
    lineItem: "Drip edge - aluminum",
    unit: "LF",
    justificationSources: [
      {
        manufacturer: "GAF",
        requirement:
          "Non-corroding metal drip edge required at eaves and rakes. Specific installation sequence required.",
        sourceRef: "GAF-REQ-002",
      },
      {
        manufacturer: "CertainTeed",
        requirement:
          "Metal drip edge required per Applicator's Manual with specific overhang dimensions.",
        sourceRef: "CT-REQ-002",
      },
    ],
    codeRequirement:
      "IRC R905.2.8.5 — Drip edge required at eaves and gable rake edges of shingle roofs",
    typicalRecovery: "$200-$600 per claim",
  },
  "RFG FELT+": {
    lineItem: "Ice & water barrier / leak barrier",
    unit: "SQ",
    justificationSources: [
      {
        manufacturer: "GAF",
        requirement:
          "Required at eaves (24 inches beyond interior wall line), valleys, penetrations, wall intersections. Qualifying accessory for all enhanced warranties.",
        sourceRef: "GAF-REQ-003",
      },
    ],
    codeRequirement:
      "IRC R905.1.2 — Required in areas where average January temperature is 25\u00B0F or below. Applies to most of MD, DE, PA, DC, and northern VA.",
    typicalRecovery: "$300-$800 per claim",
  },
  "RFG FLSH": {
    lineItem: "Step flashing - aluminum",
    unit: "LF",
    justificationSources: [
      {
        manufacturer: "GAF",
        requirement:
          "Required at all sloped roof-to-wall intersections. Must not face-nail through metal.",
        sourceRef: "GAF-REQ-007",
      },
      {
        manufacturer: "CertainTeed",
        requirement:
          "Required at all roof-to-wall intersections with minimum dimensions specified.",
        sourceRef: "CT-REQ-006",
      },
    ],
    codeRequirement:
      "IRC R905.2.8.3 — Base flashing and counter-flashing required at wall intersections",
    typicalRecovery: "$200-$500 per claim",
  },
  "RFG VENT+": {
    lineItem: "Ridge vent",
    unit: "LF",
    justificationSources: [
      {
        manufacturer: "GAF",
        requirement:
          "GAF Cobra ventilation is a qualifying warranty accessory. Required for optimal shingle life.",
        sourceRef: "GAF-REQ-006",
      },
      {
        manufacturer: "CertainTeed",
        requirement:
          "If roof has ridge vent, CertainTeed branded ridge vent must be installed for enhanced warranty.",
        sourceRef: "CT-REQ-005",
      },
    ],
    codeRequirement:
      "IRC R806.1 — Minimum 1 sq ft NFA per 150 sq ft attic floor (or 1:300 with balanced intake/exhaust)",
    typicalRecovery: "$150-$400 per claim",
  },
  "RFG FLCR": {
    lineItem: "Cricket/saddle flashing at chimney",
    unit: "EA",
    justificationSources: [
      {
        manufacturer: "GAF",
        requirement:
          "Required for chimneys wider than 30 inches. Must extend 6 inches up chimney, 12 inches up roof deck.",
        sourceRef: "GAF-REQ-008",
      },
    ],
    codeRequirement:
      "IRC R903.2.2 — Cricket required on ridge side of chimneys more than 30 inches wide",
    typicalRecovery: "$300-$600 per claim",
  },
};

// ── Helper: get all requirements for a given Xactimate code ──────────────────

export function getRequirementsForCode(xactimateCode: string): ManufacturerRequirement[] {
  const results: ManufacturerRequirement[] = [];
  for (const manufacturer of Object.values(MANUFACTURERS)) {
    for (const req of manufacturer.installationRequirements) {
      if (req.xactimateCode === xactimateCode) {
        results.push(req);
      }
    }
  }
  return results;
}

// ── Helper: get all commonly missed items ────────────────────────────────────

export function getCommonlyMissedItems(): ManufacturerRequirement[] {
  const results: ManufacturerRequirement[] = [];
  for (const manufacturer of Object.values(MANUFACTURERS)) {
    for (const req of manufacturer.installationRequirements) {
      if (req.commonlyMissedByAdjusters) {
        results.push(req);
      }
    }
  }
  return results;
}
