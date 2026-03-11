// ── Policy Knowledge Base Tests ────────────────────────────────────────────
// Tests for packages/policy-engine/src/knowledge.ts
// Validates all exported constants and lookup functions.
//
// Spec counts (all verified against source):
//   COVERAGE_SECTIONS: 6
//   LANDMINE_RULES: 9
//   FAVORABLE_PROVISIONS: 4
//   BASE_FORM_EXCLUSIONS: 20 (HO-3: 12, HO-5: 5, HO-6: 3)
//   CARRIER_ENDORSEMENT_FORMS: 47
//   Carrier counts: State Farm 5, Erie 5, Nationwide 4, Allstate 4, Travelers 3,
//                   USAA 4, Farmers 3, Liberty Mutual 3, Progressive 3, Amica 3,
//                   Auto-Owners 3, Chubb 3, Encompass 4

import { describe, it, expect } from "vitest";
import {
  COVERAGE_SECTIONS,
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  BASE_FORM_EXCLUSIONS,
  CARRIER_ENDORSEMENT_FORMS,
  getLandminesForClaimType,
} from "./knowledge";

// ── COVERAGE_SECTIONS ──────────────────────────────────────────────────────

describe("COVERAGE_SECTIONS", () => {
  it("has exactly 6 entries (snapshot count)", () => {
    expect(COVERAGE_SECTIONS).toHaveLength(6);
  });

  it("each entry has non-empty id, label, and description", () => {
    for (const section of COVERAGE_SECTIONS) {
      expect(section.id, `section missing id`).toBeTruthy();
      expect(section.id.length).toBeGreaterThan(0);
      expect(section.label, `${section.id} missing label`).toBeTruthy();
      expect(section.label.length).toBeGreaterThan(0);
      expect(
        section.description,
        `${section.id} missing description`
      ).toBeTruthy();
      expect(section.description.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a valid claimRelevance value", () => {
    const validValues = ["primary", "secondary", "reference"] as const;
    for (const section of COVERAGE_SECTIONS) {
      expect(
        validValues,
        `${section.id} has invalid claimRelevance: "${section.claimRelevance}"`
      ).toContain(section.claimRelevance);
    }
  });

  it("each entry has a non-empty searchTerms array", () => {
    for (const section of COVERAGE_SECTIONS) {
      expect(
        section.searchTerms.length,
        `${section.id} has empty searchTerms`
      ).toBeGreaterThan(0);
    }
  });

  it("has no duplicate ids", () => {
    const ids = COVERAGE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size, "duplicate coverage section ids found").toBe(
      ids.length
    );
  });
});

// ── LANDMINE_RULES ─────────────────────────────────────────────────────────

describe("LANDMINE_RULES", () => {
  it("has exactly 9 entries (snapshot count)", () => {
    expect(LANDMINE_RULES).toHaveLength(9);
  });

  it("each entry has a valid severity", () => {
    const validSeverities = ["critical", "warning", "info"] as const;
    for (const rule of LANDMINE_RULES) {
      expect(
        validSeverities,
        `${rule.id} has invalid severity: "${rule.severity}"`
      ).toContain(rule.severity);
    }
  });

  it("each entry has a valid category", () => {
    const validCategories = [
      "exclusion",
      "limitation",
      "condition",
      "endorsement",
    ] as const;
    for (const rule of LANDMINE_RULES) {
      expect(
        validCategories,
        `${rule.id} has invalid category: "${rule.category}"`
      ).toContain(rule.category);
    }
  });

  it("each entry has non-empty typicalLanguage array", () => {
    for (const rule of LANDMINE_RULES) {
      expect(
        rule.typicalLanguage.length,
        `${rule.id} has empty typicalLanguage`
      ).toBeGreaterThan(0);
      for (const term of rule.typicalLanguage) {
        expect(
          term.length,
          `${rule.id} has empty string in typicalLanguage`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each entry has non-empty impact", () => {
    for (const rule of LANDMINE_RULES) {
      expect(rule.impact, `${rule.id} missing impact`).toBeTruthy();
      expect(rule.impact.length).toBeGreaterThan(0);
    }
  });

  it("each entry has non-empty actionItem", () => {
    for (const rule of LANDMINE_RULES) {
      expect(rule.actionItem, `${rule.id} missing actionItem`).toBeTruthy();
      expect(rule.actionItem.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate id values", () => {
    const ids = LANDMINE_RULES.map((r) => r.id);
    expect(new Set(ids).size, "duplicate landmine ids found").toBe(ids.length);
  });

  it("each entry has non-empty affectedClaimTypes array", () => {
    for (const rule of LANDMINE_RULES) {
      expect(
        rule.affectedClaimTypes.length,
        `${rule.id} has empty affectedClaimTypes`
      ).toBeGreaterThan(0);
    }
  });
});

// ── FAVORABLE_PROVISIONS ───────────────────────────────────────────────────

describe("FAVORABLE_PROVISIONS", () => {
  it("has exactly 4 entries (snapshot count)", () => {
    expect(FAVORABLE_PROVISIONS).toHaveLength(4);
  });

  it("each entry has non-empty searchTerms array", () => {
    for (const prov of FAVORABLE_PROVISIONS) {
      expect(
        prov.searchTerms.length,
        `${prov.id} has empty searchTerms`
      ).toBeGreaterThan(0);
      for (const term of prov.searchTerms) {
        expect(
          term.length,
          `${prov.id} has empty string in searchTerms`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("each entry has non-empty id, name, description, impact, supplementRelevance", () => {
    for (const prov of FAVORABLE_PROVISIONS) {
      expect(prov.id, "provision missing id").toBeTruthy();
      expect(prov.name, `${prov.id} missing name`).toBeTruthy();
      expect(prov.description, `${prov.id} missing description`).toBeTruthy();
      expect(prov.impact, `${prov.id} missing impact`).toBeTruthy();
      expect(
        prov.supplementRelevance,
        `${prov.id} missing supplementRelevance`
      ).toBeTruthy();
    }
  });

  it("has no duplicate ids", () => {
    const ids = FAVORABLE_PROVISIONS.map((p) => p.id);
    expect(new Set(ids).size, "duplicate favorable provision ids found").toBe(
      ids.length
    );
  });
});

// ── BASE_FORM_EXCLUSIONS ───────────────────────────────────────────────────

describe("BASE_FORM_EXCLUSIONS", () => {
  it("has exactly 20 entries (snapshot count)", () => {
    expect(BASE_FORM_EXCLUSIONS).toHaveLength(20);
  });

  it("each entry has formType of HO-3, HO-5, or HO-6", () => {
    const validFormTypes = ["HO-3", "HO-5", "HO-6"] as const;
    for (const excl of BASE_FORM_EXCLUSIONS) {
      expect(
        validFormTypes,
        `exclusion "${excl.name}" has invalid formType: "${excl.formType}"`
      ).toContain(excl.formType);
    }
  });

  it("each entry has claimRelevance of high, medium, or low", () => {
    const validRelevance = ["high", "medium", "low"] as const;
    for (const excl of BASE_FORM_EXCLUSIONS) {
      expect(
        validRelevance,
        `exclusion "${excl.name}" has invalid claimRelevance: "${excl.claimRelevance}"`
      ).toContain(excl.claimRelevance);
    }
  });

  it("each entry has non-empty name and description", () => {
    for (const excl of BASE_FORM_EXCLUSIONS) {
      expect(excl.name, "exclusion missing name").toBeTruthy();
      expect(excl.name.length).toBeGreaterThan(0);
      expect(
        excl.description,
        `${excl.name} missing description`
      ).toBeTruthy();
      expect(excl.description.length).toBeGreaterThan(0);
    }
  });

  it("each entry has isStandard set to true", () => {
    for (const excl of BASE_FORM_EXCLUSIONS) {
      expect(
        excl.isStandard,
        `${excl.name} (${excl.formType}) isStandard should be true`
      ).toBe(true);
    }
  });

  it("has 12 HO-3 exclusions", () => {
    const ho3 = BASE_FORM_EXCLUSIONS.filter((e) => e.formType === "HO-3");
    expect(ho3).toHaveLength(12);
  });

  it("has 5 HO-5 exclusions", () => {
    const ho5 = BASE_FORM_EXCLUSIONS.filter((e) => e.formType === "HO-5");
    expect(ho5).toHaveLength(5);
  });

  it("has 3 HO-6 exclusions", () => {
    const ho6 = BASE_FORM_EXCLUSIONS.filter((e) => e.formType === "HO-6");
    expect(ho6).toHaveLength(3);
  });
});

// ── CARRIER_ENDORSEMENT_FORMS ──────────────────────────────────────────────

describe("CARRIER_ENDORSEMENT_FORMS", () => {
  it("has exactly 47 entries (snapshot count)", () => {
    expect(CARRIER_ENDORSEMENT_FORMS).toHaveLength(47);
  });

  it("each entry has non-empty carrier, formNumber, name, and effect", () => {
    for (const form of CARRIER_ENDORSEMENT_FORMS) {
      expect(form.carrier, "form missing carrier").toBeTruthy();
      expect(form.carrier.length).toBeGreaterThan(0);
      expect(
        form.formNumber,
        `${form.carrier} form missing formNumber`
      ).toBeTruthy();
      expect(form.formNumber.length).toBeGreaterThan(0);
      expect(
        form.name,
        `${form.carrier} ${form.formNumber} missing name`
      ).toBeTruthy();
      expect(form.name.length).toBeGreaterThan(0);
      expect(
        form.effect,
        `${form.carrier} ${form.formNumber} missing effect`
      ).toBeTruthy();
      expect(form.effect.length).toBeGreaterThan(0);
    }
  });

  it("each entry has a valid severity", () => {
    const validSeverities = ["critical", "warning", "info"] as const;
    for (const form of CARRIER_ENDORSEMENT_FORMS) {
      expect(
        validSeverities,
        `${form.carrier} ${form.formNumber} has invalid severity: "${form.severity}"`
      ).toContain(form.severity);
    }
  });

  it("each entry has non-empty affectsFields array", () => {
    for (const form of CARRIER_ENDORSEMENT_FORMS) {
      expect(
        form.affectsFields.length,
        `${form.carrier} ${form.formNumber} has empty affectsFields`
      ).toBeGreaterThan(0);
    }
  });

  it("affectsFields values are all from the valid set", () => {
    const validFields = [
      "exclusions",
      "deductibles",
      "depreciation",
      "coverages",
    ] as const;
    for (const form of CARRIER_ENDORSEMENT_FORMS) {
      for (const field of form.affectsFields) {
        expect(
          validFields as readonly string[],
          `${form.carrier} ${form.formNumber} has invalid affectsFields value: "${field}"`
        ).toContain(field);
      }
    }
  });

  it("has no duplicate formNumber values", () => {
    const formNumbers = CARRIER_ENDORSEMENT_FORMS.map((f) => f.formNumber);
    expect(
      new Set(formNumbers).size,
      "duplicate endorsement form numbers found"
    ).toBe(formNumbers.length);
  });

  // ── Carrier count snapshot tests ──────────────────────────────────────

  const expectedCarrierCounts: Record<string, number> = {
    "State Farm": 5,
    Erie: 5,
    Nationwide: 4,
    Allstate: 4,
    Travelers: 3,
    USAA: 4,
    Farmers: 3,
    "Liberty Mutual": 3,
    Progressive: 3,
    Amica: 3,
    "Auto-Owners": 3,
    Chubb: 3,
    Encompass: 4,
  };

  for (const [carrier, expectedCount] of Object.entries(
    expectedCarrierCounts
  )) {
    it(`has ${expectedCount} ${carrier} forms`, () => {
      const count = CARRIER_ENDORSEMENT_FORMS.filter(
        (f) => f.carrier === carrier
      ).length;
      expect(count, `${carrier} form count mismatch`).toBe(expectedCount);
    });
  }

  it("covers exactly 13 carriers", () => {
    const carriers = new Set(CARRIER_ENDORSEMENT_FORMS.map((f) => f.carrier));
    expect(carriers.size).toBe(13);
  });
});

// ── getLandminesForClaimType ────────────────────────────────────────────────

describe("getLandminesForClaimType", () => {
  it("returns all 9 landmines when claimType is undefined", () => {
    const result = getLandminesForClaimType(undefined);
    expect(result).toHaveLength(9);
    expect(result).toBe(LANDMINE_RULES); // same reference — no filter applied
  });

  it("returns all 9 landmines when claimType is empty string", () => {
    const result = getLandminesForClaimType("");
    expect(result).toHaveLength(9);
  });

  it('returns subset for claimType "hail"', () => {
    const result = getLandminesForClaimType("hail");
    // "hail" maps to matchTypes ["hail", "wind_hail", "impact"]
    // All 9 landmines have at least one of these in affectedClaimTypes
    expect(result).toHaveLength(9);
    // Every returned rule should have at least one matching claim type
    for (const rule of result) {
      const hasMatch = rule.affectedClaimTypes.some((ct) =>
        ["hail", "wind_hail", "impact"].includes(ct)
      );
      expect(
        hasMatch,
        `${rule.id} should match hail claim type`
      ).toBe(true);
    }
  });

  it('returns 4 landmines for claimType "fire"', () => {
    const result = getLandminesForClaimType("fire");
    // "fire" maps to matchTypes ["fire"]
    // Only 4 landmines have "fire" in affectedClaimTypes:
    // acv_depreciation, duty_to_cooperate, no_law_ordinance, assignment_of_benefits
    expect(result).toHaveLength(4);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("acv_depreciation");
    expect(ids).toContain("duty_to_cooperate");
    expect(ids).toContain("no_law_ordinance");
    expect(ids).toContain("assignment_of_benefits");
  });

  it('returns all 9 for claimType "wind" (all match wind or wind_hail)', () => {
    const result = getLandminesForClaimType("wind");
    // "wind" maps to matchTypes ["wind", "wind_hail"]
    // All 9 landmines have either "wind" or "wind_hail" in their affectedClaimTypes
    expect(result).toHaveLength(9);
  });

  it('returns all 9 for claimType "water" (no matches, falls back to all)', () => {
    const result = getLandminesForClaimType("water");
    // "water" maps to matchTypes ["water", "flood"]
    // No landmines have "water" or "flood" -> empty filter -> fallback to all 9
    expect(result).toHaveLength(9);
  });

  it('returns all 9 for claimType "other" (mapped to empty array, returns all)', () => {
    const result = getLandminesForClaimType("other");
    // "other" maps to empty matchTypes [] -> returns all
    expect(result).toHaveLength(9);
  });

  it("returns all 9 for an unknown claim type (not in typeMap)", () => {
    const result = getLandminesForClaimType("tornado");
    // "tornado" is not in typeMap -> matchTypes is undefined -> returns all
    expect(result).toHaveLength(9);
  });
});
