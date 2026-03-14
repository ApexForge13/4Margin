// ── Complete Manufacturer Product Line Database ──────────────────────────────
//
// Comprehensive product line data for all 6 roofing shingle manufacturers.
// Used for quoting system, product selection, and warranty documentation.
//
// Sources: Official manufacturer websites, spec sheets, and warranty documents
// as of March 2026.
//
// NOTE: The existing ProductLine interface in manufacturer-requirements.ts is
// intentionally kept backward-compatible. This file provides an EXTENDED
// interface (ShingleProductLine) with full quoting data.

// ── Types ────────────────────────────────────────────────────────────────────

export type ShingleType =
  | "3-tab"
  | "architectural"
  | "premium_architectural"
  | "designer"
  | "luxury"
  | "impact_resistant"
  | "cool_roof";

export type PriceTier = "budget" | "mid-range" | "premium" | "ultra-premium";

export type ImpactClass = "Class 3" | "Class 4" | null;

export interface ShingleProductLine {
  /** Product name as marketed */
  name: string;
  /** Shingle type category */
  type: ShingleType;
  /** Warranty term (e.g., "Lifetime Limited", "50-year", "30-year") */
  warrantyTerm: string;
  /** Standard wind warranty speed */
  windWarranty: string;
  /** Enhanced wind warranty (with special installation/accessories) */
  windWarrantyEnhanced?: string;
  /** Algae resistance warranty */
  algaeResistanceWarranty: string;
  /** UL 2218 impact resistance rating, null if not IR-rated */
  impactResistance: ImpactClass;
  /** Approximate price tier for quoting */
  priceTier: PriceTier;
  /** Brief description of the product line */
  description: string;
  /** Whether product is currently available (not discontinued) */
  available: boolean;
}

export interface ManufacturerWarrantyTier {
  /** Tier name */
  name: string;
  /** Installer certification required */
  installerRequirement: string;
  /** Number of qualifying accessories required */
  requiredAccessories: number;
  /** Wind coverage at this tier */
  windCoverage: string;
  /** Workmanship coverage duration */
  workmanshipCoverage: string;
  /** Non-prorated coverage period */
  nonProratedPeriod: string;
  /** Whether warranty is transferable */
  transferable: boolean;
  /** Brief description */
  description: string;
}

export interface ManufacturerProductData {
  name: string;
  website: string;
  productLines: ShingleProductLine[];
  warrantyTiers: ManufacturerWarrantyTier[];
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. GAF
// ══════════════════════════════════════════════════════════════════════════════

export const GAF_PRODUCTS: ManufacturerProductData = {
  name: "GAF",
  website: "https://www.gaf.com",
  productLines: [
    // ── 3-Tab ──
    {
      name: "Royal Sovereign",
      type: "3-tab",
      warrantyTerm: "25-year Limited",
      windWarranty: "60 mph",
      windWarrantyEnhanced: "70 mph",
      algaeResistanceWarranty: "10-year StainGuard",
      impactResistance: null,
      priceTier: "budget",
      description:
        "America's best-selling 3-tab shingle. Traditional flat profile with clean lines.",
      available: true,
    },
    // ── Architectural (Timberline Series) ──
    {
      name: "Timberline NS",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "10-year StainGuard",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Natural Shadow shingles with subtle, even-toned architectural look. Classic wood warmth.",
      available: true,
    },
    {
      name: "Timberline HDZ",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "No max wind speed (WindProven)",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "America's #1 selling shingle. LayerLock technology, DuraGrip adhesive. WindProven eligible.",
      available: true,
    },
    {
      name: "Timberline HDZ RS",
      type: "cool_roof",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "No max wind speed (WindProven)",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Reflector Series with solar-reflective granules. ENERGY STAR qualified. Title 24 compliant.",
      available: true,
    },
    {
      name: "Timberline CS",
      type: "cool_roof",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "10-year StainGuard",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Cool Series with reflective granules reducing heat transfer. ENERGY STAR and Title 24 compliant.",
      available: true,
    },
    {
      name: "Timberline AS II",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "No max wind speed (WindProven)",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "ArmorShield II impact-resistant architectural shingle. UL 2218 Class 4. WindProven eligible.",
      available: true,
    },
    // ── Premium Architectural ──
    {
      name: "Timberline UHDZ",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "No max wind speed (WindProven)",
      algaeResistanceWarranty: "30-year StainGuard Plus PRO",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Ultra HD with 53% more thickness than standard architectural. 10% more algae-fighting capsules.",
      available: true,
    },
    // ── Designer / Luxury ──
    {
      name: "Camelot II",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Artisan-crafted luxury shingle with Old World European styling. Antique slate appearance.",
      available: true,
    },
    {
      name: "Slateline",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Authentic natural slate aesthetic with dramatic shadow lines.",
      available: true,
    },
    {
      name: "Woodland",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Hand-cut wood shingle look with dimensional thickness and rustic charm.",
      available: true,
    },
    {
      name: "Grand Sequoia",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Ultra-premium wood shake look with extra-large, rugged tabs and deep shadow lines.",
      available: true,
    },
    {
      name: "Grand Sequoia AS",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: "Class 4",
      priceTier: "ultra-premium",
      description:
        "Grand Sequoia with ArmorShield Class 4 impact resistance. UL 2218 rated.",
      available: true,
    },
    {
      name: "Grand Sequoia RS",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Grand Sequoia Reflector Series with solar-reflective granules for cool roofing.",
      available: true,
    },
    {
      name: "Grand Canyon",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Rugged cedar shake aesthetic with thick, multi-layered construction.",
      available: true,
    },
    {
      name: "Glenwood",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Triple-layer construction replicating authentic wood shakes. GAF's thickest shingle.",
      available: true,
    },
    {
      name: "Monaco",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StainGuard Plus",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Old World European elegance with scalloped, slate-inspired design.",
      available: true,
    },
  ],
  warrantyTiers: [
    {
      name: "Standard Shingle Warranty",
      installerRequirement: "Any contractor",
      requiredAccessories: 0,
      windCoverage: "110 mph (4 nails) / 130 mph (special installation)",
      workmanshipCoverage: "None",
      nonProratedPeriod: "10 years (Smart Choice Protection)",
      transferable: true,
      description:
        "Base warranty on shingles only. No system components required.",
    },
    {
      name: "System Plus",
      installerRequirement: "GAF Certified Contractor",
      requiredAccessories: 3,
      windCoverage: "130 mph",
      workmanshipCoverage: "2 years",
      nonProratedPeriod: "50 years (Smart Choice Protection)",
      transferable: true,
      description:
        "Lifetime Shingles + 3 qualifying accessories. Includes tear-off coverage.",
    },
    {
      name: "Silver Pledge",
      installerRequirement: "GAF Certified Contractor",
      requiredAccessories: 4,
      windCoverage: "130 mph",
      workmanshipCoverage: "10 years",
      nonProratedPeriod: "50 years (Smart Choice Protection)",
      transferable: true,
      description:
        "Lifetime Shingles + 4 qualifying accessories. 10-year workmanship + disposal.",
    },
    {
      name: "Golden Pledge",
      installerRequirement: "GAF Master Elite Contractor",
      requiredAccessories: 5,
      windCoverage: "130 mph",
      workmanshipCoverage: "25 years (varies by shingle type: 20-30 years)",
      nonProratedPeriod: "50 years (Smart Choice Protection)",
      transferable: true,
      description:
        "GAF's top warranty tier. Lifetime Shingles + 5 qualifying accessories. Master Elite only (top 2% of contractors).",
    },
    {
      name: "WindProven",
      installerRequirement: "GAF Master Elite Contractor",
      requiredAccessories: 4,
      windCoverage: "No maximum wind speed limitation",
      workmanshipCoverage: "Included with Golden Pledge",
      nonProratedPeriod: "15 years (WindProven wind coverage)",
      transferable: true,
      description:
        "Industry's first unlimited wind speed warranty. Requires LayerLock shingles + 4 accessories + 6-nail installation.",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. CertainTeed
// ══════════════════════════════════════════════════════════════════════════════

export const CERTAINTEED_PRODUCTS: ManufacturerProductData = {
  name: "CertainTeed",
  website: "https://www.certainteed.com",
  productLines: [
    // ── 3-Tab ──
    {
      name: "XT 25",
      type: "3-tab",
      warrantyTerm: "25-year Limited",
      windWarranty: "60 mph",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "budget",
      description:
        "Traditional 3-tab shingle with Class A fire rating. 5-year SureStart protection.",
      available: true,
    },
    // ── Architectural (Landmark Series) ──
    {
      name: "Landmark",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (with starter + ridge) / 160 mph (5-Star)",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "CertainTeed's most popular architectural shingle. Wood shake look with NailTrak nailing area.",
      available: true,
    },
    {
      name: "Landmark Pro",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (with starter + ridge) / 160 mph (5-Star)",
      algaeResistanceWarranty: "30-year StreakFighter",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Two laminated layers for dimensional wood shake appearance. Max Def colors. 10-year SureStart.",
      available: true,
    },
    {
      name: "Landmark Pro Solaris",
      type: "cool_roof",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "30-year StreakFighter",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Cool roof version of Landmark Pro with solar-reflective granules. Energy Star qualified.",
      available: true,
    },
    {
      name: "Landmark Premium",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "30-year StreakFighter",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Multi-layer design with superior depth and dimension. Self-sealing adhesive + NailTrak.",
      available: true,
    },
    {
      name: "Landmark TL",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "30-year StreakFighter",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Triple Laminate construction for maximum thickness and dramatic shadow lines.",
      available: true,
    },
    // ── Impact Resistant ──
    {
      name: "Landmark ClimateFlex",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "Class 4 impact-rated architectural shingle. Wood shake look with hail resistance.",
      available: true,
    },
    {
      name: "NorthGate ClimateFlex",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "SBS-modified polymer technology for Class 4 impact resistance. Superior flexibility in cold.",
      available: true,
    },
    // ── Designer / Luxury ──
    {
      name: "Highland Slate",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Authentic natural slate appearance with subtle color variations and textures.",
      available: true,
    },
    {
      name: "Arcadia Shake",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Rustic wood shake appearance with weathered textures and natural character.",
      available: true,
    },
    {
      name: "Belmont",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Luxury laminated shingle with deep dimensional profile and rich color blends.",
      available: true,
    },
    {
      name: "Carriage House",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Multi-layered luxury shingle with hand-crafted wood shake aesthetic.",
      available: true,
    },
    {
      name: "Grand Manor",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "CertainTeed's flagship luxury shingle. Multi-layered natural slate replication with maximum depth.",
      available: true,
    },
    {
      name: "Presidential Shake",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph",
      algaeResistanceWarranty: "25-year StreakFighter",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Thick, rugged wood shake aesthetic with bold shadow lines and natural character.",
      available: true,
    },
  ],
  warrantyTiers: [
    {
      name: "Standard Limited Warranty",
      installerRequirement: "Any contractor",
      requiredAccessories: 0,
      windCoverage: "110 mph",
      workmanshipCoverage: "None",
      nonProratedPeriod: "10-year SureStart",
      transferable: true,
      description:
        "Base warranty with 10-year non-prorated SureStart protection.",
    },
    {
      name: "3-Star SureStart Plus",
      installerRequirement: "CertainTeed ShingleMaster",
      requiredAccessories: 3,
      windCoverage: "130 mph",
      workmanshipCoverage: "None",
      nonProratedPeriod: "20 years non-prorated",
      transferable: true,
      description:
        "Integrity Roof System + ShingleMaster installer. Extends non-prorated to 20 years.",
    },
    {
      name: "4-Star SureStart Plus",
      installerRequirement: "CertainTeed Select ShingleMaster",
      requiredAccessories: 4,
      windCoverage: "130 mph",
      workmanshipCoverage: "None",
      nonProratedPeriod: "50 years non-prorated",
      transferable: true,
      description:
        "Full Integrity Roof System. Extends non-prorated to 50 years.",
    },
    {
      name: "5-Star SureStart Plus",
      installerRequirement: "CertainTeed Select ShingleMaster",
      requiredAccessories: 5,
      windCoverage: "160 mph",
      workmanshipCoverage: "25 years",
      nonProratedPeriod: "50 years non-prorated",
      transferable: true,
      description:
        "Highest tier. 50-year non-prorated + 25-year workmanship. 160 mph wind coverage.",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. Owens Corning
// ══════════════════════════════════════════════════════════════════════════════

export const OWENS_CORNING_PRODUCTS: ManufacturerProductData = {
  name: "Owens Corning",
  website: "https://www.owenscorning.com",
  productLines: [
    // ── 3-Tab ──
    {
      name: "Supreme",
      type: "3-tab",
      warrantyTerm: "25-year Limited",
      windWarranty: "60 mph",
      algaeResistanceWarranty: "None",
      impactResistance: null,
      priceTier: "budget",
      description:
        "Economy 3-tab shingle with Class A fire rating. Basic wind and weather protection.",
      available: true,
    },
    // ── Architectural ──
    {
      name: "Oakridge",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (with starter + 6 nails)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Artisan colors with dimensional wood-shake look. Good entry-level architectural shingle.",
      available: true,
    },
    {
      name: "TruDefinition Duration",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: "Class 3",
      priceTier: "mid-range",
      description:
        "OC's flagship architectural shingle. SureNail Technology for 130 mph wind. TruDefinition color platform.",
      available: true,
    },
    {
      name: "Duration Premium Cool",
      type: "cool_roof",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Solar-reflective granules for energy efficiency. ENERGY STAR qualified. Title 24 compliant.",
      available: true,
    },
    // ── Impact Resistant ──
    {
      name: "Duration FLEX",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "SBS polymer-modified for Class 4 impact resistance. SureNail + WeatherGuard Technology.",
      available: true,
    },
    {
      name: "Duration STORM",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "Class 4 impact resistance with WeatherGuard Technology. UL 2218 rated for hail protection.",
      available: true,
    },
    // ── Designer / Luxury ──
    {
      name: "Woodcrest",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Rustic wood shake appearance with bold shadow lines and rich color depth.",
      available: true,
    },
    {
      name: "Woodmoor",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: "Class 4",
      priceTier: "ultra-premium",
      description:
        "OC's thickest and heaviest shingle. Wood shake look with Class 4 impact resistance.",
      available: true,
    },
    {
      name: "Berkshire",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "25-year StreakGuard",
      impactResistance: null,
      priceTier: "ultra-premium",
      description:
        "Natural slate appearance with large tabs and unique shadow lines. Premium 5-color palette.",
      available: true,
    },
  ],
  warrantyTiers: [
    {
      name: "Standard Protection",
      installerRequirement: "Any contractor",
      requiredAccessories: 0,
      windCoverage: "110 mph / 130 mph (Duration series)",
      workmanshipCoverage: "None",
      nonProratedPeriod: "10 years",
      transferable: true,
      description:
        "Base warranty on shingles. Coverage varies by product line.",
    },
    {
      name: "System Protection",
      installerRequirement: "Any contractor",
      requiredAccessories: 3,
      windCoverage: "130 mph",
      workmanshipCoverage: "None",
      nonProratedPeriod: "Lifetime",
      transferable: true,
      description:
        "Total Protection Roofing System with 3+ qualifying OC components.",
    },
    {
      name: "Preferred Protection",
      installerRequirement: "Owens Corning Preferred Contractor",
      requiredAccessories: 3,
      windCoverage: "130 mph",
      workmanshipCoverage: "10 years",
      nonProratedPeriod: "Lifetime",
      transferable: true,
      description:
        "Preferred Contractor installation + Total Protection System. 10-year workmanship.",
    },
    {
      name: "Platinum Protection",
      installerRequirement: "Owens Corning Platinum Preferred Contractor",
      requiredAccessories: 4,
      windCoverage: "130 mph",
      workmanshipCoverage: "Lifetime (25 years full, prorated after)",
      nonProratedPeriod: "50 years",
      transferable: true,
      description:
        "OC's top warranty. Platinum Preferred Contractor only (<1% of contractors). Lifetime workmanship backed by manufacturer.",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. IKO
// ══════════════════════════════════════════════════════════════════════════════

export const IKO_PRODUCTS: ManufacturerProductData = {
  name: "IKO",
  website: "https://www.iko.com/na",
  productLines: [
    // ── 3-Tab ──
    {
      name: "Marathon Plus AR",
      type: "3-tab",
      warrantyTerm: "25-year Limited",
      windWarranty: "60 mph",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "budget",
      description:
        "Traditional 3-tab shingle with algae resistance. Fiberglass mat core.",
      available: true,
    },
    // ── Architectural ──
    {
      name: "Cambridge",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (6 nails)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: "Class 3",
      priceTier: "mid-range",
      description:
        "Classic wood-shake look with TrueSquare Advantage sizing. Now upgraded to Class 3 impact (2025).",
      available: true,
    },
    {
      name: "Cambridge Cool Colors Plus",
      type: "cool_roof",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (6 nails)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: "Class 3",
      priceTier: "mid-range",
      description:
        "Solar-reflective Cambridge variant. SRI 20+ for California Title 24 compliance.",
      available: true,
    },
    // ── Performance ──
    {
      name: "Dynasty",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "Lifetime algae resistance",
      impactResistance: "Class 3",
      priceTier: "mid-range",
      description:
        "Performance shingle with ArmourZone nailing area, polymer-modified asphalt. 130 mph standard.",
      available: true,
    },
    {
      name: "Dynasty Cool Colors Plus",
      type: "cool_roof",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "Lifetime algae resistance",
      impactResistance: "Class 3",
      priceTier: "premium",
      description:
        "Cool roof version of Dynasty with solar-reflective granules. Title 24 compliant.",
      available: true,
    },
    {
      name: "Nordic",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "Lifetime algae resistance",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "IKO's highest-rated impact shingle. Class 4 UL 2218. Polymer-modified asphalt + ArmourZone.",
      available: true,
    },
    // ── Performance Designer ──
    {
      name: "Armourshake",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (6 nails)",
      algaeResistanceWarranty: "Lifetime algae resistance",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "Performance designer shingle with rustic shake look. Class 4 impact rated.",
      available: true,
    },
    {
      name: "Royal Estate",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (6 nails)",
      algaeResistanceWarranty: "Lifetime algae resistance",
      impactResistance: "Class 4",
      priceTier: "ultra-premium",
      description:
        "Luxury slate-look designer shingle with Class 4 impact resistance.",
      available: true,
    },
    {
      name: "Crowne Slate",
      type: "luxury",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (6 nails)",
      algaeResistanceWarranty: "Lifetime algae resistance",
      impactResistance: "Class 4",
      priceTier: "ultra-premium",
      description:
        "IKO's flagship luxury shingle. Premium natural slate aesthetic with Class 4 impact rating.",
      available: true,
    },
  ],
  warrantyTiers: [
    {
      name: "Standard Limited Warranty",
      installerRequirement: "Any contractor",
      requiredAccessories: 0,
      windCoverage: "60-130 mph (varies by product)",
      workmanshipCoverage: "None",
      nonProratedPeriod: "15 years (Iron Clad Protection)",
      transferable: true,
      description:
        "Base warranty with 15-year Iron Clad non-prorated period (180 months). Among the longest in industry.",
    },
    {
      name: "ROOFPRO Extended Iron Clad",
      installerRequirement: "IKO ROOFPRO Contractor",
      requiredAccessories: 3,
      windCoverage: "130 mph",
      workmanshipCoverage: "Included with ROOFPRO tiers",
      nonProratedPeriod: "Extended (varies by tier)",
      transferable: true,
      description:
        "Requires 3+ IKO PROFORMAX accessories installed by ROOFPRO contractor. Extended Iron Clad coverage.",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 5. Atlas
// ══════════════════════════════════════════════════════════════════════════════

export const ATLAS_PRODUCTS: ManufacturerProductData = {
  name: "Atlas",
  website: "https://www.atlasroofing.com",
  productLines: [
    // ── 3-Tab ──
    {
      name: "GlassMaster",
      type: "3-tab",
      warrantyTerm: "30-year Limited",
      windWarranty: "60 mph",
      algaeResistanceWarranty: "None",
      impactResistance: null,
      priceTier: "budget",
      description:
        "Budget 3-tab shingle. Basic weather protection with 30-year warranty.",
      available: true,
    },
    // ── Architectural ──
    {
      name: "ProLam",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "None",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Entry-level architectural shingle with distinct texture and shadow lines.",
      available: true,
    },
    {
      name: "Castlebrook",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "None",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Elegant architectural look in seven colors with strong wind protection.",
      available: true,
    },
    {
      name: "Briarwood Pro",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "None",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Seven high-definition color options with architectural profile.",
      available: true,
    },
    {
      name: "Legend",
      type: "architectural",
      warrantyTerm: "40-year Limited",
      windWarranty: "110 mph",
      algaeResistanceWarranty: "40-year Scotchgard Protector",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Mid-range architectural with 3M Scotchgard Protector algae resistance. 40-year warranty.",
      available: true,
    },
    {
      name: "Pinnacle Pristine",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      algaeResistanceWarranty: "Lifetime Scotchgard Protector",
      impactResistance: "Class 3",
      priceTier: "mid-range",
      description:
        "Atlas's most popular shingle. Lifetime Scotchgard algae resistance. HP42 Technology, Sweet Spot nailing.",
      available: true,
    },
    // ── Impact Resistant ──
    {
      name: "Pinnacle Impact",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "150 mph (6 nails + Pro-Cut starter)",
      algaeResistanceWarranty: "Lifetime Scotchgard Protector",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "Class 4 impact-rated version of Pinnacle. HP42 Technology + Scotchgard Protector.",
      available: true,
    },
    {
      name: "StormMaster Shake",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "150 mph (6 nails + Pro-Cut starter)",
      algaeResistanceWarranty: "Lifetime Scotchgard Protector",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "Premium impact-resistant shingle with Core4 polymer-modified technology. Wood shake aesthetic.",
      available: true,
    },
    {
      name: "StormMaster Slate",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "150 mph (6 nails + Pro-Cut starter)",
      algaeResistanceWarranty: "Lifetime Scotchgard Protector",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "Premium impact-resistant shingle with Core4 technology. Natural slate look with Class 4 rating.",
      available: true,
    },
  ],
  warrantyTiers: [
    {
      name: "Standard Limited Warranty",
      installerRequirement: "Any contractor",
      requiredAccessories: 0,
      windCoverage: "110-130 mph (varies by product)",
      workmanshipCoverage: "None",
      nonProratedPeriod: "10 years (GlassMaster) / 15 years (Pinnacle) / 20 years (StormMaster)",
      transferable: true,
      description:
        "Base warranty on shingles. Non-prorated period varies by product tier.",
    },
    {
      name: "Signature Select System Warranty",
      installerRequirement: "Atlas PRO+ Contractor",
      requiredAccessories: 3,
      windCoverage: "130-150 mph",
      workmanshipCoverage: "Included at higher contractor tiers",
      nonProratedPeriod: "Extended (varies by contractor tier)",
      transferable: true,
      description:
        "Requires Atlas shingles + 3 qualifying Atlas accessories (underlayment, starter, hip & ridge). Atlas PRO+ contractor required.",
    },
    {
      name: "Atlas PRO+ Platinum Select",
      installerRequirement: "Atlas PRO+ Platinum Select Contractor",
      requiredAccessories: 3,
      windCoverage: "150 mph",
      workmanshipCoverage: "20 years (StormMaster) / 15 years (Pinnacle) / 10 years (GlassMaster)",
      nonProratedPeriod: "Extended to match workmanship coverage",
      transferable: true,
      description:
        "Highest Atlas contractor tier. Full Signature Select System with maximum workmanship coverage.",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 6. TAMKO
// ══════════════════════════════════════════════════════════════════════════════

export const TAMKO_PRODUCTS: ManufacturerProductData = {
  name: "Tamko",
  website: "https://www.tamko.com",
  productLines: [
    // ── 3-Tab ──
    {
      name: "Elite Glass-Seal",
      type: "3-tab",
      warrantyTerm: "30-year Limited",
      windWarranty: "60 mph",
      windWarrantyEnhanced: "130 mph (15 years, WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "budget",
      description:
        "Economy 3-tab with 30-year warranty and 15-year full-start period. Class A fire rated.",
      available: true,
    },
    // ── Architectural (Heritage Series) ──
    {
      name: "Heritage",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph (high-wind application) / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "TAMKO's core architectural shingle. 4-5 layers of coverage. 20-year full-start period.",
      available: true,
    },
    {
      name: "Heritage Woodgate",
      type: "architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year StreakGuard algae resistance",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Rugged wood shake appearance with bold contrasts. StreakGuard algae protection.",
      available: true,
    },
    {
      name: "Heritage Premium",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "mid-range",
      description:
        "Enhanced Heritage with premium color blends and deeper shadow lines.",
      available: true,
    },
    {
      name: "Heritage Vintage",
      type: "premium_architectural",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Top of Heritage line. Rich vintage colors with weathered character appearance.",
      available: true,
    },
    // ── Impact Resistant ──
    {
      name: "Heritage IR",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year StreakGuard algae resistance",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "SBS modified asphalt for Class 4 impact resistance. Enhanced flexibility and durability.",
      available: true,
    },
    {
      name: "Titan XT",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year StreakGuard algae resistance",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "TAMKO's top impact-resistant shingle. StormFighter IR technology with Class 4 rating.",
      available: true,
    },
    {
      name: "HailGuard",
      type: "impact_resistant",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "130 mph",
      windWarrantyEnhanced: "160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: "Class 4",
      priceTier: "premium",
      description:
        "New 2026 product. Industry's first shingle with a hail warranty. ImpactCore polymer-modified asphalt. Cold-weather install to 25F.",
      available: true,
    },
    // ── Specialty ──
    {
      name: "Rustic Slate",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Natural slate aesthetic with multi-tonal color blends and textured surface.",
      available: true,
    },
    {
      name: "Lamarite",
      type: "designer",
      warrantyTerm: "Lifetime Limited",
      windWarranty: "110 mph",
      windWarrantyEnhanced: "130 mph / 160 mph (TAMKO Complete WindGuard)",
      algaeResistanceWarranty: "10-year algae resistance",
      impactResistance: null,
      priceTier: "premium",
      description:
        "Designer laminated shingle with rich color variations and dimensional profile.",
      available: true,
    },
  ],
  warrantyTiers: [
    {
      name: "Standard Limited Warranty",
      installerRequirement: "Any contractor",
      requiredAccessories: 0,
      windCoverage: "110 mph standard / 130 mph (high-wind install)",
      workmanshipCoverage: "None",
      nonProratedPeriod: "15-year full-start (Elite Glass-Seal) / 20-year (Heritage series)",
      transferable: true,
      description:
        "Base warranty. Transferable once within 2 years (Elite) or 5 years (Heritage series).",
    },
    {
      name: "HeritageShield Enhanced",
      installerRequirement: "TAMKO Pro Certified Contractor",
      requiredAccessories: 0,
      windCoverage: "130 mph",
      workmanshipCoverage: "15 years",
      nonProratedPeriod: "15 years",
      transferable: true,
      description:
        "Entry-level enhanced warranty with 15-year workmanship coverage.",
    },
    {
      name: "ProShield Enhanced",
      installerRequirement: "TAMKO Pro Certified Contractor",
      requiredAccessories: 0,
      windCoverage: "130 mph",
      workmanshipCoverage: "20 years",
      nonProratedPeriod: "20 years",
      transferable: true,
      description:
        "Mid-tier enhanced warranty with 20-year workmanship. WxtShield upgrade available with 3+ accessories.",
    },
    {
      name: "MasterShield Enhanced",
      installerRequirement: "TAMKO MasterCraft Pro Certified Contractor",
      requiredAccessories: 0,
      windCoverage: "130 mph",
      workmanshipCoverage: "30 years",
      nonProratedPeriod: "30 years",
      transferable: true,
      description:
        "Highest TAMKO warranty tier. 30-year workmanship. MasterCraft Pro Certified only.",
    },
    {
      name: "WindGuard Extended Wind Warranty",
      installerRequirement: "TAMKO Pro Certified Contractor",
      requiredAccessories: 3,
      windCoverage: "160 mph",
      workmanshipCoverage: "Per base enhanced warranty tier",
      nonProratedPeriod: "Per base enhanced warranty tier",
      transferable: true,
      description:
        "Add-on wind warranty. Requires TAMKO Complete roofing system (shingles + 3 TAMKO accessory categories).",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// Unified Access
// ══════════════════════════════════════════════════════════════════════════════

export const ALL_PRODUCT_DATA: Record<string, ManufacturerProductData> = {
  GAF: GAF_PRODUCTS,
  CertainTeed: CERTAINTEED_PRODUCTS,
  "Owens Corning": OWENS_CORNING_PRODUCTS,
  IKO: IKO_PRODUCTS,
  Atlas: ATLAS_PRODUCTS,
  Tamko: TAMKO_PRODUCTS,
};

/**
 * Get all product lines across all manufacturers, optionally filtered.
 */
export function getAllProductLines(filter?: {
  type?: ShingleType;
  priceTier?: PriceTier;
  impactResistant?: boolean;
  manufacturer?: string;
}): { manufacturer: string; product: ShingleProductLine }[] {
  const results: { manufacturer: string; product: ShingleProductLine }[] = [];

  for (const [name, data] of Object.entries(ALL_PRODUCT_DATA)) {
    if (filter?.manufacturer && name !== filter.manufacturer) continue;

    for (const product of data.productLines) {
      if (!product.available) continue;
      if (filter?.type && product.type !== filter.type) continue;
      if (filter?.priceTier && product.priceTier !== filter.priceTier) continue;
      if (
        filter?.impactResistant !== undefined &&
        filter.impactResistant !== (product.impactResistance !== null)
      )
        continue;

      results.push({ manufacturer: name, product });
    }
  }

  return results;
}

/**
 * Get warranty tiers for a specific manufacturer.
 */
export function getWarrantyTiers(
  manufacturer: string
): ManufacturerWarrantyTier[] {
  const normalized = manufacturer.toLowerCase().trim();
  const aliases: Record<string, string> = {
    gaf: "GAF",
    certainteed: "CertainTeed",
    "certain teed": "CertainTeed",
    "owens corning": "Owens Corning",
    owenscorning: "Owens Corning",
    oc: "Owens Corning",
    iko: "IKO",
    atlas: "Atlas",
    tamko: "Tamko",
  };

  const key = aliases[normalized] || manufacturer;
  return ALL_PRODUCT_DATA[key]?.warrantyTiers ?? [];
}

/**
 * Get total product count across all manufacturers.
 */
export function getTotalProductCount(): number {
  return Object.values(ALL_PRODUCT_DATA).reduce(
    (sum, data) => sum + data.productLines.filter((p) => p.available).length,
    0
  );
}
