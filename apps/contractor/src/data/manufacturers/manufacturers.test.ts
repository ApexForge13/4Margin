import { describe, it, expect } from "vitest";
import {
  ALL_MANUFACTURERS,
  getManufacturer,
  getRequirementsForXactimateCode,
  getTotalRequirementCount,
  GAF,
  CERTAINTEED,
  OWENS_CORNING,
  IKO,
  ATLAS,
  TAMKO,
} from "./index";
import {
  MANUFACTURERS,
  JUSTIFICATION_MATRIX,
  getRequirementsForCode,
} from "../manufacturer-requirements";
import type { ManufacturerRequirement } from "../manufacturer-requirements";

// ── ALL_MANUFACTURERS Data Integrity ────────────────────────────────────

describe("ALL_MANUFACTURERS data integrity", () => {
  const expectedNames = [
    "GAF",
    "CertainTeed",
    "Owens Corning",
    "IKO",
    "Atlas",
    "Tamko",
  ];

  it("has exactly 6 manufacturers", () => {
    expect(Object.keys(ALL_MANUFACTURERS)).toHaveLength(6);
  });

  it("contains the expected 6 manufacturer names", () => {
    const keys = Object.keys(ALL_MANUFACTURERS).sort();
    expect(keys).toEqual([...expectedNames].sort());
  });

  it("each manufacturer has non-empty website", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      expect(mfr.website, `${name} missing website`).toBeTruthy();
      expect(
        mfr.website.startsWith("https://"),
        `${name} website should start with https://`
      ).toBe(true);
    }
  });

  it("each manufacturer has non-empty documentLibrary", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      expect(
        mfr.documentLibrary,
        `${name} missing documentLibrary`
      ).toBeTruthy();
      expect(
        mfr.documentLibrary.startsWith("https://"),
        `${name} documentLibrary should start with https://`
      ).toBe(true);
    }
  });

  it("each manufacturer has at least 1 installationRequirements entry", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      expect(
        mfr.installationRequirements.length,
        `${name} should have at least 1 requirement`
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

// ── Requirement Counts (snapshot for data-change detection) ─────────────

describe("requirement counts per manufacturer", () => {
  // These exact counts serve as intentional data-change detectors.
  // If a requirement is added or removed, update these counts deliberately.
  it("GAF has exactly 9 requirements", () => {
    expect(GAF.installationRequirements).toHaveLength(9);
  });

  it("CertainTeed has exactly 6 requirements", () => {
    expect(CERTAINTEED.installationRequirements).toHaveLength(6);
  });

  it("Owens Corning has exactly 9 requirements", () => {
    expect(OWENS_CORNING.installationRequirements).toHaveLength(9);
  });

  it("IKO has exactly 8 requirements", () => {
    expect(IKO.installationRequirements).toHaveLength(8);
  });

  it("Atlas has exactly 8 requirements", () => {
    expect(ATLAS.installationRequirements).toHaveLength(8);
  });

  it("TAMKO has exactly 8 requirements", () => {
    expect(TAMKO.installationRequirements).toHaveLength(8);
  });

  it("total requirements across all 6 manufacturers is 48", () => {
    const total = Object.values(ALL_MANUFACTURERS).reduce(
      (sum, mfr) => sum + mfr.installationRequirements.length,
      0
    );
    expect(total).toBe(48);
  });
});

// ── Individual Requirement Field Validation ─────────────────────────────

describe("every requirement has required non-empty fields", () => {
  const allRequirements: { name: string; req: ManufacturerRequirement }[] = [];

  for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
    for (const req of mfr.installationRequirements) {
      allRequirements.push({ name, req });
    }
  }

  it("every requirement has non-empty id", () => {
    for (const { name, req } of allRequirements) {
      expect(req.id, `${name} requirement missing id`).toBeTruthy();
    }
  });

  it("every requirement has non-empty requirement", () => {
    for (const { name, req } of allRequirements) {
      expect(
        req.requirement,
        `${req.id} in ${name} missing requirement`
      ).toBeTruthy();
    }
  });

  it("every requirement has non-empty description", () => {
    for (const { name, req } of allRequirements) {
      expect(
        req.description,
        `${req.id} in ${name} missing description`
      ).toBeTruthy();
    }
  });

  it("every requirement has non-empty xactimateCode", () => {
    for (const { name, req } of allRequirements) {
      expect(
        req.xactimateCode,
        `${req.id} in ${name} missing xactimateCode`
      ).toBeTruthy();
    }
  });

  it("every requirement has non-empty xactimateUnit", () => {
    for (const { name, req } of allRequirements) {
      expect(
        req.xactimateUnit,
        `${req.id} in ${name} missing xactimateUnit`
      ).toBeTruthy();
    }
  });

  it("every requirement has non-empty sourceUrl", () => {
    for (const { name, req } of allRequirements) {
      expect(
        req.sourceUrl,
        `${req.id} in ${name} missing sourceUrl`
      ).toBeTruthy();
    }
  });
});

// ── xactimateUnit Enum Validation ───────────────────────────────────────

describe("xactimateUnit values", () => {
  const validUnits = ["LF", "SQ", "EA", "SF", "RL"];

  it("every xactimateUnit is one of LF, SQ, EA, SF, RL", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        expect(
          validUnits,
          `${req.id} in ${name} has invalid xactimateUnit "${req.xactimateUnit}"`
        ).toContain(req.xactimateUnit);
      }
    }
  });
});

// ── mandatoryForWarranty Type Check ─────────────────────────────────────

describe("mandatoryForWarranty field", () => {
  it("every mandatoryForWarranty is a boolean", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        expect(
          typeof req.mandatoryForWarranty,
          `${req.id} in ${name} mandatoryForWarranty should be boolean`
        ).toBe("boolean");
      }
    }
  });
});

// ── No Duplicate Requirement IDs ────────────────────────────────────────

describe("requirement ID uniqueness", () => {
  it("no duplicate requirement IDs across ALL manufacturers", () => {
    const allIds: string[] = [];
    for (const mfr of Object.values(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        allIds.push(req.id);
      }
    }
    const uniqueIds = new Set(allIds);
    expect(
      uniqueIds.size,
      `Found duplicate IDs: ${allIds.filter((id, i) => allIds.indexOf(id) !== i).join(", ")}`
    ).toBe(allIds.length);
  });
});

// ── Requirement ID Format ───────────────────────────────────────────────

describe("requirement ID format", () => {
  const expectedPrefixes: Record<string, string> = {
    GAF: "GAF",
    CertainTeed: "CT",
    "Owens Corning": "OC",
    IKO: "IKO",
    Atlas: "ATLAS",
    Tamko: "TAMKO",
  };

  it("every requirement ID follows {PREFIX}-REQ-{NNN} pattern", () => {
    const pattern = /^[A-Z]+-REQ-\d{3}$/;
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        expect(
          pattern.test(req.id),
          `${req.id} in ${name} does not match {PREFIX}-REQ-{NNN}`
        ).toBe(true);
      }
    }
  });

  it("each manufacturer's requirements use the correct prefix", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      const prefix = expectedPrefixes[name];
      expect(prefix, `No expected prefix for ${name}`).toBeDefined();
      for (const req of mfr.installationRequirements) {
        expect(
          req.id.startsWith(`${prefix}-REQ-`),
          `${req.id} in ${name} should start with ${prefix}-REQ-`
        ).toBe(true);
      }
    }
  });
});

// ── sourceUrl Format ────────────────────────────────────────────────────

describe("sourceUrl format", () => {
  it("every sourceUrl starts with https://", () => {
    for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        expect(
          req.sourceUrl.startsWith("https://"),
          `${req.id} in ${name} sourceUrl "${req.sourceUrl}" should start with https://`
        ).toBe(true);
      }
    }
  });
});

// ── JUSTIFICATION_MATRIX ────────────────────────────────────────────────

describe("JUSTIFICATION_MATRIX data integrity", () => {
  const matrixKeys = Object.keys(JUSTIFICATION_MATRIX);

  it("has exactly 6 Xactimate code keys", () => {
    expect(matrixKeys).toHaveLength(6);
  });

  it("contains the expected 6 codes", () => {
    const expectedCodes = [
      "RFG STRP",
      "RFG DRIP",
      "RFG FELT+",
      "RFG FLSH",
      "RFG VENT+",
      "RFG FLCR",
    ];
    expect(matrixKeys.sort()).toEqual(expectedCodes.sort());
  });

  it("each entry has non-empty lineItem", () => {
    for (const [code, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      expect(
        entry.lineItem,
        `JUSTIFICATION_MATRIX["${code}"] missing lineItem`
      ).toBeTruthy();
    }
  });

  it("each entry has non-empty unit", () => {
    for (const [code, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      expect(
        entry.unit,
        `JUSTIFICATION_MATRIX["${code}"] missing unit`
      ).toBeTruthy();
    }
  });

  it("each entry has non-empty codeRequirement", () => {
    for (const [code, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      expect(
        entry.codeRequirement,
        `JUSTIFICATION_MATRIX["${code}"] missing codeRequirement`
      ).toBeTruthy();
    }
  });

  it("each justificationSources array has at least 2 entries (multi-manufacturer)", () => {
    for (const [code, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      expect(
        entry.justificationSources.length,
        `JUSTIFICATION_MATRIX["${code}"] should have >= 2 justificationSources`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("each sourceRef in justificationSources matches a real requirement ID", () => {
    // Build a set of all valid requirement IDs across all manufacturers
    const allValidIds = new Set<string>();
    for (const mfr of Object.values(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        allValidIds.add(req.id);
      }
    }

    for (const [code, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      for (const source of entry.justificationSources) {
        expect(
          allValidIds.has(source.sourceRef),
          `JUSTIFICATION_MATRIX["${code}"] sourceRef "${source.sourceRef}" does not match any requirement ID`
        ).toBe(true);
      }
    }
  });
});

// ── Lookup Functions ────────────────────────────────────────────────────

describe("getRequirementsForXactimateCode", () => {
  it('returns results from multiple manufacturers for "RFG STRP"', () => {
    const results = getRequirementsForXactimateCode("RFG STRP");
    // All 6 manufacturers have a starter strip requirement with code "RFG STRP"
    expect(results.length).toBeGreaterThanOrEqual(2);

    const manufacturers = results.map((r) => r.manufacturer);
    const uniqueManufacturers = new Set(manufacturers);
    expect(
      uniqueManufacturers.size,
      '"RFG STRP" should return results from multiple manufacturers'
    ).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for "FAKE CODE"', () => {
    const results = getRequirementsForXactimateCode("FAKE CODE");
    expect(results).toHaveLength(0);
  });

  it("includes manufacturer name alongside each requirement", () => {
    const results = getRequirementsForXactimateCode("RFG DRIP");
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.manufacturer).toBeTruthy();
      expect(result.requirement).toBeDefined();
      expect(result.requirement.id).toBeTruthy();
    }
  });
});

describe("getManufacturer", () => {
  it('returns GAF for "gaf" (case-insensitive)', () => {
    const result = getManufacturer("gaf");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.gaf.com");
  });

  it('returns GAF for "GAF"', () => {
    const result = getManufacturer("GAF");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.gaf.com");
  });

  it('returns Owens Corning for "oc" (alias)', () => {
    const result = getManufacturer("oc");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.owenscorning.com/roofing");
  });

  it('returns Owens Corning for "owens corning" (case-insensitive)', () => {
    const result = getManufacturer("owens corning");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.owenscorning.com/roofing");
  });

  it('returns CertainTeed for "ct" (alias)', () => {
    const result = getManufacturer("ct");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.certainteed.com");
  });

  it('returns CertainTeed for "certainteed" (case-insensitive)', () => {
    const result = getManufacturer("certainteed");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.certainteed.com");
  });

  it('returns Atlas for "atlas roofing" (alias)', () => {
    const result = getManufacturer("atlas roofing");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.atlasroofing.com");
  });

  it('returns TAMKO for "tamko building products" (alias)', () => {
    const result = getManufacturer("tamko building products");
    expect(result).toBeDefined();
    expect(result!.website).toBe("https://www.tamko.com");
  });

  it("returns undefined for unknown manufacturer", () => {
    const result = getManufacturer("unknown brand");
    expect(result).toBeUndefined();
  });
});

describe("getTotalRequirementCount", () => {
  it("returns 48", () => {
    expect(getTotalRequirementCount()).toBe(48);
  });
});

// ── Legacy vs New Function Inconsistency ────────────────────────────────
//
// CRITICAL INCONSISTENCY DOCUMENTATION:
//
// The legacy `getRequirementsForCode` (from manufacturer-requirements.ts)
// only searches MANUFACTURERS which contains GAF + CertainTeed (2 manufacturers).
//
// The new `getRequirementsForXactimateCode` (from manufacturers/index.ts)
// searches ALL_MANUFACTURERS which contains all 6 manufacturers.
//
// For any given Xactimate code, the all-6 version will return >= the legacy
// version's count. The legacy function should be deprecated in favor of
// the new one to avoid silently missing manufacturer requirements.
//

describe("legacy vs new lookup function inconsistency", () => {
  it("legacy MANUFACTURERS only has 2 entries (GAF + CertainTeed)", () => {
    expect(Object.keys(MANUFACTURERS)).toHaveLength(2);
    expect(Object.keys(MANUFACTURERS).sort()).toEqual(
      ["CertainTeed", "GAF"].sort()
    );
  });

  it('for "RFG STRP": all-6 version returns >= legacy version count', () => {
    const legacyResults = getRequirementsForCode("RFG STRP");
    const newResults = getRequirementsForXactimateCode("RFG STRP");
    expect(
      newResults.length,
      `New function (${newResults.length}) should return >= legacy (${legacyResults.length})`
    ).toBeGreaterThanOrEqual(legacyResults.length);
  });

  it('for "RFG DRIP": all-6 version returns >= legacy version count', () => {
    const legacyResults = getRequirementsForCode("RFG DRIP");
    const newResults = getRequirementsForXactimateCode("RFG DRIP");
    expect(
      newResults.length,
      `New function (${newResults.length}) should return >= legacy (${legacyResults.length})`
    ).toBeGreaterThanOrEqual(legacyResults.length);
  });

  it('for "RFG FLSH": all-6 version returns >= legacy version count', () => {
    const legacyResults = getRequirementsForCode("RFG FLSH");
    const newResults = getRequirementsForXactimateCode("RFG FLSH");
    expect(
      newResults.length,
      `New function (${newResults.length}) should return >= legacy (${legacyResults.length})`
    ).toBeGreaterThanOrEqual(legacyResults.length);
  });

  it("legacy getRequirementsForCode returns fewer results than getRequirementsForXactimateCode for codes present in all 6 manufacturers", () => {
    // "RFG STRP" is present in all 6 manufacturers
    const legacyCount = getRequirementsForCode("RFG STRP").length;
    const newCount = getRequirementsForXactimateCode("RFG STRP").length;

    // Legacy only searches GAF + CertainTeed, so it should return exactly 2
    expect(legacyCount).toBe(2);
    // New searches all 6, so it should return 6
    expect(newCount).toBe(6);

    // This proves the inconsistency: legacy misses 4 manufacturers
    expect(newCount - legacyCount).toBe(4);
  });
});
