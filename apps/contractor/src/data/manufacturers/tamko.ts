// ── TAMKO Building Products Installation Requirements ────────────────────────
//
// Sourced from TAMKO public installation instructions, warranty documents,
// and the WeatherBond warranty program.
//
// TAMKO Building Products LLC — tamko.com
// Key differentiator: WeatherBond warranty system, Titan XT with
// StormFighter IR Class 4 impact resistance, TAM-PRO accessory line.

import type { Manufacturer } from "../manufacturer-requirements";

export const TAMKO: Manufacturer = {
  type: "roofing",
  website: "https://www.tamko.com",
  documentLibrary: "https://www.tamko.com/resources",
  productLines: [
    {
      name: "Heritage",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "Elite Glass-Seal",
      type: "3-tab",
      warrantyTerm: "25-year",
    },
    {
      name: "Titan XT",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "StormFighter IR Class 4",
    },
    {
      name: "Thunderstorm",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "Class 4 Impact Resistant",
    },
  ],
  installationRequirements: [
    {
      id: "TAMKO-REQ-001",
      requirement: "Starter Strip (TAM-PRO Starter)",
      description:
        "TAMKO TAM-PRO Starter or equivalent starter strip at eaves and rakes. Required for WeatherBond warranty. Starter strip provides sealant adhesion for first course and protects against wind uplift at roof edges.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required for WeatherBond warranty coverage. Without proper starter strip, enhanced warranty is not available.",
      xactimateCode: "RFG STRP",
      xactimateDescription: "Starter strip shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Starter included in shingle labor",
      rebuttal:
        "TAMKO requires starter strip for WeatherBond warranty coverage. It is a separate material with separate labor, and must be installed per TAMKO specifications for warranty eligibility.",
      sourceSection:
        "TAMKO Installation Instructions — Starter Course section; WeatherBond Warranty Requirements",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-002",
      requirement: "Drip Edge",
      description:
        "Metal drip edge required at eaves and rakes. Installation sequence: under underlayment at eaves, over underlayment at rakes. Must be replaced during re-roof as existing drip edge is compromised during tear-off.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required per TAMKO installation instructions for proper system integration. Code-required per IRC R905.2.8.5.",
      xactimateCode: "RFG DRIP",
      xactimateDescription: "Drip edge - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing drip edge adequate",
      rebuttal:
        "IRC R905.2.8.5 requires drip edge. TAMKO installation instructions specify proper drip edge installation sequence. Must be replaced during re-roof.",
      sourceSection:
        "TAMKO Installation Instructions — Drip Edge section; IRC R905.2.8.5",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-003",
      requirement: "Ice & Water Shield (TW Metal & Tile Underlayment)",
      description:
        "Self-adhering ice barrier at eaves, valleys, penetrations, and other critical areas. Minimum 24 inches past interior wall line at eaves. Required in climate zones per IRC R905.2.7.1.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required at critical areas for TAMKO warranty compliance. Ice barrier is a key component of the WeatherBond warranty system.",
      xactimateCode: "RFG FELT+",
      xactimateDescription: "Ice & water barrier / leak barrier",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Not code required here",
      rebuttal:
        "IRC R905.2.7.1 requires ice barrier in MD/PA/DE climate zones. TAMKO installation instructions require ice barrier at critical areas for warranty compliance.",
      sourceSection:
        "TAMKO Installation Instructions — Ice & Water section; IRC R905.2.7.1",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-004",
      requirement: "Underlayment (Moisture Guard Plus)",
      description:
        "Synthetic or felt underlayment over entire roof deck. ASTM D226 or D4869 compliant. TAMKO Moisture Guard Plus synthetic underlayment recommended for enhanced protection.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Underlayment is required by TAMKO installation instructions and building code for all asphalt shingle installations.",
      xactimateCode: "RFG FELT",
      xactimateDescription: "Roofing felt / synthetic underlayment",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection: "Included in labor",
      rebuttal:
        "Separate material per TAMKO instructions and IRC R905.2.3.",
      sourceSection:
        "TAMKO Installation Instructions — Underlayment section",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-005",
      requirement: "Ridge Cap (TAM-PRO Ridge)",
      description:
        "TAMKO TAM-PRO Ridge or equivalent hip and ridge shingles at all hips and ridges. Purpose-built ridge cap provides proper profile, adhesion, and wind resistance.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "TAMKO TAM-PRO Ridge is a required component for WeatherBond warranty coverage. Field-cut shingles do not meet warranty requirements.",
      xactimateCode: "RFG RIDG",
      xactimateDescription: "Ridge cap shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection: "Use field-cut shingles",
      rebuttal:
        "TAMKO requires purpose-built ridge cap. Field-cut shingles do not provide the proper profile, adhesion, or wind resistance at hips and ridges.",
      sourceSection:
        "TAMKO WeatherBond Warranty — Required Components",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-006",
      requirement: "Ventilation",
      description:
        "Adequate ventilation per IRC R806.1. TAMKO recommends balanced intake/exhaust ventilation for optimal shingle performance and longevity. Existing ridge vent removed during tear-off must be replaced.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "TAMKO requires adequate ventilation for warranty compliance. Improper ventilation leading to premature shingle failure is not covered under warranty.",
      xactimateCode: "RFG VENT+",
      xactimateDescription: "Ridge vent",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing ventilation adequate",
      rebuttal:
        "IRC R806.1 sets minimum ventilation ratios. Ridge vent removed during tear-off must be replaced. TAMKO requires adequate ventilation for warranty and shingle longevity.",
      sourceSection:
        "TAMKO Installation Instructions — Ventilation section; IRC R806.1",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-007",
      requirement: "Step Flashing",
      description:
        "New step flashing at all roof-to-wall intersections. Step flashing is disturbed during tear-off and must be replaced for watertight installation. Code-required per IRC R903.2.1.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Improper flashing creates leak points not covered under warranty. TAMKO instructions require proper flashing at all wall intersections.",
      xactimateCode: "RFG FLSH",
      xactimateDescription: "Step flashing - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing flashing reusable",
      rebuttal:
        "TAMKO instructions require new step flashing at wall intersections. Disturbed during tear-off. IRC R903.2.1 requires flashing at all wall-roof junctions.",
      sourceSection:
        "TAMKO Installation Instructions — Wall Flashing section; IRC R903.2.1",
      sourceUrl: "https://www.tamko.com/resources",
    },
    {
      id: "TAMKO-REQ-008",
      requirement: "High-Wind Fastening",
      description:
        "4 nails standard, 6 nails in high-wind zones. Nails must penetrate minimum 3/4 inch into the roof deck. Enhanced nailing increases material and labor costs by approximately 50%.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "TAMKO specifies enhanced nailing in high-wind areas for warranty compliance. Improper nailing pattern voids wind warranty.",
      xactimateCode: "RFG NAIL",
      xactimateDescription:
        "Roofing nails - additional for high-wind nailing pattern",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Standard nailing included",
      rebuttal:
        "High-wind zones require 6-nail pattern per IRC R905.2.5 and TAMKO specifications, increasing material and labor costs by approximately 50%.",
      sourceSection:
        "TAMKO Installation Instructions — Fastener section; IRC R905.2.5",
      sourceUrl: "https://www.tamko.com/resources",
    },
  ],
  warrantyTiers: [
    {
      tier: "Standard Limited Warranty",
      windCoverage: "110 mph",
      description: "Base warranty on shingles only",
    },
    {
      tier: "WeatherBond",
      windCoverage: "130 mph",
      installerRequirement: "TAMKO Pro Certified installer",
      requiredItems: [
        "TAM-PRO Starter",
        "TAM-PRO Ridge",
        "TAMKO Ice & Water Barrier",
        "Full TAMKO system components",
      ],
      workmanshipCoverage: "25 years",
      description:
        "Enhanced warranty requiring TAMKO Pro Certified installer and TAMKO system components. 130 mph wind coverage with 25-year workmanship.",
    },
  ],
};
