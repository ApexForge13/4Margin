// ── Carrier Profiles Tests ─────────────────────────────────────────────────
// Tests for packages/policy-engine/src/carrier-profiles.ts
// Validates all exported constants and lookup functions.
//
// Spec counts (all verified against source):
//   CARRIER_PROFILES: 13
//   CARRIER_CODE_OBJECTIONS: 25 (spec said 27 — actual source has 25)
//   Objections per carrier: State Farm 8, Nationwide 5, Allstate 5,
//                           Erie 1, Farmers 3, Progressive 3

import { describe, it, expect } from "vitest";
import {
  CARRIER_PROFILES,
  CARRIER_CODE_OBJECTIONS,
  getCarrierProfile,
  getCarrierCodeObjections,
  buildCarrierContextForPrompt,
} from "./carrier-profiles";

// ── CARRIER_PROFILES ───────────────────────────────────────────────────────

describe("CARRIER_PROFILES", () => {
  it("has exactly 13 entries (snapshot count)", () => {
    expect(CARRIER_PROFILES).toHaveLength(13);
  });

  it("each profile has a non-empty name", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(profile.name, "profile missing name").toBeTruthy();
      expect(profile.name.length, `profile has empty name`).toBeGreaterThan(0);
    }
  });

  it("each profile has a non-empty aliases array", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.aliases.length,
        `${profile.name} has empty aliases array`
      ).toBeGreaterThan(0);
      for (const alias of profile.aliases) {
        expect(
          alias.length,
          `${profile.name} has empty string in aliases`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('each aggressiveness is "low" | "moderate" | "aggressive"', () => {
    const validValues = ["low", "moderate", "aggressive"] as const;
    for (const profile of CARRIER_PROFILES) {
      expect(
        validValues as readonly string[],
        `${profile.name} has invalid aggressiveness: "${profile.aggressiveness}"`
      ).toContain(profile.aggressiveness);
    }
  });

  it("each profile has non-empty supplementTactics array", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.supplementTactics.length,
        `${profile.name} has empty supplementTactics`
      ).toBeGreaterThan(0);
      for (const tactic of profile.supplementTactics) {
        expect(
          tactic.length,
          `${profile.name} has empty string in supplementTactics`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each profile has non-empty commonDenialLanguage array", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.commonDenialLanguage.length,
        `${profile.name} has empty commonDenialLanguage`
      ).toBeGreaterThan(0);
      for (const denial of profile.commonDenialLanguage) {
        expect(
          denial.length,
          `${profile.name} has empty string in commonDenialLanguage`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each profile has non-empty adjusterBehavior array", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.adjusterBehavior.length,
        `${profile.name} has empty adjusterBehavior`
      ).toBeGreaterThan(0);
      for (const behavior of profile.adjusterBehavior) {
        expect(
          behavior.length,
          `${profile.name} has empty string in adjusterBehavior`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each profile has non-empty strengths array", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.strengths.length,
        `${profile.name} has empty strengths`
      ).toBeGreaterThan(0);
      for (const strength of profile.strengths) {
        expect(
          strength.length,
          `${profile.name} has empty string in strengths`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each profile has non-empty weaknesses array", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.weaknesses.length,
        `${profile.name} has empty weaknesses`
      ).toBeGreaterThan(0);
      for (const weakness of profile.weaknesses) {
        expect(
          weakness.length,
          `${profile.name} has empty string in weaknesses`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each profile has non-empty depreciationApproach", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.depreciationApproach,
        `${profile.name} missing depreciationApproach`
      ).toBeTruthy();
      expect(
        profile.depreciationApproach.length,
        `${profile.name} has empty depreciationApproach`
      ).toBeGreaterThan(0);
    }
  });

  it("each profile has non-empty cosmeticDamageStance", () => {
    for (const profile of CARRIER_PROFILES) {
      expect(
        profile.cosmeticDamageStance,
        `${profile.name} missing cosmeticDamageStance`
      ).toBeTruthy();
      expect(
        profile.cosmeticDamageStance.length,
        `${profile.name} has empty cosmeticDamageStance`
      ).toBeGreaterThan(0);
    }
  });

  it("has no duplicate carrier names", () => {
    const names = CARRIER_PROFILES.map((p) => p.name);
    expect(new Set(names).size, "duplicate carrier names found").toBe(
      names.length
    );
  });
});

// ── CARRIER_CODE_OBJECTIONS ────────────────────────────────────────────────

describe("CARRIER_CODE_OBJECTIONS", () => {
  // NOTE: Spec said 27 entries but actual source has 25.
  // Using real count as the snapshot detector.
  it("has exactly 25 entries (snapshot count — spec said 27, source has 25)", () => {
    expect(CARRIER_CODE_OBJECTIONS).toHaveLength(25);
  });

  it("each objection has non-empty carrierName", () => {
    for (const obj of CARRIER_CODE_OBJECTIONS) {
      expect(obj.carrierName, "objection missing carrierName").toBeTruthy();
      expect(
        obj.carrierName.length,
        "objection has empty carrierName"
      ).toBeGreaterThan(0);
    }
  });

  it("each objection has non-empty ircSection", () => {
    for (const obj of CARRIER_CODE_OBJECTIONS) {
      expect(
        obj.ircSection,
        `${obj.carrierName} objection missing ircSection`
      ).toBeTruthy();
      expect(
        obj.ircSection.length,
        `${obj.carrierName} has empty ircSection`
      ).toBeGreaterThan(0);
    }
  });

  it("each objection has non-empty typicalObjection", () => {
    for (const obj of CARRIER_CODE_OBJECTIONS) {
      expect(
        obj.typicalObjection,
        `${obj.carrierName} ${obj.ircSection} missing typicalObjection`
      ).toBeTruthy();
      expect(
        obj.typicalObjection.length,
        `${obj.carrierName} ${obj.ircSection} has empty typicalObjection`
      ).toBeGreaterThan(0);
    }
  });

  it("each objection has non-empty effectiveRebuttal", () => {
    for (const obj of CARRIER_CODE_OBJECTIONS) {
      expect(
        obj.effectiveRebuttal,
        `${obj.carrierName} ${obj.ircSection} missing effectiveRebuttal`
      ).toBeTruthy();
      expect(
        obj.effectiveRebuttal.length,
        `${obj.carrierName} ${obj.ircSection} has empty effectiveRebuttal`
      ).toBeGreaterThan(0);
    }
  });

  it('each objectionRate is "high" | "medium" | "low"', () => {
    const validRates = ["high", "medium", "low"] as const;
    for (const obj of CARRIER_CODE_OBJECTIONS) {
      expect(
        validRates as readonly string[],
        `${obj.carrierName} ${obj.ircSection} has invalid objectionRate: "${obj.objectionRate}"`
      ).toContain(obj.objectionRate);
    }
  });

  // ── Per-carrier objection count snapshots ──────────────────────────────

  const expectedObjectionCounts: Record<string, number> = {
    "State Farm": 8,
    Nationwide: 5,
    Allstate: 5,
    Erie: 1,
    Farmers: 3,
    Progressive: 3,
  };

  for (const [carrier, expectedCount] of Object.entries(
    expectedObjectionCounts
  )) {
    it(`has ${expectedCount} ${carrier} objections`, () => {
      const count = CARRIER_CODE_OBJECTIONS.filter(
        (o) => o.carrierName === carrier
      ).length;
      expect(count, `${carrier} objection count mismatch`).toBe(expectedCount);
    });
  }

  it("covers exactly 6 carriers in the objection map", () => {
    const carriers = new Set(
      CARRIER_CODE_OBJECTIONS.map((o) => o.carrierName)
    );
    expect(carriers.size).toBe(6);
  });
});

// ── getCarrierProfile ──────────────────────────────────────────────────────

describe("getCarrierProfile", () => {
  it('returns profile with name "State Farm" for exact match', () => {
    const profile = getCarrierProfile("State Farm");
    expect(profile).toBeDefined();
    expect(profile!.name).toBe("State Farm");
  });

  it('returns State Farm for alias "SF" (alias match)', () => {
    const profile = getCarrierProfile("SF");
    expect(profile).toBeDefined();
    expect(profile!.name).toBe("State Farm");
  });

  it('returns Erie for "erie" (case-insensitive match)', () => {
    const profile = getCarrierProfile("erie");
    expect(profile).toBeDefined();
    expect(profile!.name).toBe("Erie");
  });

  it('returns undefined for "Unknown Carrier"', () => {
    const profile = getCarrierProfile("Unknown Carrier");
    expect(profile).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    const profile = getCarrierProfile("");
    expect(profile).toBeUndefined();
  });

  it("returns profile for alias with different casing", () => {
    const profile = getCarrierProfile("state farm fire and casualty");
    expect(profile).toBeDefined();
    expect(profile!.name).toBe("State Farm");
  });

  it("trims whitespace from input", () => {
    const profile = getCarrierProfile("  Erie  ");
    expect(profile).toBeDefined();
    expect(profile!.name).toBe("Erie");
  });

  it("returns profile for each of the 13 carrier names", () => {
    const expectedNames = [
      "State Farm",
      "Erie",
      "Nationwide",
      "Allstate",
      "Travelers",
      "USAA",
      "Farmers",
      "Liberty Mutual",
      "Progressive",
      "Amica",
      "Auto-Owners",
      "Chubb",
      "Encompass",
    ];
    for (const name of expectedNames) {
      const profile = getCarrierProfile(name);
      expect(profile, `getCarrierProfile("${name}") returned undefined`).toBeDefined();
      expect(profile!.name).toBe(name);
    }
  });
});

// ── getCarrierCodeObjections ───────────────────────────────────────────────

describe("getCarrierCodeObjections", () => {
  it('returns at least 1 entry for "State Farm"', () => {
    const objections = getCarrierCodeObjections("State Farm");
    expect(objections.length).toBeGreaterThanOrEqual(1);
  });

  it('returns 8 objections for "State Farm" (exact count)', () => {
    const objections = getCarrierCodeObjections("State Farm");
    expect(objections).toHaveLength(8);
  });

  it("returns objections via alias match", () => {
    // "SF" is an alias for State Farm
    const objections = getCarrierCodeObjections("SF");
    expect(objections).toHaveLength(8);
    for (const obj of objections) {
      expect(obj.carrierName).toBe("State Farm");
    }
  });

  it("returns empty array for carrier with no objections", () => {
    // USAA has a profile but no entries in CARRIER_CODE_OBJECTIONS
    const objections = getCarrierCodeObjections("USAA");
    expect(objections).toHaveLength(0);
  });

  it("returns empty array for unknown carrier", () => {
    const objections = getCarrierCodeObjections("Unknown Carrier");
    expect(objections).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const objections = getCarrierCodeObjections("");
    expect(objections).toHaveLength(0);
  });

  it("is case-insensitive for direct carrier name match", () => {
    const objections = getCarrierCodeObjections("state farm");
    expect(objections.length).toBeGreaterThan(0);
    for (const obj of objections) {
      expect(obj.carrierName).toBe("State Farm");
    }
  });
});

// ── buildCarrierContextForPrompt ───────────────────────────────────────────

describe("buildCarrierContextForPrompt", () => {
  it('returns non-empty string for "State Farm"', () => {
    const context = buildCarrierContextForPrompt("State Farm");
    expect(context.length).toBeGreaterThan(0);
  });

  it("returns empty string for unknown carrier", () => {
    const context = buildCarrierContextForPrompt("Unknown Carrier");
    expect(context).toBe("");
  });

  it("returns empty string for empty input", () => {
    const context = buildCarrierContextForPrompt("");
    expect(context).toBe("");
  });

  it("includes carrier name in the output", () => {
    const context = buildCarrierContextForPrompt("State Farm");
    expect(context).toContain("STATE FARM");
  });

  it("includes aggressiveness level", () => {
    const context = buildCarrierContextForPrompt("State Farm");
    expect(context).toContain("AGGRESSIVE");
  });

  it("includes section headers for tactics, denial language, behavior, weaknesses", () => {
    const context = buildCarrierContextForPrompt("Erie");
    expect(context).toContain("Supplement Tactics");
    expect(context).toContain("Common Denial Language");
    expect(context).toContain("Adjuster Behavior");
    expect(context).toContain("Known Weaknesses");
    expect(context).toContain("Depreciation:");
    expect(context).toContain("Cosmetic Damage:");
  });

  it("includes code objection section for carriers that have objections", () => {
    const context = buildCarrierContextForPrompt("State Farm");
    expect(context).toContain("Code-Specific Objection Patterns");
    expect(context).toContain("IRC");
  });

  it("does NOT include code objection section for carriers without objections", () => {
    // USAA has a profile but no code objections
    const context = buildCarrierContextForPrompt("USAA");
    expect(context.length).toBeGreaterThan(0);
    expect(context).not.toContain("Code-Specific Objection Patterns");
  });

  it("includes the IMPORTANT instruction at the end", () => {
    const context = buildCarrierContextForPrompt("Allstate");
    expect(context).toContain("IMPORTANT:");
    expect(context).toContain("STRENGTHEN");
  });

  it("works with alias input", () => {
    const context = buildCarrierContextForPrompt("SF");
    expect(context).toContain("STATE FARM");
    expect(context.length).toBeGreaterThan(0);
  });
});
