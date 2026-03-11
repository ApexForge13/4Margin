import { describe, it, expect } from "vitest";
import {
  BUILDING_CODES,
  getCodesForState,
  getCodesForXactimateCode,
  getJurisdictionInfo,
  buildCodeContextForPrompt,
  validateIrcReference,
  enrichIrcReference,
  ircSectionToUrl,
} from "./building-codes";

// ── Data Integrity ────────────────────────────────────────────────────────

describe("BUILDING_CODES data integrity", () => {
  it("has exactly 29 entries", () => {
    expect(BUILDING_CODES).toHaveLength(29);
  });

  it("every code has non-empty id, section, title, requirement, justificationText", () => {
    for (const code of BUILDING_CODES) {
      expect(code.id, `${code.id} missing id`).toBeTruthy();
      expect(code.section, `${code.id} missing section`).toBeTruthy();
      expect(code.title, `${code.id} missing title`).toBeTruthy();
      expect(code.requirement, `${code.id} missing requirement`).toBeTruthy();
      expect(
        code.justificationText,
        `${code.id} missing justificationText`
      ).toBeTruthy();
    }
  });

  it('every id starts with "IRC-" or is a known non-IRC id (PERMIT-FEE)', () => {
    const knownNonIrc = ["PERMIT-FEE"];
    for (const code of BUILDING_CODES) {
      const isIrc = code.id.startsWith("IRC-");
      const isKnown = knownNonIrc.includes(code.id);
      expect(
        isIrc || isKnown,
        `Unexpected id format: ${code.id}`
      ).toBe(true);
    }
  });

  it("every category is one of the valid values", () => {
    const validCategories = [
      "roofing",
      "flashing",
      "ventilation",
      "gutters",
      "siding",
      "insulation",
      "general",
    ];
    for (const code of BUILDING_CODES) {
      expect(
        validCategories,
        `Invalid category "${code.category}" on ${code.id}`
      ).toContain(code.category);
    }
  });

  // NOTE: 2 codes (IRC-R105.1, IRC-R301.2.1) have empty xactimateCodes
  // arrays because they are general/policy codes without direct Xactimate
  // line items. We verify the exact count here.
  it("most codes have at least 1 xactimate code (2 exceptions with empty arrays)", () => {
    const codesWithEmptyXactimate = BUILDING_CODES.filter(
      (c) => c.xactimateCodes.length === 0
    );
    expect(codesWithEmptyXactimate).toHaveLength(2);

    const emptyIds = codesWithEmptyXactimate.map((c) => c.id).sort();
    expect(emptyIds).toEqual(
      ["IRC-R105.1", "IRC-R301.2.1"].sort()
    );

    const codesWithXactimate = BUILDING_CODES.filter(
      (c) => c.xactimateCodes.length > 0
    );
    expect(codesWithXactimate).toHaveLength(27); // 29 total - 2 without xactimate codes
    for (const code of codesWithXactimate) {
      expect(
        code.xactimateCodes.length,
        `${code.id} should have at least 1 xactimate code`
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every jurisdictions array has exactly 3 entries (MD, PA, DE)", () => {
    for (const code of BUILDING_CODES) {
      expect(
        code.jurisdictions,
        `${code.id} should have 3 jurisdictions`
      ).toHaveLength(3);

      const states = code.jurisdictions.map((j) => j.state).sort();
      expect(states, `${code.id} should cover DE, MD, PA`).toEqual([
        "DE",
        "MD",
        "PA",
      ]);
    }
  });

  it("each JurisdictionCode has valid state, non-empty ircEdition and sourceRef", () => {
    const validStates = ["MD", "PA", "DE"];
    for (const code of BUILDING_CODES) {
      for (const j of code.jurisdictions) {
        expect(
          validStates,
          `Invalid state "${j.state}" on ${code.id}`
        ).toContain(j.state);
        expect(
          j.ircEdition,
          `${code.id} ${j.state} missing ircEdition`
        ).toBeTruthy();
        expect(
          j.sourceRef,
          `${code.id} ${j.state} missing sourceRef`
        ).toBeTruthy();
      }
    }
  });

  it("has no duplicate id values", () => {
    const ids = BUILDING_CODES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size, "Duplicate ids found").toBe(ids.length);
  });

  it("carrierObjectionRate is high, medium, or low for every code", () => {
    const validRates = ["high", "medium", "low"];
    for (const code of BUILDING_CODES) {
      expect(
        validRates,
        `Invalid carrierObjectionRate "${code.carrierObjectionRate}" on ${code.id}`
      ).toContain(code.carrierObjectionRate);
    }
  });

  it("every code has non-empty typicalObjection and rebuttal", () => {
    for (const code of BUILDING_CODES) {
      expect(
        code.typicalObjection,
        `${code.id} missing typicalObjection`
      ).toBeTruthy();
      expect(code.rebuttal, `${code.id} missing rebuttal`).toBeTruthy();
    }
  });
});

// ── Lookup Functions ──────────────────────────────────────────────────────

describe("getCodesForState", () => {
  it('returns all codes for "MD" (all codes apply to all states)', () => {
    const codes = getCodesForState("MD");
    expect(codes).toHaveLength(BUILDING_CODES.length);
  });

  it('returns all codes for "PA"', () => {
    expect(getCodesForState("PA")).toHaveLength(BUILDING_CODES.length);
  });

  it('returns all codes for "DE"', () => {
    expect(getCodesForState("DE")).toHaveLength(BUILDING_CODES.length);
  });

  it("handles lowercase state input", () => {
    expect(getCodesForState("md")).toHaveLength(BUILDING_CODES.length);
  });

  it("returns empty array for unsupported state", () => {
    expect(getCodesForState("TX")).toHaveLength(0);
  });
});

describe("getCodesForXactimateCode", () => {
  it('returns at least 1 code for "RFG DRIP" in MD', () => {
    const codes = getCodesForXactimateCode("RFG DRIP", "MD");
    expect(codes.length).toBeGreaterThanOrEqual(1);
    // Verify the returned code actually contains RFG DRIP
    for (const code of codes) {
      expect(code.xactimateCodes).toContain("RFG DRIP");
    }
  });

  it('returns codes for "RFG IWS" in PA', () => {
    const codes = getCodesForXactimateCode("RFG IWS", "PA");
    expect(codes.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array for non-existent xactimate code", () => {
    expect(getCodesForXactimateCode("FAKE CODE", "MD")).toHaveLength(0);
  });

  it("returns empty array for valid code but unsupported state", () => {
    expect(getCodesForXactimateCode("RFG DRIP", "TX")).toHaveLength(0);
  });

  it("is case-sensitive for xactimate codes (by design)", () => {
    expect(getCodesForXactimateCode("rfg drip", "MD")).toHaveLength(0);
  });
});

describe("validateIrcReference", () => {
  it('returns a BuildingCode for "R905.2.1" in MD', () => {
    const result = validateIrcReference("R905.2.1", "MD");
    expect(result).not.toBeNull();
    expect(result!.section).toBe("R905.2.1");
  });

  it('returns null for "FAKE.CODE" in MD', () => {
    const result = validateIrcReference("FAKE.CODE", "MD");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(validateIrcReference("", "MD")).toBeNull();
  });

  it("handles IRC-prefixed references via fuzzy matching", () => {
    const result = validateIrcReference("IRC R905.2.8.5", "MD");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("IRC-R905.2.8.5");
  });

  it("matches parent section to child code (fuzzy match)", () => {
    // "R905.2.8" should match "R905.2.8.2" (starter strip) via parent matching
    const result = validateIrcReference("R905.2.8", "MD");
    expect(result).not.toBeNull();
  });
});

describe("enrichIrcReference", () => {
  it('returns verified: true for "R905.2.1" in MD', () => {
    const result = enrichIrcReference("R905.2.1", "MD");
    expect(result.verified).toBe(true);
    expect(result.sourceRef).toBeTruthy();
    expect(result.reference).toContain("R905.2.1");
  });

  it("returns verified: false for unknown reference", () => {
    const result = enrichIrcReference("R999.99", "MD");
    expect(result.verified).toBe(false);
    expect(result.sourceRef).toBeNull();
  });
});

describe("ircSectionToUrl", () => {
  it('returns a string containing "codes.iccsafe.org" for "R905.2.1"', () => {
    const url = ircSectionToUrl("R905.2.1");
    expect(url).not.toBeNull();
    expect(url).toContain("codes.iccsafe.org");
  });

  it("returns null for null input", () => {
    expect(ircSectionToUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(ircSectionToUrl(undefined)).toBeNull();
  });

  it('returns null for "N/A"', () => {
    expect(ircSectionToUrl("N/A")).toBeNull();
  });

  it("maps chapter 9 sections to roof-assemblies path", () => {
    const url = ircSectionToUrl("R905.2.8.2");
    expect(url).toContain("chapter-9-roof-assemblies");
  });

  it("maps chapter 8 sections to roof-ceiling-construction path", () => {
    const url = ircSectionToUrl("R806.1");
    expect(url).toContain("chapter-8-roof-ceiling-construction");
  });

  it("maps chapter 3 sections to building-planning path", () => {
    const url = ircSectionToUrl("R301.2.1");
    expect(url).toContain("chapter-3-building-planning");
  });
});

// ── Supporting Functions ──────────────────────────────────────────────────

describe("getJurisdictionInfo", () => {
  it("returns jurisdiction info for a valid code and state", () => {
    const code = BUILDING_CODES[0];
    const info = getJurisdictionInfo(code, "MD");
    expect(info).toBeDefined();
    expect(info!.state).toBe("MD");
    expect(info!.ircEdition).toBeTruthy();
  });

  it("returns undefined for unsupported state", () => {
    const code = BUILDING_CODES[0];
    expect(getJurisdictionInfo(code, "TX")).toBeUndefined();
  });

  it("handles lowercase state input", () => {
    const code = BUILDING_CODES[0];
    const info = getJurisdictionInfo(code, "pa");
    expect(info).toBeDefined();
    expect(info!.state).toBe("PA");
  });
});

describe("buildCodeContextForPrompt", () => {
  it("returns a non-empty string for MD", () => {
    const prompt = buildCodeContextForPrompt("MD");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("JURISDICTION-VERIFIED BUILDING CODES");
    expect(prompt).toContain("MD");
  });

  it("returns empty string for unsupported state", () => {
    expect(buildCodeContextForPrompt("TX")).toBe("");
  });

  it("groups codes by category", () => {
    const prompt = buildCodeContextForPrompt("MD");
    expect(prompt).toContain("### ROOFING");
    expect(prompt).toContain("### FLASHING");
    expect(prompt).toContain("### VENTILATION");
  });

  it("uses correct jurisdiction header for DE", () => {
    const prompt = buildCodeContextForPrompt("DE");
    expect(prompt).toContain("2021 IRC");
    expect(prompt).toContain("Delaware Code Title 16");
  });

  it("uses correct jurisdiction header for PA", () => {
    const prompt = buildCodeContextForPrompt("PA");
    expect(prompt).toContain("Uniform Construction Code");
  });
});
