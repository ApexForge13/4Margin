import { describe, it, expect } from "vitest";
import {
  ZIP_TO_COUNTY,
  ALL_COUNTIES,
} from "./county-jurisdictions";

// ── ZIP Format Validation ──────────────────────────────────────────────────
// NOTE: Basic ZIP format (5-digit) and county/state validity are already
// tested in county-jurisdictions.test.ts. This file focuses on:
//   1. State-specific ZIP prefix ranges
//   2. County back-reference coverage (every county has >= 1 ZIP)
//   3. Spot-check accuracy (20 verified ZIP-to-county mappings)

describe("ZIP prefix ranges by state", () => {
  const allZips = Object.entries(ZIP_TO_COUNTY);

  // Guard: ensure we have data to test
  it("has ZIP entries to validate", () => {
    expect(
      allZips.length,
      "ZIP_TO_COUNTY should have entries to test"
    ).toBeGreaterThan(0);
  });

  it("MD ZIPs start with 20 or 21", () => {
    const mdZips = allZips.filter(([, v]) => v.state === "MD");
    expect(
      mdZips.length,
      "Should have Maryland ZIPs to validate"
    ).toBeGreaterThan(0);

    for (const [zip, mapping] of mdZips) {
      const prefix2 = zip.slice(0, 2);
      expect(
        prefix2 === "20" || prefix2 === "21",
        `MD ZIP ${zip} (${mapping.county}) starts with "${prefix2}" — expected "20" or "21"`
      ).toBe(true);
    }
  });

  it("PA ZIPs start with 15, 16, 17, 18, or 19", () => {
    const paZips = allZips.filter(([, v]) => v.state === "PA");
    expect(
      paZips.length,
      "Should have Pennsylvania ZIPs to validate"
    ).toBeGreaterThan(0);

    const validPaPrefixes = ["15", "16", "17", "18", "19"];
    for (const [zip, mapping] of paZips) {
      const prefix2 = zip.slice(0, 2);
      expect(
        validPaPrefixes.includes(prefix2),
        `PA ZIP ${zip} (${mapping.county}) starts with "${prefix2}" — expected one of ${validPaPrefixes.join(", ")}`
      ).toBe(true);
    }
  });

  it("DE ZIPs start with 197, 198, or 199", () => {
    const deZips = allZips.filter(([, v]) => v.state === "DE");
    expect(
      deZips.length,
      "Should have Delaware ZIPs to validate"
    ).toBeGreaterThan(0);

    const validDePrefixes = ["197", "198", "199"];
    for (const [zip, mapping] of deZips) {
      const prefix3 = zip.slice(0, 3);
      expect(
        validDePrefixes.includes(prefix3),
        `DE ZIP ${zip} (${mapping.county}) starts with "${prefix3}" — expected one of ${validDePrefixes.join(", ")}`
      ).toBe(true);
    }
  });

  // Verify no ZIPs exist for unexpected states
  it("every ZIP maps to MD, PA, or DE (no other states)", () => {
    const validStates = new Set(["MD", "PA", "DE"]);
    for (const [zip, mapping] of allZips) {
      expect(
        validStates.has(mapping.state),
        `ZIP ${zip} maps to unexpected state "${mapping.state}"`
      ).toBe(true);
    }
  });
});

// ── County Coverage Validation ─────────────────────────────────────────────
// Ensures every county in ALL_COUNTIES has at least one ZIP code mapped to it.
// Orphan counties (with no ZIPs) would mean properties in that county can
// never be resolved from a ZIP code.

describe("County coverage — no orphan counties", () => {
  // Guard: confirm expected county count
  it("ALL_COUNTIES has 43 entries (prerequisite)", () => {
    expect(ALL_COUNTIES).toHaveLength(43);
  });

  it("every county in ALL_COUNTIES has at least 1 ZIP mapped to it", () => {
    const zipEntries = Object.values(ZIP_TO_COUNTY);

    // Build a set of county+state keys that appear in ZIP_TO_COUNTY
    const coveredCounties = new Set(
      zipEntries.map((v) => `${v.state}:${v.county}`)
    );

    const orphanCounties: string[] = [];
    for (const county of ALL_COUNTIES) {
      const key = `${county.state}:${county.county}`;
      if (!coveredCounties.has(key)) {
        orphanCounties.push(`${county.county}, ${county.state}`);
      }
    }

    expect(
      orphanCounties,
      `Orphan counties with no ZIPs: ${orphanCounties.join("; ")}`
    ).toHaveLength(0);
  });

  it("no ZIP maps to a county+state pair absent from ALL_COUNTIES", () => {
    // Build a set of valid county+state keys from ALL_COUNTIES
    const validCounties = new Set(
      ALL_COUNTIES.map((c) => `${c.state}:${c.county}`)
    );

    const invalidMappings: string[] = [];
    for (const [zip, mapping] of Object.entries(ZIP_TO_COUNTY)) {
      const key = `${mapping.state}:${mapping.county}`;
      if (!validCounties.has(key)) {
        invalidMappings.push(
          `ZIP ${zip} -> "${mapping.county}, ${mapping.state}"`
        );
      }
    }

    expect(
      invalidMappings,
      `ZIPs mapping to non-existent counties: ${invalidMappings.join("; ")}`
    ).toHaveLength(0);
  });
});

// ── ZIP Count Sanity ────────────────────────────────────────────────────────

describe("ZIP count sanity", () => {
  it("total ZIP count matches Object.keys length (no hidden duplicates)", () => {
    const keys = Object.keys(ZIP_TO_COUNTY);
    const uniqueKeys = new Set(keys);
    // In a JS Record, keys are unique by definition, but this verifies
    // no shadowed keys from prototype or other edge cases.
    expect(
      uniqueKeys.size,
      "ZIP_TO_COUNTY key count should equal unique key count"
    ).toBe(keys.length);
  });

  it("each state has a reasonable number of ZIPs", () => {
    const entries = Object.values(ZIP_TO_COUNTY);
    const mdCount = entries.filter((v) => v.state === "MD").length;
    const paCount = entries.filter((v) => v.state === "PA").length;
    const deCount = entries.filter((v) => v.state === "DE").length;

    // MD has 24 jurisdictions — expect at least 200 ZIPs
    expect(
      mdCount,
      `MD should have at least 200 ZIPs, got ${mdCount}`
    ).toBeGreaterThanOrEqual(200);

    // PA has 16 counties — expect at least 200 ZIPs
    expect(
      paCount,
      `PA should have at least 200 ZIPs, got ${paCount}`
    ).toBeGreaterThanOrEqual(200);

    // DE has 3 counties — expect at least 50 ZIPs
    expect(
      deCount,
      `DE should have at least 50 ZIPs, got ${deCount}`
    ).toBeGreaterThanOrEqual(50);

    // Total should sum correctly
    expect(mdCount + paCount + deCount).toBe(entries.length);
  });
});

// ── Spot-Check Accuracy ─────────────────────────────────────────────────────
// 20 verified ZIP-to-county assignments, spread across all 3 states.
// Mix of urban, suburban, and rural counties.

describe("Spot-check: 20 verified ZIP-to-county mappings", () => {
  const spotChecks: Array<{
    zip: string;
    county: string;
    state: string;
    note: string;
  }> = [
    // ── Maryland (8 ZIPs) ──
    {
      zip: "21201",
      county: "Baltimore City",
      state: "MD",
      note: "Baltimore City — downtown urban",
    },
    {
      zip: "20906",
      county: "Montgomery",
      state: "MD",
      note: "Silver Spring — suburban Montgomery County",
    },
    {
      zip: "21740",
      county: "Washington",
      state: "MD",
      note: "Hagerstown — western MD",
    },
    {
      zip: "20601",
      county: "Charles",
      state: "MD",
      note: "Waldorf — southern MD suburban",
    },
    {
      zip: "21801",
      county: "Wicomico",
      state: "MD",
      note: "Salisbury — Eastern Shore",
    },
    {
      zip: "21550",
      county: "Garrett",
      state: "MD",
      note: "Oakland — rural far-western MD",
    },
    {
      zip: "20735",
      county: "Prince George's",
      state: "MD",
      note: "Clinton — PG County suburban",
    },
    {
      zip: "21620",
      county: "Kent",
      state: "MD",
      note: "Chestertown — rural Eastern Shore",
    },

    // ── Pennsylvania (8 ZIPs) ──
    {
      zip: "17325",
      county: "Adams",
      state: "PA",
      note: "Gettysburg — rural/historic",
    },
    {
      zip: "19601",
      county: "Berks",
      state: "PA",
      note: "Reading — urban center",
    },
    {
      zip: "18901",
      county: "Bucks",
      state: "PA",
      note: "Doylestown — suburban Philadelphia",
    },
    {
      zip: "19320",
      county: "Chester",
      state: "PA",
      note: "West Chester — suburban",
    },
    {
      zip: "17013",
      county: "Cumberland",
      state: "PA",
      note: "Carlisle — central PA",
    },
    {
      zip: "17601",
      county: "Lancaster",
      state: "PA",
      note: "Lancaster — Amish country urban/suburban",
    },
    {
      zip: "18102",
      county: "Lehigh",
      state: "PA",
      note: "Allentown — Lehigh Valley urban",
    },
    {
      zip: "17401",
      county: "York",
      state: "PA",
      note: "York city — south-central PA",
    },

    // ── Delaware (4 ZIPs) ──
    {
      zip: "19901",
      county: "Kent",
      state: "DE",
      note: "Dover — state capital",
    },
    {
      zip: "19711",
      county: "New Castle",
      state: "DE",
      note: "Newark — college town/suburban",
    },
    {
      zip: "19801",
      county: "New Castle",
      state: "DE",
      note: "Wilmington — urban center",
    },
    {
      zip: "19947",
      county: "Sussex",
      state: "DE",
      note: "Georgetown — rural southern DE",
    },
  ];

  // Guard: verify we have the right number of spot checks
  expect(spotChecks).toHaveLength(20);

  for (const check of spotChecks) {
    it(`${check.zip} -> ${check.county}, ${check.state} (${check.note})`, () => {
      const mapping = ZIP_TO_COUNTY[check.zip];
      expect(
        mapping,
        `ZIP ${check.zip} should exist in ZIP_TO_COUNTY`
      ).toBeDefined();
      expect(
        mapping.county,
        `ZIP ${check.zip} county: expected "${check.county}", got "${mapping?.county}"`
      ).toBe(check.county);
      expect(
        mapping.state,
        `ZIP ${check.zip} state: expected "${check.state}", got "${mapping?.state}"`
      ).toBe(check.state);
    });
  }
});
