// ── Owens Corning Installation Requirements ─────────────────────────────────
//
// Sourced from Owens Corning public installation instructions, warranty
// documents, and TotalProtection Roofing System requirements.
//
// Products covered: Duration, TruDefinition Duration, Duration STORM,
// Duration FLEX

import type { Manufacturer } from "../manufacturer-requirements";

export const OWENS_CORNING: Manufacturer = {
  type: "roofing",
  website: "https://www.owenscorning.com/roofing",
  documentLibrary:
    "https://www.owenscorning.com/roofing/tools/literature-library",
  productLines: [
    {
      name: "Duration",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "TruDefinition Duration",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
    },
    {
      name: "Duration STORM",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "Class 4 Impact Resistant",
    },
    {
      name: "Duration FLEX",
      type: "architectural_shingle",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "SureNail Technology",
    },
  ],
  installationRequirements: [
    {
      id: "OC-REQ-001",
      requirement: "Starter Strip (WeatherLock Starter Shingles)",
      description:
        "WeatherLock Starter Shingles required at eaves and rakes. Provides proper sealant adhesion for the first course and protects against wind uplift at roof edges. Required qualifying component for all TotalProtection Roofing System warranty tiers.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required for all TotalProtection warranty tiers. Without OC starter shingles, the roof does not qualify for enhanced warranty coverage.",
      xactimateCode: "RFG STRP",
      xactimateDescription: "Starter strip shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Starter strip included in labor",
      rebuttal:
        "Owens Corning requires OC starter shingles as a qualifying component for the TotalProtection Roofing System warranty. It is a separate material with separate labor, not included in shingle installation pricing. Without OC starter shingles, the homeowner loses enhanced warranty protection.",
      sourceSection:
        "Owens Corning Roofing & Asphalt Installation Instructions; TotalProtection Roofing System Requirements",
      sourceUrl:
        "https://www.owenscorning.com/roofing/total-protection-roofing-system",
    },
    {
      id: "OC-REQ-002",
      requirement: "Non-Corroding Metal Drip Edge",
      description:
        "Non-corroding metal drip edge required at eaves and rakes. Install under underlayment at eaves and over underlayment at rakes per proper installation sequence. Protects roof deck edges from water intrusion and provides clean finished appearance.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required per Owens Corning installation instructions for proper roofing system integration. Code-required per IRC R905.2.8.5.",
      xactimateCode: "RFG DRIP",
      xactimateDescription: "Drip edge - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing drip edge is reusable",
      rebuttal:
        "IRC R905.2.8.5 requires drip edge at eaves and gable rake edges. During tear-off, existing drip edge is bent, corroded, or improperly seated and cannot be reused. Owens Corning installation instructions specify drip edge installation sequence integral to the roofing system. Reusing compromised drip edge creates leak points and does not meet manufacturer installation requirements.",
      sourceSection:
        "Owens Corning Installation Instructions — Drip Edge section; IRC R905.2.8.5",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
    {
      id: "OC-REQ-003",
      requirement: "Ice & Water Barrier (WeatherLock)",
      description:
        "WeatherLock Self-Sealing Ice & Water Barrier required at eaves extending minimum 24 inches past interior wall line, in valleys, around penetrations, and at wall-to-roof intersections. Required qualifying component for TotalProtection Roofing System warranty.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "WeatherLock is a required qualifying component for the TotalProtection Roofing System. Without it, enhanced warranty coverage is not available.",
      xactimateCode: "RFG FELT+",
      xactimateDescription: "Ice & water barrier / leak barrier",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "IWS only required in cold climates",
      rebuttal:
        "Owens Corning requires WeatherLock at eaves, valleys, and penetrations regardless of climate zone for warranty compliance. MD/PA/DE are in climate zones requiring ice barrier per IRC R905.2.7.1. Even in areas where code does not mandate eave protection, OC requires ice and water barrier in valleys, around penetrations, and at wall intersections for proper system performance and warranty eligibility.",
      sourceSection:
        "Owens Corning Installation Instructions — Ice & Water Barrier section",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
    {
      id: "OC-REQ-004",
      requirement: "Underlayment (Deck Defense / ProArmor)",
      description:
        "Synthetic underlayment required over entire roof deck. Owens Corning Deck Defense or ProArmor recommended. ASTM D226 Type II equivalent accepted. Provides secondary weather protection and is required for UL fire rating maintenance.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Underlayment is required by Owens Corning for proper installation. OC-branded underlayment (Deck Defense or ProArmor) is a qualifying component for enhanced TotalProtection warranty tiers.",
      xactimateCode: "RFG FELT",
      xactimateDescription: "Roofing felt / synthetic underlayment",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Included in shingle labor",
      rebuttal:
        "Underlayment is a separate material line item, not included in shingle installation labor. It is required by Owens Corning installation instructions and IRC R905.2.3 for asphalt shingle installations. It is also required to maintain UL Class A fire rating.",
      sourceSection:
        "Owens Corning Installation Instructions — Underlayment section",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
    {
      id: "OC-REQ-005",
      requirement: "Ridge Cap (DecoRidge / RIZERidge)",
      description:
        "Owens Corning DecoRidge or RIZERidge hip and ridge shingles required at all hips and ridges. Purpose-built ridge cap products provide high-profile design and SealZone adhesion technology. Qualifying component for TotalProtection Roofing System warranty.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "OC ridge cap shingles are a required qualifying component for the TotalProtection Roofing System. Field-cut shingles do not meet OC warranty requirements.",
      xactimateCode: "RFG RIDG",
      xactimateDescription: "Ridge cap shingles",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: false,
      typicalAdjusterObjection:
        "Can use field shingles for ridge",
      rebuttal:
        "Owens Corning requires purpose-built ridge cap products (DecoRidge or RIZERidge) for warranty compliance. Field-cut shingles do not meet OC warranty requirements and lack the high-profile design and SealZone adhesion technology. Using field-cut shingles at hips and ridges voids enhanced warranty coverage.",
      sourceSection:
        "Owens Corning TotalProtection Roofing System — Required Components",
      sourceUrl:
        "https://www.owenscorning.com/roofing/total-protection-roofing-system",
    },
    {
      id: "OC-REQ-006",
      requirement: "Ventilation (VentSure)",
      description:
        "Adequate attic ventilation required per IRC R806.1. Owens Corning VentSure ridge vent is a qualifying component for enhanced TotalProtection warranty tiers. Proper ventilation extends shingle life and prevents moisture damage to roof deck and attic structure.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Adequate ventilation is required by OC for warranty. OC VentSure is a qualifying component for enhanced TotalProtection warranty tiers.",
      xactimateCode: "RFG VENT+",
      xactimateDescription: "Ridge vent",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing ventilation adequate",
      rebuttal:
        "During re-roof, ridge vent is removed during tear-off and must be replaced. Owens Corning requires adequate ventilation per IRC R806.1 for warranty compliance. OC VentSure is a qualifying component for enhanced TotalProtection warranty tiers. IRC R806.1 requires minimum 1 sq ft NFA per 150 sq ft of attic floor (or 1:300 with balanced intake/exhaust). If existing ventilation was inadequate, it must be brought to code during re-roof.",
      sourceSection:
        "Owens Corning Installation Instructions — Ventilation section; IRC R806.1",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
    {
      id: "OC-REQ-007",
      requirement: "Step Flashing at Wall Intersections",
      description:
        "New step flashing required at all roof-to-wall intersections. Minimum 4x4 inch L-shaped metal pieces, installed course-by-course with each shingle. Must be properly integrated with the roofing system for waterproof wall transitions.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Improper flashing installation voids warranty at those locations. Owens Corning installation instructions explicitly detail step flashing requirements at all wall intersections.",
      xactimateCode: "RFG FLSH",
      xactimateDescription: "Step flashing - aluminum",
      xactimateUnit: "LF",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing flashing reusable",
      rebuttal:
        "Owens Corning installation instructions require proper step flashing at all wall intersections for warranty compliance. During tear-off, step flashing is typically disturbed, bent, or removed and cannot be reused. IRC R905.2.8.3 requires base flashing and counter-flashing at wall intersections. Reusing compromised step flashing creates leak points and does not meet manufacturer installation requirements.",
      sourceSection:
        "Owens Corning Installation Instructions — Wall Flashing section",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
    {
      id: "OC-REQ-008",
      requirement: "SureNail Technology Fastening",
      description:
        "Duration shingles with SureNail Technology require nails placed in the engineered SureNail strip — the reinforced nailing zone. 4 nails standard, 6 nails in high-wind zones. Nails must hit the reinforced nailing zone, not above or below. Improper nail placement voids the wind warranty entirely.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "SureNail Technology requires precise nail placement in the engineered nailing strip. Improper nailing voids the wind warranty entirely. High-wind zones require 6-nail pattern.",
      xactimateCode: "RFG NAIL",
      xactimateDescription:
        "Roofing nails - additional for high-wind nailing pattern",
      xactimateUnit: "SQ",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Standard nailing is included",
      rebuttal:
        "Owens Corning Duration SureNail Technology requires precise nail placement in the engineered nailing strip. Standard shingle installation pricing assumes 4 nails per shingle. In high-wind zones (common in coastal MD, DE, VA), the 6-nail pattern is required by manufacturer specs and local code, increasing both material and labor costs. This is a legitimate separate line item. Improper nailing voids the wind warranty entirely.",
      sourceSection:
        "Owens Corning Duration Installation Instructions — SureNail Fastening section",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
    {
      id: "OC-REQ-009",
      requirement: "Chimney Cricket/Saddle Flashing",
      description:
        "Cricket (saddle) required on the ridge side of chimneys wider than 30 inches. Must extend minimum 6 inches up the chimney and be properly integrated with new roofing system. Required by building code IRC R903.2.2 and Owens Corning installation instructions.",
      mandatoryForWarranty: true,
      warrantyImpact:
        "Required by Owens Corning installation instructions and building code for chimneys over 30 inches wide. New flashing must integrate with new roofing system.",
      xactimateCode: "RFG FLCR",
      xactimateDescription: "Cricket/saddle flashing at chimney",
      xactimateUnit: "EA",
      commonlyMissedByAdjusters: true,
      typicalAdjusterObjection:
        "Existing cricket is adequate",
      rebuttal:
        "IRC R903.2.2 requires a cricket on the ridge side of chimneys more than 30 inches wide. During re-roof, chimney flashing including crickets must be replaced for proper integration with the new roofing system. Owens Corning installation instructions require new flashing at all penetrations. Reusing old cricket flashing with new shingles creates leak potential at the transition point.",
      sourceSection:
        "Owens Corning Installation Instructions — Chimney section; IRC R903.2.2",
      sourceUrl:
        "https://www.owenscorning.com/roofing/tools/literature-library",
    },
  ],
  warrantyTiers: [
    {
      tier: "Standard Limited Warranty",
      windCoverage: "110 mph",
      description:
        "Base warranty on shingles only. No special installer or accessory requirements beyond proper installation per OC instructions.",
    },
    {
      tier: "System Protection Limited Warranty",
      windCoverage: "130 mph",
      installerRequirement: "Owens Corning Certified installer",
      requiredItems: [
        "Minimum 3 Owens Corning qualifying components",
      ],
      description:
        "Requires OC Certified installer and minimum 3 OC qualifying components for enhanced wind and material coverage.",
    },
    {
      tier: "Preferred Protection Limited Warranty",
      windCoverage: "130 mph",
      installerRequirement: "Owens Corning Preferred installer",
      requiredItems: [
        "Full Owens Corning roofing system components",
      ],
      description:
        "Requires OC Preferred installer and full OC roofing system for extended coverage.",
    },
    {
      tier: "Platinum Protection Limited Warranty",
      windCoverage: "130 mph",
      installerRequirement: "Owens Corning Platinum Preferred installer",
      requiredItems: [
        "Full Owens Corning roofing system components",
      ],
      workmanshipCoverage: "50-year non-prorated",
      description:
        "Most comprehensive installer-tier warranty. Requires OC Platinum Preferred installer and full OC system. Includes 50-year non-prorated coverage.",
    },
    {
      tier: "TotalProtection Roofing System",
      windCoverage: "130 mph",
      requiredItems: [
        "WeatherLock Starter Shingles",
        "WeatherLock Ice & Water Barrier",
        "Deck Defense or ProArmor Underlayment",
        "DecoRidge or RIZERidge Ridge Cap",
        "VentSure Ridge Vent",
        "Duration Series Shingles",
      ],
      description:
        "Most comprehensive OC warranty — all Owens Corning components required. Provides complete system coverage when every qualifying component is used.",
    },
  ],
};
