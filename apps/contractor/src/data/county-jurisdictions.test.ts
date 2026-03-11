import { describe, it, expect } from "vitest";
import {
  MD_COUNTIES,
  PA_COUNTIES,
  DE_COUNTIES,
  ALL_COUNTIES,
  ZIP_TO_COUNTY,
  resolveCountyByName,
  resolveCountyFromZip,
  lookupCountyByZip,
  iceBarrierScopeLabel,
  buildCountyContextForPrompt,
} from "./county-jurisdictions";

// ── Data Integrity — Array Counts ────────────────────────────────────────

describe("County array counts", () => {
  it("MD_COUNTIES has 24 entries", () => {
    expect(MD_COUNTIES).toHaveLength(24);
  });

  // NOTE: Source file comment says "14 priority" but the array actually has 16 entries.
  // This is correct per the spec — 16 PA counties are included.
  it("PA_COUNTIES has 16 entries", () => {
    expect(PA_COUNTIES).toHaveLength(16);
  });

  it("DE_COUNTIES has 3 entries", () => {
    expect(DE_COUNTIES).toHaveLength(3);
  });

  it("ALL_COUNTIES has 43 entries (sum of MD + PA + DE)", () => {
    expect(ALL_COUNTIES).toHaveLength(43);
    expect(ALL_COUNTIES).toHaveLength(
      MD_COUNTIES.length + PA_COUNTIES.length + DE_COUNTIES.length
    );
  });
});

// ── Data Integrity — Field Validation ────────────────────────────────────

describe("County field validation", () => {
  it("every county has a non-empty county name", () => {
    for (const c of ALL_COUNTIES) {
      expect(c.county, `County name should be non-empty`).toBeTruthy();
      expect(typeof c.county).toBe("string");
    }
  });

  it('every county has a valid state ("MD" | "PA" | "DE")', () => {
    const validStates = ["MD", "PA", "DE"];
    for (const c of ALL_COUNTIES) {
      expect(
        validStates,
        `Invalid state "${c.state}" on ${c.county}`
      ).toContain(c.state);
    }
  });

  it("MD_COUNTIES all have state 'MD'", () => {
    for (const c of MD_COUNTIES) {
      expect(c.state).toBe("MD");
    }
  });

  it("PA_COUNTIES all have state 'PA'", () => {
    for (const c of PA_COUNTIES) {
      expect(c.state).toBe("PA");
    }
  });

  it("DE_COUNTIES all have state 'DE'", () => {
    for (const c of DE_COUNTIES) {
      expect(c.state).toBe("DE");
    }
  });
});

// ── Climate Zone Validation ──────────────────────────────────────────────

describe("Climate zone validation", () => {
  // SPEC DISCREPANCY: The TypeScript interface allows "6A" but no county
  // in our coverage area actually uses it. We verify that here.
  it('every climateZone is "4A" or "5A" (no "6A" in our coverage)', () => {
    const validZones = ["4A", "5A"];
    for (const c of ALL_COUNTIES) {
      expect(
        validZones,
        `Unexpected climate zone "${c.climateZone}" on ${c.county}, ${c.state}`
      ).toContain(c.climateZone);
    }
  });

  it("flags any 6A climate zones (none expected)", () => {
    const zone6A = ALL_COUNTIES.filter((c) => c.climateZone === "6A");
    expect(
      zone6A,
      "No counties should have climate zone 6A in MD/PA/DE coverage"
    ).toHaveLength(0);
  });
});

// ── Wind Speed Validation ────────────────────────────────────────────────

describe("Wind speed validation", () => {
  it("every designWindSpeed is between 90 and 180 mph", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        c.designWindSpeed,
        `${c.county}, ${c.state} wind speed ${c.designWindSpeed} out of range`
      ).toBeGreaterThanOrEqual(90);
      expect(
        c.designWindSpeed,
        `${c.county}, ${c.state} wind speed ${c.designWindSpeed} out of range`
      ).toBeLessThanOrEqual(180);
    }
  });

  it("highWindZone is true iff designWindSpeed >= 120", () => {
    for (const c of ALL_COUNTIES) {
      if (c.designWindSpeed >= 120) {
        expect(
          c.highWindZone,
          `${c.county}, ${c.state} has wind speed ${c.designWindSpeed} >= 120 but highWindZone is false`
        ).toBe(true);
      } else {
        expect(
          c.highWindZone,
          `${c.county}, ${c.state} has wind speed ${c.designWindSpeed} < 120 but highWindZone is true`
        ).toBe(false);
      }
    }
  });
});

// ── Ice Barrier Requirement Validation ───────────────────────────────────

describe("Ice barrier requirement validation", () => {
  const validIceBarrier = [
    "eaves_only",
    "eaves_valleys",
    "eaves_valleys_penetrations",
    "eaves_valleys_penetrations_extended",
  ];

  it("every iceBarrierRequirement is one of the 4 valid enum values", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        validIceBarrier,
        `Invalid iceBarrierRequirement "${c.iceBarrierRequirement}" on ${c.county}, ${c.state}`
      ).toContain(c.iceBarrierRequirement);
    }
  });
});

// ── Permit Validation ────────────────────────────────────────────────────

describe("Permit field validation", () => {
  it("every permit.required is boolean", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        typeof c.permit.required,
        `${c.county}, ${c.state} permit.required is not boolean`
      ).toBe("boolean");
    }
  });

  it("every permit.ahjName is a non-empty string", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        c.permit.ahjName,
        `${c.county}, ${c.state} permit.ahjName should be non-empty`
      ).toBeTruthy();
      expect(typeof c.permit.ahjName).toBe("string");
    }
  });

  it("every permit.typicalFeeRange is a non-empty string", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        c.permit.typicalFeeRange,
        `${c.county}, ${c.state} permit.typicalFeeRange should be non-empty`
      ).toBeTruthy();
      expect(typeof c.permit.typicalFeeRange).toBe("string");
    }
  });

  // SPEC DISCREPANCY: The spec said permit.ahjPhone is a non-empty string,
  // but the actual type is `string | null`. Some PA counties have null ahjPhone.
  it("every permit.ahjPhone is a string or null", () => {
    for (const c of ALL_COUNTIES) {
      const valid =
        c.permit.ahjPhone === null || typeof c.permit.ahjPhone === "string";
      expect(
        valid,
        `${c.county}, ${c.state} permit.ahjPhone should be string or null`
      ).toBe(true);
    }
  });

  // SPEC DISCREPANCY: The spec said permit has ahjUrl, but actual type is `string | null`.
  it("every permit.ahjUrl is a string or null", () => {
    for (const c of ALL_COUNTIES) {
      const valid =
        c.permit.ahjUrl === null || typeof c.permit.ahjUrl === "string";
      expect(
        valid,
        `${c.county}, ${c.state} permit.ahjUrl should be string or null`
      ).toBe(true);
    }
  });

  it("every permit.notes is a string or null", () => {
    for (const c of ALL_COUNTIES) {
      const valid =
        c.permit.notes === null || typeof c.permit.notes === "string";
      expect(
        valid,
        `${c.county}, ${c.state} permit.notes should be string or null`
      ).toBe(true);
    }
  });
});

// ── Local Amendments Validation ──────────────────────────────────────────

describe("Local amendments validation", () => {
  // SPEC DISCREPANCY: localAmendments is on the root CountyJurisdiction object,
  // not inside permit as the spec interface suggested.
  it("every county has a localAmendments array", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        Array.isArray(c.localAmendments),
        `${c.county}, ${c.state} localAmendments should be an array`
      ).toBe(true);
    }
  });

  it("every localAmendment entry is a non-empty string", () => {
    for (const c of ALL_COUNTIES) {
      for (const amendment of c.localAmendments) {
        expect(
          amendment,
          `${c.county}, ${c.state} has empty localAmendment`
        ).toBeTruthy();
        expect(typeof amendment).toBe("string");
      }
    }
  });
});

// ── FIPS Code Validation ─────────────────────────────────────────────────

describe("FIPS code validation", () => {
  it("every fipsCode is exactly 5 digits", () => {
    for (const c of ALL_COUNTIES) {
      expect(
        c.fipsCode,
        `${c.county}, ${c.state} fipsCode "${c.fipsCode}" is not 5 digits`
      ).toMatch(/^\d{5}$/);
    }
  });

  it('MD counties have fipsCode starting with "24"', () => {
    for (const c of MD_COUNTIES) {
      expect(
        c.fipsCode.startsWith("24"),
        `MD county ${c.county} fipsCode "${c.fipsCode}" does not start with "24"`
      ).toBe(true);
    }
  });

  it('PA counties have fipsCode starting with "42"', () => {
    for (const c of PA_COUNTIES) {
      expect(
        c.fipsCode.startsWith("42"),
        `PA county ${c.county} fipsCode "${c.fipsCode}" does not start with "42"`
      ).toBe(true);
    }
  });

  it('DE counties have fipsCode starting with "10"', () => {
    for (const c of DE_COUNTIES) {
      expect(
        c.fipsCode.startsWith("10"),
        `DE county ${c.county} fipsCode "${c.fipsCode}" does not start with "10"`
      ).toBe(true);
    }
  });

  it("has no duplicate fipsCodes", () => {
    const codes = ALL_COUNTIES.map((c) => c.fipsCode);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size, "Duplicate fipsCodes found").toBe(codes.length);
  });
});

// ── No Duplicate County Names Within Same State ──────────────────────────

describe("Uniqueness validation", () => {
  it("no duplicate county names within same state", () => {
    const seen = new Set<string>();
    for (const c of ALL_COUNTIES) {
      const key = `${c.state}:${c.county}`;
      expect(
        seen.has(key),
        `Duplicate county "${c.county}" in state ${c.state}`
      ).toBe(false);
      seen.add(key);
    }
  });

  // Note: "Kent" appears in both MD and DE, and "Montgomery" in both MD and PA.
  // This is expected — they are different counties in different states.
  it("allows same county name in different states (Kent in MD and DE)", () => {
    const kentMD = ALL_COUNTIES.filter(
      (c) => c.county === "Kent" && c.state === "MD"
    );
    const kentDE = ALL_COUNTIES.filter(
      (c) => c.county === "Kent" && c.state === "DE"
    );
    expect(kentMD).toHaveLength(1);
    expect(kentDE).toHaveLength(1);
  });

  it("allows same county name in different states (Montgomery in MD and PA)", () => {
    const montMD = ALL_COUNTIES.filter(
      (c) => c.county === "Montgomery" && c.state === "MD"
    );
    const montPA = ALL_COUNTIES.filter(
      (c) => c.county === "Montgomery" && c.state === "PA"
    );
    expect(montMD).toHaveLength(1);
    expect(montPA).toHaveLength(1);
  });
});

// ── ZIP_TO_COUNTY Validation ─────────────────────────────────────────────

describe("ZIP_TO_COUNTY map", () => {
  it("has a reasonable number of entries (> 900)", () => {
    const zipCount = Object.keys(ZIP_TO_COUNTY).length;
    expect(zipCount).toBeGreaterThan(900);
  });

  it("every ZIP key is exactly 5 digits", () => {
    for (const zip of Object.keys(ZIP_TO_COUNTY)) {
      expect(zip, `ZIP "${zip}" is not 5 digits`).toMatch(/^\d{5}$/);
    }
  });

  it("every ZIP value has a non-empty county and valid state", () => {
    const validStates = ["MD", "PA", "DE"];
    for (const [zip, mapping] of Object.entries(ZIP_TO_COUNTY)) {
      expect(
        mapping.county,
        `ZIP ${zip} has empty county`
      ).toBeTruthy();
      expect(
        validStates,
        `ZIP ${zip} has invalid state "${mapping.state}"`
      ).toContain(mapping.state);
    }
  });

  it("every ZIP county+state maps to an entry in ALL_COUNTIES", () => {
    for (const [zip, mapping] of Object.entries(ZIP_TO_COUNTY)) {
      const match = ALL_COUNTIES.find(
        (c) => c.county === mapping.county && c.state === mapping.state
      );
      expect(
        match,
        `ZIP ${zip} maps to "${mapping.county}, ${mapping.state}" which is not in ALL_COUNTIES`
      ).toBeDefined();
    }
  });
});

// ── Lookup Functions — resolveCountyByName ───────────────────────────────

describe("resolveCountyByName", () => {
  it('resolves "Montgomery" in MD to county with county === "Montgomery"', () => {
    const result = resolveCountyByName("Montgomery", "MD");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Montgomery");
    expect(result!.state).toBe("MD");
  });

  it('resolves "Baltimore County" in MD (exact match with suffix)', () => {
    const result = resolveCountyByName("Baltimore County", "MD");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Baltimore County");
    expect(result!.state).toBe("MD");
  });

  it('resolves "baltimore" in MD (case-insensitive)', () => {
    const result = resolveCountyByName("baltimore", "MD");
    expect(result).not.toBeNull();
    // Should match "Baltimore County" or "Baltimore City" — the fuzzy match
    // strips "county/city" suffix, so "baltimore" matches either. The first
    // match in ALL_COUNTIES is "Baltimore County".
    expect(result!.state).toBe("MD");
  });

  it('resolves "MONTGOMERY" in MD (all-caps)', () => {
    const result = resolveCountyByName("MONTGOMERY", "MD");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Montgomery");
  });

  it('returns null for "Nonexistent" in MD', () => {
    const result = resolveCountyByName("Nonexistent", "MD");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolveCountyByName("", "MD")).toBeNull();
  });

  it('resolves "Montgomery" in PA to the PA Montgomery county', () => {
    const result = resolveCountyByName("Montgomery", "PA");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Montgomery");
    expect(result!.state).toBe("PA");
  });

  it('resolves "Kent" in DE to the DE Kent county', () => {
    const result = resolveCountyByName("Kent", "DE");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Kent");
    expect(result!.state).toBe("DE");
  });

  it('resolves "Kent" in MD to the MD Kent county', () => {
    const result = resolveCountyByName("Kent", "MD");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Kent");
    expect(result!.state).toBe("MD");
  });

  it('resolves "Baltimore City" in MD (city suffix)', () => {
    const result = resolveCountyByName("Baltimore City", "MD");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Baltimore City");
  });

  it("handles leading/trailing whitespace", () => {
    const result = resolveCountyByName("  Montgomery  ", "MD");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Montgomery");
  });
});

// ── Lookup Functions — ZIP lookups ───────────────────────────────────────
// NOTE: There are TWO zip lookup functions with different null contracts:
//   - lookupCountyByZip() returns CountyJurisdiction | undefined
//   - resolveCountyFromZip() returns CountyJurisdiction | null
// This inconsistency is documented here but exists in the source.

describe("lookupCountyByZip", () => {
  it('returns Baltimore City for ZIP "21201"', () => {
    const result = lookupCountyByZip("21201");
    expect(result).toBeDefined();
    expect(result!.county).toBe("Baltimore City");
    expect(result!.state).toBe("MD");
  });

  it('returns undefined for non-existent ZIP "00000"', () => {
    const result = lookupCountyByZip("00000");
    expect(result).toBeUndefined();
  });

  it('returns undefined (not null) for missing ZIP "99999"', () => {
    const result = lookupCountyByZip("99999");
    expect(result).toBeUndefined();
    // Verify it's specifically undefined, not null
    expect(result).not.toBeNull();
  });

  it('returns undefined for ZIP+4 format "21201-1234" (no normalization)', () => {
    const result = lookupCountyByZip("21201-1234");
    expect(result).toBeUndefined();
  });

  it('returns undefined for ZIP with whitespace "  21201  " (no normalization)', () => {
    const result = lookupCountyByZip("  21201  ");
    expect(result).toBeUndefined();
  });
});

describe("resolveCountyFromZip", () => {
  it('returns Baltimore City for ZIP "21201"', () => {
    const result = resolveCountyFromZip("21201");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Baltimore City");
    expect(result!.state).toBe("MD");
  });

  it('returns null (not undefined) for non-existent ZIP "00000"', () => {
    const result = resolveCountyFromZip("00000");
    expect(result).toBeNull();
    // Verify it's specifically null, not undefined
    expect(result).not.toBeUndefined();
  });

  it("returns null for null input", () => {
    expect(resolveCountyFromZip(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(resolveCountyFromZip(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolveCountyFromZip("")).toBeNull();
  });

  it("returns null for short ZIP (less than 5 digits)", () => {
    expect(resolveCountyFromZip("212")).toBeNull();
  });

  it("handles ZIP with extra characters (truncates to 5)", () => {
    const result = resolveCountyFromZip("21201-1234");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Baltimore City");
  });

  it("handles ZIP with leading/trailing whitespace", () => {
    const result = resolveCountyFromZip("  21201  ");
    expect(result).not.toBeNull();
    expect(result!.county).toBe("Baltimore City");
  });
});

// ── iceBarrierScopeLabel ─────────────────────────────────────────────────

describe("iceBarrierScopeLabel", () => {
  it('returns correct label for "eaves_only"', () => {
    const label = iceBarrierScopeLabel("eaves_only");
    expect(label).toContain("eaves only");
  });

  it('returns correct label for "eaves_valleys"', () => {
    const label = iceBarrierScopeLabel("eaves_valleys");
    expect(label).toContain("eaves");
    expect(label).toContain("valleys");
  });

  it('returns correct label for "eaves_valleys_penetrations"', () => {
    const label = iceBarrierScopeLabel("eaves_valleys_penetrations");
    expect(label).toContain("eaves");
    expect(label).toContain("valleys");
    expect(label).toContain("penetrations");
  });

  it('returns correct label for "eaves_valleys_penetrations_extended"', () => {
    const label = iceBarrierScopeLabel("eaves_valleys_penetrations_extended");
    expect(label).toContain("eaves");
    expect(label).toContain("36");
  });

  it("returns fallback label for unknown value", () => {
    // Cast to bypass TypeScript to test the default branch
    const label = iceBarrierScopeLabel("unknown" as any);
    expect(label).toContain("per local requirements");
  });
});

// ── buildCountyContextForPrompt ──────────────────────────────────────────

describe("buildCountyContextForPrompt", () => {
  // Guard: verify we know which county we're testing
  expect(ALL_COUNTIES[0].county).toBe("Allegany");

  it("returns a non-empty string for a valid county", () => {
    const county = ALL_COUNTIES[0];
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("includes county name and state in the output", () => {
    const county = resolveCountyByName("Montgomery", "MD")!;
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain("Montgomery");
    expect(prompt).toContain("MD");
  });

  it("includes jurisdiction header", () => {
    const county = ALL_COUNTIES[0];
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain("COUNTY-SPECIFIC JURISDICTION DATA");
  });

  it("includes FIPS code", () => {
    const county = ALL_COUNTIES[0];
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain(county.fipsCode);
  });

  it("includes climate zone", () => {
    const county = ALL_COUNTIES[0];
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain(county.climateZone);
  });

  it("includes design wind speed", () => {
    const county = ALL_COUNTIES[0];
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain(String(county.designWindSpeed));
  });

  it("includes permit info", () => {
    const county = ALL_COUNTIES[0];
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain("Permit");
    expect(prompt).toContain(county.permit.ahjName);
    expect(prompt).toContain(county.permit.typicalFeeRange);
  });

  it("includes local amendments when present", () => {
    // Allegany has localAmendments
    const county = MD_COUNTIES[0];
    expect(MD_COUNTIES[0].county).toBe("Allegany"); // Guard
    expect(county.localAmendments.length).toBeGreaterThan(0);
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain("Local Amendments");
  });

  it("omits local amendments section when empty", () => {
    // Anne Arundel has no local amendments
    const county = MD_COUNTIES[1];
    expect(MD_COUNTIES[1].county).toBe("Anne Arundel"); // Guard
    expect(county.localAmendments).toHaveLength(0);
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).not.toContain("Local Amendments");
  });

  it("indicates high wind zone correctly for high-wind county", () => {
    const highWind = ALL_COUNTIES.find((c) => c.highWindZone === true)!;
    const prompt = buildCountyContextForPrompt(highWind);
    expect(prompt).toContain("6-nail");
  });

  it("indicates standard pattern for non-high-wind county", () => {
    const lowWind = ALL_COUNTIES.find((c) => c.highWindZone === false)!;
    const prompt = buildCountyContextForPrompt(lowWind);
    expect(prompt).toContain("4-nail");
  });

  it("includes AHJ phone when present", () => {
    // Montgomery MD has a phone number
    const county = resolveCountyByName("Montgomery", "MD")!;
    expect(county.permit.ahjPhone).not.toBeNull();
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain(county.permit.ahjPhone!);
  });

  it("includes AHJ URL when present", () => {
    const county = resolveCountyByName("Montgomery", "MD")!;
    expect(county.permit.ahjUrl).not.toBeNull();
    const prompt = buildCountyContextForPrompt(county);
    expect(prompt).toContain(county.permit.ahjUrl!);
  });
});
