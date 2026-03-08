// ── Atlas Roofing Installation Requirements ─────────────────────────────────
//
// Sourced from Atlas Roofing public installation instructions, warranty
// documents, and the Signature Select / Pro Plus warranty programs.
//
// Atlas Roofing Corporation — atlasroofing.com
// Key differentiator: Scotchgard Protector on architectural lines,
// Pro-Cut Starter and Pro-Cut Hip & Ridge accessory system.

import type { Manufacturer } from "../manufacturer-requirements";

export const ATLAS: Manufacturer = {
  type: "roofing",
  website: "https://www.atlasroofing.com",
  documentLibrary: "https://www.atlasroofing.com/resources",
  productLines: [
    {
      name: "StormMaster Slate",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "Scotchgard Protector",
    },
    {
      name: "Pinnacle Pristine",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "Scotchgard Protector",
    },
    {
      name: "ProLam",
      type: "architectural_shingle",
      warrantyTerm: "Limited Lifetime",
    },
    {
      name: "Legend",
      type: "3-tab",
      warrantyTerm: "30-year",
    },
  ],
  installationRequirements: [
    {
      id: "ATLAS-REQ-001",
      requirement: "Starter Strip (Pro-Cut Starter)",
      description:
        "Atlas Pro-Cut Starter at eaves and rakes. Required for Signature Select and Pro Plus warranty tiers. Pro-Cut Starter is a purpose-built accessory product, not field-cut shingles.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required for Signature Select and Pro Plus enhanced warranty tiers. Without Atlas Pro-Cut Starter, enhanced warranty coverage is not available.",
      xactimateCode: "RFG STRP",
      xactimateDescription: "Starter strip shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Starter included in shingle labor",
      rebuttal:
        "Atlas requires Pro-Cut Starter for enhanced warranty coverage. It is a separate manufactured product (not field-cut shingles) requiring separate installation along eaves and rakes. Without it, enhanced warranty tiers are not available.",
      sourceSection:
        "Atlas Roofing Installation Instructions — Starter Course section; Atlas Signature Select Warranty",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-002",
      requirement: "Drip Edge",
      description:
        "Non-corroding metal drip edge at eaves and rakes. Installation sequence: under underlayment at eaves, over underlayment at rakes. Must be nailed at regular intervals per Atlas specifications.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required per Atlas installation instructions for proper roofing system integration. Drip edge is code-required per IRC R905.2.8.5.",
      xactimateCode: "RFG DRIP",
      xactimateDescription: "Drip edge - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing drip edge adequate",
      rebuttal:
        "IRC R905.2.8.5 mandates drip edge. Atlas installation instructions specify proper drip edge as part of the roofing system. Existing drip edge is compromised during tear-off.",
      sourceSection:
        "Atlas Installation Instructions — Drip Edge section; IRC R905.2.8.5",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-003",
      requirement: "Ice & Water Shield (WeatherMaster)",
      description:
        "Atlas WeatherMaster Ice & Water Underlayment at eaves (minimum 24 inches past interior wall line), valleys, penetrations, and other critical areas. WeatherMaster is a qualifying component for enhanced warranty coverage.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Atlas WeatherMaster is a qualifying component for enhanced Signature Select warranty. Required at all critical areas for proper waterproofing.",
      xactimateCode: "RFG FELT+",
      xactimateDescription: "Ice & water barrier / leak barrier",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "IWS not required in this area",
      rebuttal:
        "Atlas requires ice & water barrier at all critical areas. MD/PA/DE are in climate zones requiring ice barrier per IRC R905.2.7.1. Atlas WeatherMaster is a qualifying component for enhanced warranty.",
      sourceSection:
        "Atlas Installation Instructions — Ice & Water section",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-004",
      requirement: "Underlayment (Summit / Gorilla Guard)",
      description:
        "Synthetic underlayment over entire roof deck. Atlas Summit 60 or Gorilla Guard synthetic underlayment recommended for optimal system performance. ASTM-compliant underlayment required.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Underlayment is required by Atlas installation instructions and IRC R905.2.3 for all asphalt shingle installations.",
      xactimateCode: "RFG FELT",
      xactimateDescription: "Roofing felt / synthetic underlayment",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection: "Included in labor",
      rebuttal:
        "Separate material required by Atlas and IRC R905.2.3.",
      sourceSection:
        "Atlas Installation Instructions — Underlayment section",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-005",
      requirement: "Ridge Cap (Pro-Cut Hip & Ridge)",
      description:
        "Atlas Pro-Cut Hip & Ridge shingles at all hips and ridges. Must be Atlas product for Signature Select warranty. Pro-Cut Hip & Ridge provides proper exposure width and adhesive strips designed for ridge/hip application.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Atlas Pro-Cut Hip & Ridge is required for Signature Select warranty. Field-cut shingles do not meet warranty requirements.",
      xactimateCode: "RFG RIDG",
      xactimateDescription: "Ridge cap shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Can use field-cut shingles for ridge",
      rebuttal:
        "Atlas requires purpose-built Pro-Cut Hip & Ridge product for warranty. Field-cut shingles do not have the proper exposure width or adhesive strips for ridge/hip application.",
      sourceSection:
        "Atlas Signature Select Warranty — Required Components",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-006",
      requirement: "Ventilation",
      description:
        "Adequate attic ventilation per IRC R806.1. Atlas does not manufacture ridge vent but requires adequate system ventilation for shingle longevity and warranty compliance. Balanced intake/exhaust ventilation recommended.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Atlas warranty requires adequate ventilation. Improper ventilation can void warranty due to premature shingle failure from excessive attic heat.",
      xactimateCode: "RFG VENT+",
      xactimateDescription: "Ridge vent",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing ventilation adequate",
      rebuttal:
        "IRC R806.1 requires minimum ventilation ratios. During re-roof, existing ridge vent is removed and must be replaced. Atlas warranty requires adequate ventilation for shingle longevity.",
      sourceSection:
        "Atlas Installation Instructions — Ventilation Requirements",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-007",
      requirement: "Step Flashing",
      description:
        "New step flashing at all roof-to-wall intersections. Minimum 4x4 inch L-shaped metal pieces, installed shingle-by-shingle up the wall. Existing step flashing is compromised during tear-off.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Improper flashing installation creates leak points that are not covered under warranty. Atlas instructions require proper flashing at all wall intersections.",
      xactimateCode: "RFG FLSH",
      xactimateDescription: "Step flashing - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Existing flashing reusable",
      rebuttal:
        "Atlas instructions require proper flashing at wall intersections. Compromised during tear-off, must be replaced for watertight installation. IRC R903.2.1 mandates flashing at all wall-roof junctions.",
      sourceSection:
        "Atlas Installation Instructions — Flashing section; IRC R903.2.1",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
    {
      id: "ATLAS-REQ-008",
      requirement: "High-Wind Nailing",
      description:
        "4 nails standard, 6 nails in high-wind zones (110 mph or greater wind speed design). Nails must be placed in the designated nailing area per Atlas specifications. Enhanced nailing increases material and labor by approximately 50%.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Atlas specifies enhanced nailing in high-wind areas for warranty compliance. Improper nailing voids wind warranty coverage.",
      xactimateCode: "RFG NAIL",
      xactimateDescription:
        "Roofing nails - additional for high-wind nailing pattern",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection: "Standard nailing included",
      rebuttal:
        "High-wind zones per ASCE 7-16 require 6-nail pattern, increasing material by 50%. Atlas specifies enhanced nailing in these areas for warranty. This is a code requirement per IRC R905.2.5.",
      sourceSection:
        "Atlas Installation Instructions — Fastener section; IRC R905.2.5",
      sourceUrl: "https://www.atlasroofing.com/resources",
    },
  ],
  warrantyTiers: [
    {
      tier: "Standard Limited Warranty",
      windCoverage: "110 mph",
      description: "Base warranty on shingles only",
    },
    {
      tier: "Signature Select",
      windCoverage: "130 mph",
      installerRequirement: "Atlas PRO+ Certified installer",
      requiredItems: [
        "Atlas Pro-Cut Starter",
        "Atlas Pro-Cut Hip & Ridge",
        "Atlas WeatherMaster Ice & Water",
        "Full Atlas system components",
      ],
      description:
        "Enhanced warranty requiring Atlas PRO+ Certified installer and Atlas system components. 130 mph wind coverage.",
    },
    {
      tier: "Pro Plus",
      windCoverage: "150 mph",
      installerRequirement: "Atlas Master Certified installer",
      requiredItems: [
        "Atlas Pro-Cut Starter",
        "Atlas Pro-Cut Hip & Ridge",
        "Atlas WeatherMaster Ice & Water",
        "Atlas Summit 60 or Gorilla Guard Underlayment",
        "Full Atlas roofing system",
      ],
      workmanshipCoverage: "Non-prorated workmanship coverage",
      description:
        "Top-tier warranty requiring Atlas Master Certified installer and full Atlas system. 150 mph wind coverage with non-prorated workmanship.",
    },
  ],
};
