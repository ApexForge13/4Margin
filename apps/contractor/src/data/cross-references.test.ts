import { describe, it, expect } from "vitest";

// ── Building Codes ──────────────────────────────────────────────────────────
import {
  BUILDING_CODES,
  validateIrcReference,
} from "./building-codes";

// ── County Jurisdictions ────────────────────────────────────────────────────
import { ALL_COUNTIES } from "./county-jurisdictions";

// ── Manufacturer Data ───────────────────────────────────────────────────────
import {
  ALL_MANUFACTURERS,
  getRequirementsForXactimateCode,
} from "./manufacturers/index";
import {
  MANUFACTURERS,
  JUSTIFICATION_MATRIX,
} from "./manufacturer-requirements";

// ── Carrier Data (re-exported from @4margin/policy-engine) ──────────────────
import {
  CARRIER_PROFILES,
  CARRIER_CODE_OBJECTIONS,
  CARRIER_ENDORSEMENT_FORMS,
} from "./policy-knowledge";

// =============================================================================
// 1. Carrier -> Code Cross-Reference
//    Every CarrierCodeObjection.ircSection should have a matching
//    BuildingCode.section in BUILDING_CODES (or a close parent/child match).
// =============================================================================

describe("Carrier -> Code cross-reference", () => {
  it("every CarrierCodeObjection.ircSection matches a BUILDING_CODES section (exact or parent)", () => {
    const nonGeneralObjections = CARRIER_CODE_OBJECTIONS.filter(
      (obj) => obj.ircSection !== "general"
    );

    const mismatches: string[] = [];

    for (const obj of nonGeneralObjections) {
      // Use validateIrcReference which does fuzzy parent/child matching
      // We test against all three states since any state match is valid
      const matchMD = validateIrcReference(obj.ircSection, "MD");
      const matchPA = validateIrcReference(obj.ircSection, "PA");
      const matchDE = validateIrcReference(obj.ircSection, "DE");

      if (!matchMD && !matchPA && !matchDE) {
        mismatches.push(
          `${obj.carrierName} -> IRC ${obj.ircSection}: no matching BuildingCode found`
        );
      }
    }

    expect(
      mismatches,
      `${mismatches.length} carrier code objections reference IRC sections not in BUILDING_CODES:\n${mismatches.join("\n")}`
    ).toHaveLength(0);
  });

  it("R905.1.2 (ice barrier) is now in BUILDING_CODES and referenced by 5 carriers", () => {
    const r90512Objections = CARRIER_CODE_OBJECTIONS.filter(
      (obj) => obj.ircSection === "R905.1.2"
    );
    // 5 carriers reference R905.1.2: State Farm, Nationwide, Allstate, Erie, Farmers
    expect(r90512Objections).toHaveLength(5);

    // Confirm it IS in BUILDING_CODES (gap resolved)
    const match = validateIrcReference("R905.1.2", "MD");
    expect(match).not.toBeNull();
    expect(match!.section).toBe("R905.1.2");
  });

  it('"general" ircSection entries exist and are valid catch-all entries', () => {
    const generalObjections = CARRIER_CODE_OBJECTIONS.filter(
      (obj) => obj.ircSection === "general"
    );

    // There should be some "general" entries (permits, dumpster, etc.)
    expect(generalObjections.length).toBeGreaterThan(0);

    // Each should have a valid carrier
    for (const obj of generalObjections) {
      expect(obj.carrierName).toBeTruthy();
      expect(obj.typicalObjection).toBeTruthy();
      expect(obj.effectiveRebuttal).toBeTruthy();
    }
  });
});

// =============================================================================
// 2. Carrier -> Endorsement Cross-Reference
//    Every unique carrier in CARRIER_ENDORSEMENT_FORMS should match a
//    CarrierProfile.name in CARRIER_PROFILES.
// =============================================================================

describe("Carrier -> Endorsement cross-reference", () => {
  it("every carrier in CARRIER_ENDORSEMENT_FORMS matches a CarrierProfile name", () => {
    const endorsementCarriers = [
      ...new Set(CARRIER_ENDORSEMENT_FORMS.map((f) => f.carrier)),
    ];
    const profileNames = CARRIER_PROFILES.map((p) => p.name);

    const missingProfiles: string[] = [];

    for (const carrier of endorsementCarriers) {
      if (!profileNames.includes(carrier)) {
        missingProfiles.push(carrier);
      }
    }

    expect(
      missingProfiles,
      `Endorsement form carriers without matching profiles: ${missingProfiles.join(", ")}`
    ).toHaveLength(0);
  });

  it("every CarrierProfile has at least one endorsement form", () => {
    const endorsementCarriers = new Set(
      CARRIER_ENDORSEMENT_FORMS.map((f) => f.carrier)
    );

    const profilesWithoutEndorsements: string[] = [];

    for (const profile of CARRIER_PROFILES) {
      if (!endorsementCarriers.has(profile.name)) {
        profilesWithoutEndorsements.push(profile.name);
      }
    }

    expect(
      profilesWithoutEndorsements,
      `Carrier profiles without endorsement forms: ${profilesWithoutEndorsements.join(", ")}`
    ).toHaveLength(0);
  });
});

// =============================================================================
// 3. Justification -> Requirement Cross-Reference
//    Every sourceRef in JUSTIFICATION_MATRIX[*].justificationSources should
//    match a ManufacturerRequirement.id somewhere in ALL_MANUFACTURERS.
// =============================================================================

describe("Justification -> Requirement cross-reference", () => {
  // Collect all requirement IDs across all manufacturers
  const allRequirementIds = new Set<string>();
  for (const [, mfr] of Object.entries(ALL_MANUFACTURERS)) {
    for (const req of mfr.installationRequirements) {
      allRequirementIds.add(req.id);
    }
  }

  it("every sourceRef in JUSTIFICATION_MATRIX matches a ManufacturerRequirement.id in ALL_MANUFACTURERS", () => {
    const missingRefs: string[] = [];

    for (const [xactCode, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      for (const source of entry.justificationSources) {
        if (!allRequirementIds.has(source.sourceRef)) {
          missingRefs.push(
            `${xactCode} -> ${source.manufacturer} sourceRef "${source.sourceRef}" not found in ALL_MANUFACTURERS`
          );
        }
      }
    }

    expect(
      missingRefs,
      `${missingRefs.length} justification sourceRefs not found:\n${missingRefs.join("\n")}`
    ).toHaveLength(0);
  });

  it("every JUSTIFICATION_MATRIX entry references a valid Xactimate code key", () => {
    const matrixKeys = Object.keys(JUSTIFICATION_MATRIX);

    // Each key should be a known Xactimate code pattern
    for (const key of matrixKeys) {
      expect(
        key,
        `Unexpected Xactimate code format: ${key}`
      ).toMatch(/^[A-Z]{2,4}\s[A-Z0-9+]+$/);
    }
  });
});

// =============================================================================
// 4. Building Code -> Xactimate Cross-Reference
//    Every Xactimate code in BuildingCode.xactimateCodes should be findable
//    via getRequirementsForXactimateCode() (at least 1 manufacturer has a
//    requirement for it).
// =============================================================================

describe("Building Code -> Xactimate cross-reference", () => {
  // Collect all unique Xactimate codes from building codes (excluding empty arrays)
  const allBuildingCodeXactCodes = new Set<string>();
  for (const code of BUILDING_CODES) {
    for (const xactCode of code.xactimateCodes) {
      allBuildingCodeXactCodes.add(xactCode);
    }
  }

  it("building codes reference at least some Xactimate codes", () => {
    expect(allBuildingCodeXactCodes.size).toBeGreaterThan(0);
  });

  it("Xactimate codes in building codes that overlap with manufacturer requirements are findable", () => {
    // Collect all Xactimate codes across all manufacturers
    const allMfrXactCodes = new Set<string>();
    for (const [, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      for (const req of mfr.installationRequirements) {
        allMfrXactCodes.add(req.xactimateCode);
      }
    }

    // Find building code Xactimate codes that ARE in manufacturer data
    const overlapping = [...allBuildingCodeXactCodes].filter((code) =>
      allMfrXactCodes.has(code)
    );

    // For each overlapping code, getRequirementsForXactimateCode should return results
    const missingResults: string[] = [];
    for (const xactCode of overlapping) {
      const results = getRequirementsForXactimateCode(xactCode);
      if (results.length === 0) {
        missingResults.push(
          `${xactCode}: in both building codes and manufacturer data but getRequirementsForXactimateCode() returns 0 results`
        );
      }
    }

    expect(
      missingResults,
      `Xactimate codes with broken lookup:\n${missingResults.join("\n")}`
    ).toHaveLength(0);
  });

  it("3 building codes have empty xactimateCodes arrays (known)", () => {
    const codesWithEmptyXact = BUILDING_CODES.filter(
      (c) => c.xactimateCodes.length === 0
    );
    expect(codesWithEmptyXact).toHaveLength(3);
  });
});

// =============================================================================
// 5. Legacy vs Modern Manufacturer Lookup
//    MANUFACTURERS (legacy 2-manufacturer) is a strict subset of
//    ALL_MANUFACTURERS (all 6).
// =============================================================================

describe("Legacy vs modern manufacturer lookup", () => {
  it("MANUFACTURERS (legacy) has exactly 2 entries (GAF, CertainTeed)", () => {
    const keys = Object.keys(MANUFACTURERS);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("GAF");
    expect(keys).toContain("CertainTeed");
  });

  it("ALL_MANUFACTURERS has exactly 6 entries", () => {
    const keys = Object.keys(ALL_MANUFACTURERS);
    expect(keys).toHaveLength(6);
  });

  it("every manufacturer in MANUFACTURERS exists in ALL_MANUFACTURERS with identical data", () => {
    for (const [name, legacyMfr] of Object.entries(MANUFACTURERS)) {
      const modernMfr = ALL_MANUFACTURERS[name];
      expect(
        modernMfr,
        `Legacy manufacturer "${name}" not found in ALL_MANUFACTURERS`
      ).toBeDefined();

      // Same website
      expect(modernMfr.website).toBe(legacyMfr.website);

      // Same number of installation requirements
      expect(modernMfr.installationRequirements.length).toBe(
        legacyMfr.installationRequirements.length
      );

      // Same requirement IDs
      const legacyIds = legacyMfr.installationRequirements.map((r) => r.id);
      const modernIds = modernMfr.installationRequirements.map((r) => r.id);
      expect(modernIds).toEqual(legacyIds);
    }
  });

  it("ALL_MANUFACTURERS has 48 total requirements", () => {
    let totalReqs = 0;
    for (const [, mfr] of Object.entries(ALL_MANUFACTURERS)) {
      totalReqs += mfr.installationRequirements.length;
    }
    expect(totalReqs).toBe(48);
  });
});

// =============================================================================
// 6. County FIPS Uniqueness
//    No two counties share a FIPS code.
// =============================================================================

describe("County FIPS uniqueness", () => {
  it("no two counties share a FIPS code", () => {
    const fipsCodes = ALL_COUNTIES.map((c) => c.fipsCode);
    const uniqueFips = new Set(fipsCodes);

    if (fipsCodes.length !== uniqueFips.size) {
      // Find duplicates for a helpful error message
      const seen = new Map<string, string>();
      const duplicates: string[] = [];

      for (const county of ALL_COUNTIES) {
        const existing = seen.get(county.fipsCode);
        if (existing) {
          duplicates.push(
            `FIPS ${county.fipsCode}: ${existing} and ${county.county}, ${county.state}`
          );
        } else {
          seen.set(county.fipsCode, `${county.county}, ${county.state}`);
        }
      }

      expect(
        duplicates,
        `Duplicate FIPS codes found:\n${duplicates.join("\n")}`
      ).toHaveLength(0);
    }

    expect(fipsCodes.length).toBe(uniqueFips.size);
  });

  it("all FIPS codes are 5-digit strings", () => {
    for (const county of ALL_COUNTIES) {
      expect(
        county.fipsCode,
        `${county.county}, ${county.state} has invalid FIPS: ${county.fipsCode}`
      ).toMatch(/^\d{5}$/);
    }
  });
});

// =============================================================================
// 7. State Consistency
//    Every county's state + fipsCode prefix matches:
//    MD = 24, PA = 42, DE = 10
// =============================================================================

describe("State consistency (FIPS prefix matches state)", () => {
  const stateFipsPrefix: Record<string, string> = {
    MD: "24",
    PA: "42",
    DE: "10",
  };

  it("every county's FIPS prefix matches its state code", () => {
    const mismatches: string[] = [];

    for (const county of ALL_COUNTIES) {
      const expectedPrefix = stateFipsPrefix[county.state];
      if (!expectedPrefix) {
        mismatches.push(
          `${county.county}: unknown state "${county.state}" (not MD/PA/DE)`
        );
        continue;
      }

      if (!county.fipsCode.startsWith(expectedPrefix)) {
        mismatches.push(
          `${county.county}, ${county.state}: FIPS ${county.fipsCode} should start with ${expectedPrefix}`
        );
      }
    }

    expect(
      mismatches,
      `FIPS-state mismatches:\n${mismatches.join("\n")}`
    ).toHaveLength(0);
  });

  it("MD counties have FIPS starting with 24", () => {
    const mdCounties = ALL_COUNTIES.filter((c) => c.state === "MD");
    expect(mdCounties.length).toBeGreaterThan(0);
    for (const county of mdCounties) {
      expect(county.fipsCode.startsWith("24")).toBe(true);
    }
  });

  it("PA counties have FIPS starting with 42", () => {
    const paCounties = ALL_COUNTIES.filter((c) => c.state === "PA");
    expect(paCounties.length).toBeGreaterThan(0);
    for (const county of paCounties) {
      expect(county.fipsCode.startsWith("42")).toBe(true);
    }
  });

  it("DE counties have FIPS starting with 10", () => {
    const deCounties = ALL_COUNTIES.filter((c) => c.state === "DE");
    expect(deCounties.length).toBeGreaterThan(0);
    for (const county of deCounties) {
      expect(county.fipsCode.startsWith("10")).toBe(true);
    }
  });
});

// =============================================================================
// Bonus: Cross-reference consistency checks
// =============================================================================

describe("Additional cross-reference consistency", () => {
  it("CARRIER_CODE_OBJECTIONS has 25 entries", () => {
    expect(CARRIER_CODE_OBJECTIONS).toHaveLength(25);
  });

  it("CARRIER_PROFILES has 13 entries", () => {
    expect(CARRIER_PROFILES).toHaveLength(13);
  });

  it("every carrier in CARRIER_CODE_OBJECTIONS has a matching CarrierProfile", () => {
    const profileNames = CARRIER_PROFILES.map((p) => p.name);
    const objectionCarriers = [
      ...new Set(CARRIER_CODE_OBJECTIONS.map((o) => o.carrierName)),
    ];

    const missing = objectionCarriers.filter((c) => !profileNames.includes(c));
    expect(
      missing,
      `Code objection carriers without profiles: ${missing.join(", ")}`
    ).toHaveLength(0);
  });

  it("manufacturer names in JUSTIFICATION_MATRIX match ALL_MANUFACTURERS keys or known aliases", () => {
    const mfrNames = new Set(Object.keys(ALL_MANUFACTURERS));
    // Also add common manufacturer name forms
    const knownNames = new Set([
      ...mfrNames,
      "GAF",
      "CertainTeed",
      "Owens Corning",
      "IKO",
      "Atlas",
      "Tamko",
    ]);

    const unknownMfrs: string[] = [];

    for (const [xactCode, entry] of Object.entries(JUSTIFICATION_MATRIX)) {
      for (const source of entry.justificationSources) {
        if (!knownNames.has(source.manufacturer)) {
          unknownMfrs.push(
            `${xactCode}: unknown manufacturer "${source.manufacturer}"`
          );
        }
      }
    }

    expect(
      unknownMfrs,
      `Unknown manufacturers in JUSTIFICATION_MATRIX:\n${unknownMfrs.join("\n")}`
    ).toHaveLength(0);
  });
});
