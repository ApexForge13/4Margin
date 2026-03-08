// ── IKO Installation Requirements ────────────────────────────────────────────
//
// Sourced from IKO public installation instructions, warranty documents,
// and PRO4 Advantage/Iron Clad Protection warranty requirements.
//
// Products covered: Dynasty, Cambridge, Nordic, Crowne Slate

import type { Manufacturer } from "../manufacturer-requirements";

export const IKO: Manufacturer = {
  type: "roofing",
  website: "https://www.iko.com",
  documentLibrary:
    "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
  productLines: [
    {
      name: "Dynasty",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "ArmourZone",
    },
    {
      name: "Cambridge",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "Nordic",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "Crowne Slate",
      type: "luxury_shingle",
      warrantyTerm: "Lifetime Limited",
    },
  ],
  installationRequirements: [
    {
      id: "IKO-REQ-001",
      requirement: "Starter Strip (Leading Edge Plus)",
      description:
        "IKO Leading Edge Plus starter strip required at eaves and rakes. Provides proper sealant adhesion for first course of shingles and protects against wind uplift at the most vulnerable roof edges. Required qualifying component for enhanced IKO ROOFPro warranty programs.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required for PRO4 Advantage warranty. Without IKO starter strip, the roof does not qualify for enhanced warranty tiers including Iron Clad Protection.",
      xactimateCode: "RFG STRP",
      xactimateDescription: "Starter strip shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Starter strip included in shingle installation",
      rebuttal:
        "IKO requires Leading Edge Plus starter strip as a qualifying component for the PRO4 Advantage warranty. It is a separate material with separate labor, not included in shingle installation pricing. Without IKO starter strip, the homeowner loses enhanced warranty protection and wind coverage upgrades.",
      sourceSection:
        "IKO Installation Instructions — Starter Course section",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-002",
      requirement: "Non-Corroding Metal Drip Edge",
      description:
        "Metal drip edge required at eaves and rakes per IRC R905.2.8.5. Protects roof deck edges from water intrusion and provides proper finished edge. Must be installed under underlayment at eaves and over underlayment at rakes.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required per IKO installation instructions for proper roofing system integration. Code-required per IRC R905.2.8.5.",
      xactimateCode: "RFG DRIP",
      xactimateDescription: "Drip edge - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing drip edge adequate",
      rebuttal:
        "IRC R905.2.8.5 requires drip edge at eaves and gable rake edges. IKO installation instructions specify drip edge as part of proper installation. During tear-off, existing drip edge is bent, corroded, or improperly seated and cannot be reused. New drip edge is required for proper integration with the new underlayment and shingle system.",
      sourceSection:
        "IKO Installation Instructions — Drip Edge section",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-003",
      requirement: "Ice & Water Shield (GoldShield / StormShield)",
      description:
        "IKO GoldShield or StormShield ice and water membrane required at eaves extending minimum 24 inches past interior wall line, in valleys, around penetrations, and at wall-to-roof intersections. Required for Iron Clad Protection warranty in applicable climate zones.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "IKO ice and water membrane is required for Iron Clad Protection warranty coverage. Without it, enhanced warranty protection is not available in applicable zones.",
      xactimateCode: "RFG FELT+",
      xactimateDescription: "Ice & water barrier / leak barrier",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Ice and water shield not required in this area",
      rebuttal:
        "IKO requires ice and water membrane at all critical areas including eaves, valleys, and penetrations for enhanced warranty compliance. MD/PA/DE are in applicable climate zones per IRC R905.2.7.1 where ice barrier is code-required at eaves. Even in areas where code does not mandate eave protection, IKO requires it in valleys and around penetrations for proper system performance.",
      sourceSection:
        "IKO Installation Instructions — Leak Barrier section",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-004",
      requirement: "Underlayment (RoofGard-SC)",
      description:
        "Synthetic or felt underlayment required over entire roof deck. IKO RoofGard-SC or equivalent meeting ASTM D226 standard accepted. Provides secondary weather protection and is required for UL fire rating maintenance.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Underlayment is required by IKO for proper installation. IKO-branded underlayment is recommended for enhanced warranty eligibility.",
      xactimateCode: "RFG FELT",
      xactimateDescription: "Roofing felt / synthetic underlayment",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Included in shingle labor",
      rebuttal:
        "Underlayment is a separate material line item, not included in shingle installation labor. It is required by IKO installation instructions and IRC R905.2.3 for asphalt shingle installations. It is also required to maintain UL Class A fire rating.",
      sourceSection:
        "IKO Installation Instructions — Underlayment section",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-005",
      requirement: "Ridge Cap (UltraHP / Hip & Ridge 12)",
      description:
        "IKO UltraHP or Hip & Ridge 12 hip and ridge shingles required at all hips and ridges. Purpose-built ridge cap products provide proper wind resistance and aesthetic finish. Field-cut shingles do not meet IKO warranty requirements at hips and ridges.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "IKO ridge cap products are required for PRO4 Advantage warranty compliance. Field-cut shingles void warranty coverage at hips and ridges.",
      xactimateCode: "RFG RIDG",
      xactimateDescription: "Ridge cap shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Can use field-cut shingles for ridge cap",
      rebuttal:
        "IKO requires purpose-built ridge cap products (UltraHP or Hip & Ridge 12) for warranty compliance. Field-cut shingles do not meet IKO warranty requirements at hips and ridges and void enhanced warranty coverage. Purpose-built ridge cap provides superior wind resistance and proper SealZone adhesion.",
      sourceSection:
        "IKO PRO4 Advantage Warranty Requirements",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-006",
      requirement: "Attic Ventilation",
      description:
        "Adequate attic ventilation required per IRC R806.1 and IKO installation instructions. Proper ventilation extends shingle life and prevents moisture damage to roof deck and attic structure. Ridge vent removed during tear-off must be replaced.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Adequate ventilation is required by IKO for warranty compliance. Improper ventilation can void warranty coverage due to premature shingle failure.",
      xactimateCode: "RFG VENT+",
      xactimateDescription: "Ridge vent",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing ventilation adequate / not storm-related",
      rebuttal:
        "Ridge vent is removed during tear-off and must be replaced. IKO installation instructions and IRC R806.1 require adequate ventilation. IRC R806.1 requires minimum 1 sq ft NFA per 150 sq ft of attic floor (or 1:300 with balanced intake/exhaust). If existing ventilation was inadequate, it must be brought to code during re-roof per most jurisdictions.",
      sourceSection:
        "IKO Installation Instructions — Ventilation section",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-007",
      requirement: "Step Flashing at Wall Intersections",
      description:
        "New step flashing required at all roof-to-wall intersections. Must be properly integrated with the roofing system for waterproof wall transitions. Step flashing disturbed during tear-off cannot be reused.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Improper flashing installation voids warranty at those locations. IKO installation instructions require new step flashing at all wall intersections.",
      xactimateCode: "RFG FLSH",
      xactimateDescription: "Step flashing - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing step flashing can be reused",
      rebuttal:
        "IKO installation instructions require new step flashing at all wall intersections. During tear-off, step flashing is typically disturbed, bent, or removed and cannot be reused. IRC R905.2.8.3 requires base flashing and counter-flashing at wall intersections. Reusing compromised step flashing creates leak points and does not meet manufacturer installation requirements.",
      sourceSection:
        "IKO Installation Instructions — Wall Flashing section",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
    {
      id: "IKO-REQ-008",
      requirement: "ArmourZone Nailing (Dynasty)",
      description:
        "IKO Dynasty shingles feature the ArmourZone reinforced nailing area. Nails must be placed in the ArmourZone for proper adhesion and wind resistance. 4 nails standard, 6 nails in high-wind zones. Precise nail placement in the ArmourZone is critical — nails above or below the zone compromise wind performance.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "ArmourZone requires precise nail placement for wind warranty. High-wind zones require 6-nail pattern. Improper nailing voids wind warranty coverage.",
      xactimateCode: "RFG NAIL",
      xactimateDescription:
        "Roofing nails - additional for high-wind nailing pattern",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Standard nailing is included in shingle installation",
      rebuttal:
        "IKO Dynasty ArmourZone requires precise nail placement in the reinforced nailing area. Standard shingle installation pricing assumes 4 nails per shingle. In high-wind zones (common in coastal MD, DE, VA), the 6-nail pattern is required by manufacturer specs and local code, increasing both material and labor costs. This is a legitimate separate line item. Improper nailing voids the wind warranty.",
      sourceSection:
        "IKO Dynasty Installation Instructions — ArmourZone Fastening",
      sourceUrl:
        "https://www.iko.com/na/residential-roofing/resources/technical-documents/",
    },
  ],
  warrantyTiers: [
    {
      tier: "Standard Limited Warranty",
      windCoverage: "110 mph",
      description:
        "Base warranty on shingles only. No special installer or accessory requirements beyond proper installation per IKO instructions.",
    },
    {
      tier: "Iron Clad Protection",
      windCoverage: "130 mph",
      installerRequirement: "IKO ROOFPRO Certified",
      requiredItems: [
        "IKO qualifying roofing system components",
      ],
      description:
        "Requires IKO ROOFPRO Certified installer and IKO system components for enhanced wind and material coverage.",
    },
    {
      tier: "PRO4 Advantage",
      windCoverage: "130 mph",
      installerRequirement: "IKO ROOFPRO Plus",
      requiredItems: [
        "Leading Edge Plus Starter Strip",
        "GoldShield or StormShield Ice & Water",
        "RoofGard-SC Underlayment",
        "UltraHP or Hip & Ridge 12 Ridge Cap",
        "Full IKO roofing system components",
      ],
      workmanshipCoverage: "15 years",
      description:
        "Most comprehensive IKO warranty. Requires IKO ROOFPRO Plus installer and full IKO system. Includes 15-year workmanship coverage.",
    },
  ],
};
