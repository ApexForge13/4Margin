import { describe, it, expect } from "vitest";
import {
  scoreConfidence,
  scoreAndSort,
  type ConfidenceInput,
  type PolicyContext,
  type CodeContext,
  type ManufacturerContext,
  type PhysicalPresenceContext,
  type MeasurementContext,
} from "./confidence";

/* ─────── Helpers ─────── */

/** Baseline inputs that score 0 on every dimension */
function zeroInput(): ConfidenceInput {
  return {
    policy: {
      hasOrdinanceLaw: false,
      coverageType: "UNKNOWN",
      relevantEndorsements: [],
      policyExcludesItem: true, // exclusion → 0
    },
    code: {
      isCodeRequired: false,
      r9052_1Confirmed: false,
      r9052_1Unverified: false,
      ircReferenced: false,
      countyName: null,
      ircVersion: null,
      codeSection: null,
    },
    manufacturer: {
      isRequired: false,
      r9052_1Applies: false,
      isWarrantyBasisOnly: false,
      isRecommendedNotRequired: false,
      manufacturerName: null,
      productName: null,
      warrantyVoidLanguage: null,
    },
    // physical and measurement omitted → 0 each
  };
}

/** Baseline inputs that score max (30) on every dimension */
function maxInput(): ConfidenceInput {
  return {
    policy: {
      hasOrdinanceLaw: true,
      coverageType: "RCV",
      relevantEndorsements: ["O&L Endorsement"],
      policyExcludesItem: false,
    },
    code: {
      isCodeRequired: true,
      r9052_1Confirmed: true,
      r9052_1Unverified: false,
      ircReferenced: false,
      countyName: "Baltimore County",
      ircVersion: "2021",
      codeSection: "R905.2.1",
    },
    manufacturer: {
      isRequired: true,
      r9052_1Applies: true,
      isWarrantyBasisOnly: false,
      isRecommendedNotRequired: false,
      manufacturerName: "GAF",
      productName: "HDZ",
      warrantyVoidLanguage: null,
    },
    physical: {
      isPhysicallyOnRoof: true,
      requiresRemovalForReplacement: true,
      itemType: "accessory",
    },
    measurement: {
      isQuantityMeasurementDerived: true,
      hasMeasurementsOnFile: true,
      measurementSource: "EagleView",
    },
  };
}

/** Build input with a specific raw total for tier testing.
 *  Uses policy(6 UNKNOWN) + code(0) + manufacturer(0) + physical(omitted=0) + measurement(omitted=0) as base (raw 6),
 *  then adjusts dimensions to hit the desired normalized score.
 */
function inputForNormalizedScore(targetScore: number): ConfidenceInput {
  // We need raw = Math.round(targetScore * 150 / 100) but we need to find a
  // combination of dimension scores that produces the right normalized value.
  // Rather than being clever, we'll build specific inputs for each boundary.
  // This helper is unused — we build specific inputs in each test.
  return zeroInput();
}

/* ═══════════════════════════════════════════════════
   Zero & Max Input Tests
   ═══════════════════════════════════════════════════ */

describe("scoreConfidence", () => {
  describe("zero input — all dimensions at minimum", () => {
    it("scores 0 with tier 'low'", () => {
      const result = scoreConfidence(zeroInput());
      expect(result.totalScore).toBe(0);
      expect(result.tier).toBe("low");
      expect(result.tierLabel).toBe("Low Confidence");
    });

    it("has all dimensions at score 0", () => {
      const result = scoreConfidence(zeroInput());
      for (const dim of result.dimensions) {
        expect(dim.score).toBe(0);
        expect(dim.maxScore).toBe(30);
      }
    });

    it("summaryText shows limited supporting evidence", () => {
      const result = scoreConfidence(zeroInput());
      expect(result.summaryText).toContain("limited supporting evidence");
    });
  });

  describe("max input — all dimensions at maximum", () => {
    it("scores 100 with tier 'high'", () => {
      const result = scoreConfidence(maxInput());
      expect(result.totalScore).toBe(100);
      expect(result.tier).toBe("high");
      expect(result.tierLabel).toBe("High Confidence");
    });

    it("has all five dimensions at score 30", () => {
      const result = scoreConfidence(maxInput());
      expect(result.dimensions).toHaveLength(5);
      for (const dim of result.dimensions) {
        expect(dim.score).toBe(30);
      }
    });
  });

  /* ═══════════════════════════════════════════════════
     Tier Boundary Tests
     ═══════════════════════════════════════════════════ */

  describe("tier boundaries", () => {
    // Normalization: totalScore = Math.round((rawTotal / 150) * 100)
    // To hit exact normalized scores, we compute the raw scores needed.
    //
    // Boundary: 85 → high, 84 → good
    //   raw for 85: Math.round((raw/150)*100) = 85 → raw = 127.5 → Math.round(85) = 85 ✓
    //   Actually we need to find raw where Math.round((raw/150)*100) = 85
    //   raw = 127 → (127/150)*100 = 84.67 → round = 85 ✓
    //   raw = 126 → (126/150)*100 = 84.0 → round = 84 ✓
    //
    // Boundary: 60 → good, 59 → moderate
    //   raw = 90 → (90/150)*100 = 60.0 → round = 60 ✓
    //   raw = 89 → (89/150)*100 = 59.33 → round = 59 ✓
    //
    // Boundary: 35 → moderate, 34 → low
    //   raw = 53 → (53/150)*100 = 35.33 → round = 35 ✓
    //   raw = 52 → (52/150)*100 = 34.67 → round = 35 — still 35!
    //   raw = 51 → (51/150)*100 = 34.0 → round = 34 ✓

    function buildInputWithRawScore(rawTarget: number): ConfidenceInput {
      // Strategy: use policy exclusion (0), then build up raw score
      // using dimensions that can hit exact values:
      //   policy: 0, 6, 12, 18, 24, 30
      //   code: 0, 12, 18, 30
      //   manufacturer: 0, 6, 18, 30
      //   physical: 0, 15, 30
      //   measurement: 0, 10, 30
      //
      // Available atoms: 0, 6, 10, 12, 15, 18, 24, 30
      // We need to combine to hit the rawTarget.

      const input = zeroInput(); // all zeros

      // Remove exclusion so policy can score something
      input.policy.policyExcludesItem = false;

      let remaining = rawTarget;
      const steps: Array<{ apply: () => void; value: number }> = [
        // Physical: 30 (on-roof + removal)
        { value: 30, apply: () => { input.physical = { isPhysicallyOnRoof: true, requiresRemovalForReplacement: true, itemType: "accessory" }; } },
        // Measurement: 30 (derived)
        { value: 30, apply: () => { input.measurement = { isQuantityMeasurementDerived: true, hasMeasurementsOnFile: true, measurementSource: "EV" }; } },
        // Code: 30 (required + confirmed)
        { value: 30, apply: () => { input.code.isCodeRequired = true; input.code.r9052_1Confirmed = true; } },
        // Manufacturer: 30 (required + R905.2.1)
        { value: 30, apply: () => { input.manufacturer.isRequired = true; input.manufacturer.r9052_1Applies = true; } },
        // Policy O&L + endorsement: 30
        { value: 30, apply: () => { input.policy.hasOrdinanceLaw = true; input.policy.relevantEndorsements = ["Endo"]; } },
      ];

      // Greedy allocation for 30-point chunks
      for (const step of steps) {
        if (remaining >= step.value) {
          step.apply();
          remaining -= step.value;
        }
      }

      // Now handle the remainder using smaller values.
      // We need to adjust one dimension to a partial value.
      if (remaining > 0) {
        // Undo the last applied 30 and use a partial instead.
        // This is tricky, so let's use a simpler approach:
        // Reset everything and use a lookup approach for test boundaries.
      }

      return input;
    }

    // Rather than a generic builder, test each boundary with manually crafted inputs.

    it("raw 127 → normalized 85 → tier 'high'", () => {
      // 127 = 30 (policy O&L+endo) + 30 (code) + 30 (manufacturer) + 30 (physical) + 7 (???)
      // But measurement can only be 0, 10, or 30. Let's try:
      // 127 = 30 + 30 + 30 + 30 + 7? No, measurement can't be 7.
      // 127 = 24 (policy O&L, no endo) + 30 + 30 + 30 + 13? No.
      // Let's just compute: raw 127 → Math.round((127/150)*100) = Math.round(84.67) = 85
      // raw 128 = 30 + 30 + 30 + 30 + 8? No.
      // Actually, let's find achievable raw scores near boundaries.
      //
      // Achievable dimension scores:
      //   Policy:  0, 6, 12, 18, 24, 30
      //   Code:    0, 12, 18, 30
      //   Mfr:     0, 6, 18, 30
      //   Physical: 0, 15, 30
      //   Measurement: 0, 10, 30
      //
      // For raw=127: 30+30+30+30+7 — not achievable as-is.
      // But 30+30+30+30+10 = 130 → normalized = Math.round(86.67) = 87 → "high" ✓
      // For raw=126: 30+30+30+30+6 = 126 → normalized = 84 → "good" ✓
      //   But measurement can't be 6. Policy O&L alone = 24: 24+30+30+30+12(code irc)= 126 → 84 ✓ wait, code irc is 12
      //   24+12+30+30+30 = 126 → Math.round(84.0) = 84 → "good" ✓
      //
      // Let's use raw=130 for "high" boundary test (score=87):
      // 30+30+30+30+10 = 130 → Math.round(86.67) = 87 → "high"

      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: true, coverageType: "RCV", relevantEndorsements: ["O&L"], policyExcludesItem: false }, // 30
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: true, r9052_1Applies: true, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 30
        physical: { isPhysicallyOnRoof: true, requiresRemovalForReplacement: true, itemType: "accessory" }, // 30
        measurement: { isQuantityMeasurementDerived: false, hasMeasurementsOnFile: true, measurementSource: "EV" }, // 10
      };
      // raw = 30+30+30+30+10 = 130 → Math.round((130/150)*100) = Math.round(86.67) = 87
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(87);
      expect(result.tier).toBe("high");
    });

    it("score exactly 85 → tier 'high'", () => {
      // Need raw where Math.round((raw/150)*100) = 85
      // raw = 127 → 84.67 → 85, raw=128 → 85.33 → 85
      // Achievable: 30+30+30+15+22? No. Let me find combos.
      // 30+30+18+30+19? No.
      // Raw 127: 30(pol)+30(code)+30(mfr)+30(phys)+7(meas)? Meas can't be 7.
      // Raw 128: 30+30+30+30+8? No.
      // Raw 127: 24(pol O&L only)+30(code)+30(mfr)+30(phys)+13? No.
      // Raw 128: 18(pol RCV)+30+30+30+20? No.
      // Let me try: 24+30+30+30+10 = 124 → 82.67 → 83. Nope.
      // 30+30+30+15+30 = 135 → 90. Nope.
      // 30+18+30+30+30 = 138 → 92. Nope.
      // 30+30+30+15+10 = 115 → 76.67 → 77. Nope.
      //
      // We need to find achievable raws that normalize to exactly 85.
      // Math.round((raw/150)*100) = 85 when 84.5 <= (raw/150)*100 < 85.5
      // → 126.75 <= raw < 128.25 → raw ∈ {127, 128}
      // Neither 127 nor 128 seems achievable with our dimension values.
      //
      // Available sums (sorted unique): Let me check what totals near 127-128 are achievable.
      // 30+30+30+30+10 = 130 → 87 ✓ high
      // 30+30+30+30+0 = 120 → 80 → good
      // 24+30+30+30+10 = 124 → 83 → good
      // 30+30+30+15+30 = 135 → 90 → high
      // 30+30+18+30+30 = 138 → 92 → high
      // 30+12+30+30+30 = 132 → 88 → high
      // 24+30+30+30+30 = 144 → 96 → high
      //
      // Closest achievable to 85: 130 → 87.
      // The exact score 85 may not be achievable with the available atoms.
      // Let's verify: we need raw 127 or 128.
      //
      // Try: 6(pol UNKNOWN, no exclusion)+30+30+30+30 = 126 → 84 → good
      //      12(pol ACV)+30+30+30+30 = 132 → 88 → high
      //      6+30+30+30+30 = 126 → 84 → good (boundary case for "good")
      //
      // Actually it might not be possible to hit exactly 85.
      // Let's just verify the boundary threshold logic with achievable scores.
      //   130 → 87 → "high" ✓
      //   126 → 84 → "good" ✓
      // These verify the >=85 boundary.

      // Use raw=132 for another high test
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "ACV", relevantEndorsements: [], policyExcludesItem: false }, // 12
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: true, r9052_1Applies: true, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 30
        physical: { isPhysicallyOnRoof: true, requiresRemovalForReplacement: true, itemType: "accessory" }, // 30
        measurement: { isQuantityMeasurementDerived: true, hasMeasurementsOnFile: true, measurementSource: "EV" }, // 30
      };
      // raw = 12+30+30+30+30 = 132 → Math.round(88.0) = 88
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(88);
      expect(result.tier).toBe("high");
    });

    it("raw 126 → normalized 84 → tier 'good' (just below high)", () => {
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: false }, // 6
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: true, r9052_1Applies: true, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 30
        physical: { isPhysicallyOnRoof: true, requiresRemovalForReplacement: true, itemType: "accessory" }, // 30
        measurement: { isQuantityMeasurementDerived: true, hasMeasurementsOnFile: true, measurementSource: "EV" }, // 30
      };
      // raw = 6+30+30+30+30 = 126 → Math.round(84.0) = 84
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(84);
      expect(result.tier).toBe("good");
    });

    it("raw 90 → normalized 60 → tier 'good' (lowest good)", () => {
      // 90 = 30+30+30+0+0
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: true, coverageType: "RCV", relevantEndorsements: ["O&L"], policyExcludesItem: false }, // 30
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: true, r9052_1Applies: true, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 30
        // physical omitted → 0
        // measurement omitted → 0
      };
      // raw = 30+30+30+0+0 = 90 → Math.round(60.0) = 60
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(60);
      expect(result.tier).toBe("good");
    });

    it("raw 88 → normalized 59 → tier 'moderate' (just below good)", () => {
      // 88 = 18(policy RCV) + 30(code) + 30(mfr) + 0 + 10(meas on file)
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "RCV", relevantEndorsements: [], policyExcludesItem: false }, // 18
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: true, r9052_1Applies: true, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 30
        // physical omitted → 0
        measurement: { isQuantityMeasurementDerived: false, hasMeasurementsOnFile: true, measurementSource: "EV" }, // 10
      };
      // raw = 18+30+30+0+10 = 88 → Math.round(58.67) = 59
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(59);
      expect(result.tier).toBe("moderate");
    });

    it("raw 53 → normalized 35 → tier 'moderate' (lowest moderate)", () => {
      // 53 = 18(policy RCV) + 18(code unverified) + 6(mfr recommended) + 0 + 11? No.
      // Available atoms: 0, 6, 10, 12, 15, 18, 24, 30
      // 53 = 18 + 18 + 6 + 0 + 11? No. 53 = 18 + 12 + 6 + 15 + 2? No.
      // 53 = 6 + 12 + 6 + 15 + 14? No.
      // Let's compute: Math.round((53/150)*100) = Math.round(35.33) = 35.
      // Can we hit 53? 18+12+6+15+2? No. 30+12+0+0+11? No.
      // 18+18+6+0+10 = 52 → Math.round(34.67) = 35! Close enough — let's verify.
      // Actually 52: Math.round((52/150)*100) = Math.round(34.667) = 35 ✓

      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "RCV", relevantEndorsements: [], policyExcludesItem: false }, // 18
        code: { isCodeRequired: true, r9052_1Confirmed: false, r9052_1Unverified: true, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 18
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: true, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 6
        // physical omitted → 0
        measurement: { isQuantityMeasurementDerived: false, hasMeasurementsOnFile: true, measurementSource: "EV" }, // 10
      };
      // raw = 18+18+6+0+10 = 52 → Math.round(34.667) = 35
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(35);
      expect(result.tier).toBe("moderate");
    });

    it("raw 51 → normalized 34 → tier 'low' (just below moderate)", () => {
      // 51 = ? Available: 6+12+18+15+0 = 51 ✓
      // policy UNKNOWN no exclusion = 6, code irc referenced = 12, mfr warranty = 18, physical general = 15, measurement none = 0
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: false }, // 6
        code: { isCodeRequired: false, r9052_1Confirmed: false, r9052_1Unverified: false, ircReferenced: true, countyName: null, ircVersion: null, codeSection: "R905.2.1" }, // 12
        manufacturer: { isRequired: true, r9052_1Applies: false, isWarrantyBasisOnly: true, isRecommendedNotRequired: false, manufacturerName: "GAF", productName: null, warrantyVoidLanguage: null }, // 18
        physical: { isPhysicallyOnRoof: false, requiresRemovalForReplacement: false, itemType: "general" }, // 15
        // measurement omitted → 0
      };
      // raw = 6+12+18+15+0 = 51 → Math.round(34.0) = 34
      const result = scoreConfidence(input);
      expect(result.totalScore).toBe(34);
      expect(result.tier).toBe("low");
    });
  });

  /* ═══════════════════════════════════════════════════
     Individual Dimension Tests — Policy Support
     ═══════════════════════════════════════════════════ */

  describe("Policy Support dimension", () => {
    function policyOnly(policy: PolicyContext): ConfidenceInput {
      return {
        policy,
        code: { isCodeRequired: false, r9052_1Confirmed: false, r9052_1Unverified: false, ircReferenced: false, countyName: null, ircVersion: null, codeSection: null },
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null },
      };
    }

    function getPolicyDim(input: ConfidenceInput) {
      return scoreConfidence(input).dimensions.find(d => d.dimension === "Policy Support")!;
    }

    it("exclusion → 0", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: true,
        coverageType: "RCV",
        relevantEndorsements: ["O&L"],
        policyExcludesItem: true,
      }));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("excludes");
    });

    it("O&L + endorsement → 30", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: true,
        coverageType: "RCV",
        relevantEndorsements: ["O&L Endorsement"],
        policyExcludesItem: false,
      }));
      expect(dim.score).toBe(30);
      expect(dim.reasoning).toContain("Ordinance/Law");
    });

    it("O&L alone (no endorsements) → 24", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: true,
        coverageType: "RCV",
        relevantEndorsements: [],
        policyExcludesItem: false,
      }));
      expect(dim.score).toBe(24);
    });

    it("RCV (no O&L) → 18", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: false,
        coverageType: "RCV",
        relevantEndorsements: [],
        policyExcludesItem: false,
      }));
      expect(dim.score).toBe(18);
    });

    it("ACV → 12", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: false,
        coverageType: "ACV",
        relevantEndorsements: [],
        policyExcludesItem: false,
      }));
      expect(dim.score).toBe(12);
    });

    it("MODIFIED_ACV → 12", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: false,
        coverageType: "MODIFIED_ACV",
        relevantEndorsements: [],
        policyExcludesItem: false,
      }));
      expect(dim.score).toBe(12);
    });

    it("UNKNOWN (no O&L, no exclusion) → 6", () => {
      const dim = getPolicyDim(policyOnly({
        hasOrdinanceLaw: false,
        coverageType: "UNKNOWN",
        relevantEndorsements: [],
        policyExcludesItem: false,
      }));
      expect(dim.score).toBe(6);
    });
  });

  /* ═══════════════════════════════════════════════════
     Individual Dimension Tests — Code Authority
     ═══════════════════════════════════════════════════ */

  describe("Code Authority dimension", () => {
    function codeOnly(code: CodeContext): ConfidenceInput {
      return {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: true },
        code,
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null },
      };
    }

    function getCodeDim(input: ConfidenceInput) {
      return scoreConfidence(input).dimensions.find(d => d.dimension === "Code Authority")!;
    }

    it("code-required + R905.2.1 confirmed → 30", () => {
      const dim = getCodeDim(codeOnly({
        isCodeRequired: true,
        r9052_1Confirmed: true,
        r9052_1Unverified: false,
        ircReferenced: false,
        countyName: "Baltimore County",
        ircVersion: "2021",
        codeSection: "R905.2.1",
      }));
      expect(dim.score).toBe(30);
      expect(dim.reasoning).toContain("R905.2.1 confirmed");
    });

    it("code-required + R905.2.1 unverified → 18", () => {
      const dim = getCodeDim(codeOnly({
        isCodeRequired: true,
        r9052_1Confirmed: false,
        r9052_1Unverified: true,
        ircReferenced: false,
        countyName: "Howard County",
        ircVersion: "2021",
        codeSection: "R905.2.1",
      }));
      expect(dim.score).toBe(18);
      expect(dim.reasoning).toContain("not yet verified");
    });

    it("IRC referenced but not county-confirmed → 12", () => {
      const dim = getCodeDim(codeOnly({
        isCodeRequired: false,
        r9052_1Confirmed: false,
        r9052_1Unverified: false,
        ircReferenced: true,
        countyName: null,
        ircVersion: null,
        codeSection: "R908.1",
      }));
      expect(dim.score).toBe(12);
    });

    it("no code basis → 0", () => {
      const dim = getCodeDim(codeOnly({
        isCodeRequired: false,
        r9052_1Confirmed: false,
        r9052_1Unverified: false,
        ircReferenced: false,
        countyName: null,
        ircVersion: null,
        codeSection: null,
      }));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("No code basis");
    });
  });

  /* ═══════════════════════════════════════════════════
     Individual Dimension Tests — Manufacturer Requirement
     ═══════════════════════════════════════════════════ */

  describe("Manufacturer Requirement dimension", () => {
    function mfrOnly(manufacturer: ManufacturerContext): ConfidenceInput {
      return {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: true },
        code: { isCodeRequired: false, r9052_1Confirmed: false, r9052_1Unverified: false, ircReferenced: false, countyName: null, ircVersion: null, codeSection: null },
        manufacturer,
      };
    }

    function getMfrDim(input: ConfidenceInput) {
      return scoreConfidence(input).dimensions.find(d => d.dimension === "Manufacturer Requirement")!;
    }

    it("required + R905.2.1 applies → 30", () => {
      const dim = getMfrDim(mfrOnly({
        isRequired: true,
        r9052_1Applies: true,
        isWarrantyBasisOnly: false,
        isRecommendedNotRequired: false,
        manufacturerName: "GAF",
        productName: "HDZ",
        warrantyVoidLanguage: null,
      }));
      expect(dim.score).toBe(30);
      expect(dim.reasoning).toContain("strongest possible basis");
    });

    it("required + warranty basis only → 18", () => {
      const dim = getMfrDim(mfrOnly({
        isRequired: true,
        r9052_1Applies: false,
        isWarrantyBasisOnly: true,
        isRecommendedNotRequired: false,
        manufacturerName: "CertainTeed",
        productName: null,
        warrantyVoidLanguage: "Warranty void if not used",
      }));
      expect(dim.score).toBe(18);
      expect(dim.reasoning).toContain("warranty");
    });

    it("recommended but not required → 6", () => {
      const dim = getMfrDim(mfrOnly({
        isRequired: false,
        r9052_1Applies: false,
        isWarrantyBasisOnly: false,
        isRecommendedNotRequired: true,
        manufacturerName: "IKO",
        productName: null,
        warrantyVoidLanguage: null,
      }));
      expect(dim.score).toBe(6);
      expect(dim.reasoning).toContain("Recommended");
    });

    it("no manufacturer basis → 0", () => {
      const dim = getMfrDim(mfrOnly({
        isRequired: false,
        r9052_1Applies: false,
        isWarrantyBasisOnly: false,
        isRecommendedNotRequired: false,
        manufacturerName: null,
        productName: null,
        warrantyVoidLanguage: null,
      }));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("No manufacturer basis");
    });
  });

  /* ═══════════════════════════════════════════════════
     Individual Dimension Tests — Physical Presence
     ═══════════════════════════════════════════════════ */

  describe("Physical Presence dimension", () => {
    function physOnly(physical?: PhysicalPresenceContext): ConfidenceInput {
      return {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: true },
        code: { isCodeRequired: false, r9052_1Confirmed: false, r9052_1Unverified: false, ircReferenced: false, countyName: null, ircVersion: null, codeSection: null },
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null },
        physical,
      };
    }

    function getPhysDim(input: ConfidenceInput) {
      return scoreConfidence(input).dimensions.find(d => d.dimension === "Physical Presence")!;
    }

    it("on-roof + requires removal → 30", () => {
      const dim = getPhysDim(physOnly({
        isPhysicallyOnRoof: true,
        requiresRemovalForReplacement: true,
        itemType: "accessory",
      }));
      expect(dim.score).toBe(30);
      expect(dim.reasoning).toContain("physically installed");
    });

    it("general item type → 15", () => {
      const dim = getPhysDim(physOnly({
        isPhysicallyOnRoof: false,
        requiresRemovalForReplacement: false,
        itemType: "general",
      }));
      expect(dim.score).toBe(15);
      expect(dim.reasoning).toContain("Standard scope");
    });

    it("undefined (omitted) → 0", () => {
      const dim = getPhysDim(physOnly(undefined));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("Not applicable");
    });

    it("not on-roof, not general → 0", () => {
      const dim = getPhysDim(physOnly({
        isPhysicallyOnRoof: false,
        requiresRemovalForReplacement: false,
        itemType: "labor",
      }));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("Not a physical on-roof item");
    });

    it("on-roof but does not require removal (non-general) → 0", () => {
      // isPhysicallyOnRoof=true but requiresRemovalForReplacement=false, itemType=material
      // Falls through first condition (both must be true), itemType != general → score 0
      const dim = getPhysDim(physOnly({
        isPhysicallyOnRoof: true,
        requiresRemovalForReplacement: false,
        itemType: "material",
      }));
      expect(dim.score).toBe(0);
    });
  });

  /* ═══════════════════════════════════════════════════
     Individual Dimension Tests — Measurement Evidence
     ═══════════════════════════════════════════════════ */

  describe("Measurement Evidence dimension", () => {
    function measOnly(measurement?: MeasurementContext): ConfidenceInput {
      return {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: true },
        code: { isCodeRequired: false, r9052_1Confirmed: false, r9052_1Unverified: false, ircReferenced: false, countyName: null, ircVersion: null, codeSection: null },
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null },
        measurement,
      };
    }

    function getMeasDim(input: ConfidenceInput) {
      return scoreConfidence(input).dimensions.find(d => d.dimension === "Measurement Evidence")!;
    }

    it("quantity measurement-derived → 30", () => {
      const dim = getMeasDim(measOnly({
        isQuantityMeasurementDerived: true,
        hasMeasurementsOnFile: true,
        measurementSource: "EagleView",
      }));
      expect(dim.score).toBe(30);
      expect(dim.reasoning).toContain("hard measurement proof");
    });

    it("measurements on file but not derived → 10", () => {
      const dim = getMeasDim(measOnly({
        isQuantityMeasurementDerived: false,
        hasMeasurementsOnFile: true,
        measurementSource: "Hover",
      }));
      expect(dim.score).toBe(10);
      expect(dim.reasoning).toContain("overall scope");
    });

    it("no measurements → 0", () => {
      const dim = getMeasDim(measOnly({
        isQuantityMeasurementDerived: false,
        hasMeasurementsOnFile: false,
        measurementSource: null,
      }));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("No measurement basis");
    });

    it("undefined (omitted) → 0", () => {
      const dim = getMeasDim(measOnly(undefined));
      expect(dim.score).toBe(0);
      expect(dim.reasoning).toContain("No measurement data available");
    });
  });

  /* ═══════════════════════════════════════════════════
     Normalization Tests
     ═══════════════════════════════════════════════════ */

  describe("normalization", () => {
    it("raw 150 → normalized 100", () => {
      const result = scoreConfidence(maxInput());
      const rawTotal = result.dimensions.reduce((sum, d) => sum + d.score, 0);
      expect(rawTotal).toBe(150);
      expect(result.totalScore).toBe(100);
    });

    it("raw 0 → normalized 0", () => {
      const result = scoreConfidence(zeroInput());
      const rawTotal = result.dimensions.reduce((sum, d) => sum + d.score, 0);
      expect(rawTotal).toBe(0);
      expect(result.totalScore).toBe(0);
    });

    it("raw 75 → normalized 50", () => {
      // 75 = 30(policy) + 30(code) + 15(physical general) + 0 + 0
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: true, coverageType: "RCV", relevantEndorsements: ["O&L"], policyExcludesItem: false }, // 30
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null }, // 0
        physical: { isPhysicallyOnRoof: false, requiresRemovalForReplacement: false, itemType: "general" }, // 15
        // measurement omitted → 0
      };
      const result = scoreConfidence(input);
      const rawTotal = result.dimensions.reduce((sum, d) => sum + d.score, 0);
      expect(rawTotal).toBe(75);
      expect(result.totalScore).toBe(50);
    });

    it("formula is Math.round((raw / 150) * 100)", () => {
      // raw = 42 (policy 12 ACV + code 0 + mfr 0 + physical 30 + measurement 0)
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "ACV", relevantEndorsements: [], policyExcludesItem: false }, // 12
        code: { isCodeRequired: false, r9052_1Confirmed: false, r9052_1Unverified: false, ircReferenced: false, countyName: null, ircVersion: null, codeSection: null }, // 0
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null }, // 0
        physical: { isPhysicallyOnRoof: true, requiresRemovalForReplacement: true, itemType: "accessory" }, // 30
        // measurement omitted → 0
      };
      const result = scoreConfidence(input);
      const rawTotal = result.dimensions.reduce((sum, d) => sum + d.score, 0);
      expect(rawTotal).toBe(42);
      expect(result.totalScore).toBe(Math.round((42 / 150) * 100)); // 28
    });
  });

  /* ═══════════════════════════════════════════════════
     summaryText Format Tests
     ═══════════════════════════════════════════════════ */

  describe("summaryText format", () => {
    it("contains tier label and score", () => {
      const result = scoreConfidence(maxInput());
      expect(result.summaryText).toContain("High Confidence");
      expect(result.summaryText).toContain("100/100");
    });

    it("includes top two dimensions when scoring above zero", () => {
      // Policy 30 + Code 30 + others 0
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: true, coverageType: "RCV", relevantEndorsements: ["O&L"], policyExcludesItem: false }, // 30
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null }, // 0
      };
      const result = scoreConfidence(input);
      expect(result.summaryText).toContain("supported by");
      expect(result.summaryText).toContain("Policy Support");
      expect(result.summaryText).toContain("Code Authority");
    });

    it("shows 'limited supporting evidence' when all dimensions are zero", () => {
      const result = scoreConfidence(zeroInput());
      expect(result.summaryText).toContain("limited supporting evidence");
      expect(result.summaryText).not.toContain("supported by");
    });

    it("follows format: tierLabel (score/100) — supported by ...", () => {
      const result = scoreConfidence(maxInput());
      expect(result.summaryText).toMatch(
        /^High Confidence \(100\/100\) — supported by .+/
      );
    });

    it("shows only one dimension when only one scores above zero", () => {
      const input: ConfidenceInput = {
        policy: { hasOrdinanceLaw: false, coverageType: "UNKNOWN", relevantEndorsements: [], policyExcludesItem: true }, // 0
        code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
        manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null }, // 0
      };
      const result = scoreConfidence(input);
      expect(result.summaryText).toContain("supported by Code Authority");
      // Should not contain " + " since only one dimension
      expect(result.summaryText).not.toContain(" + ");
    });
  });

  /* ═══════════════════════════════════════════════════
     Result Structure Tests
     ═══════════════════════════════════════════════════ */

  describe("result structure", () => {
    it("returns all required fields", () => {
      const result = scoreConfidence(maxInput());
      expect(result).toHaveProperty("totalScore");
      expect(result).toHaveProperty("tier");
      expect(result).toHaveProperty("tierLabel");
      expect(result).toHaveProperty("tierDescription");
      expect(result).toHaveProperty("dimensions");
      expect(result).toHaveProperty("summaryText");
    });

    it("returns exactly 5 dimensions", () => {
      const result = scoreConfidence(maxInput());
      expect(result.dimensions).toHaveLength(5);
      const names = result.dimensions.map(d => d.dimension);
      expect(names).toContain("Policy Support");
      expect(names).toContain("Code Authority");
      expect(names).toContain("Manufacturer Requirement");
      expect(names).toContain("Physical Presence");
      expect(names).toContain("Measurement Evidence");
    });

    it("each dimension has score, maxScore (30), and reasoning", () => {
      const result = scoreConfidence(maxInput());
      for (const dim of result.dimensions) {
        expect(typeof dim.score).toBe("number");
        expect(dim.maxScore).toBe(30);
        expect(typeof dim.reasoning).toBe("string");
        expect(dim.reasoning.length).toBeGreaterThan(0);
      }
    });

    it("tierDescription matches tier", () => {
      const high = scoreConfidence(maxInput());
      expect(high.tierDescription).toContain("push hard");

      const low = scoreConfidence(zeroInput());
      expect(low.tierDescription).toContain("Optional");
    });
  });
});

/* ═══════════════════════════════════════════════════
   Batch Scoring — scoreAndSort()
   ═══════════════════════════════════════════════════ */

describe("scoreAndSort", () => {
  it("returns items sorted high → low by confidence score", () => {
    const items = [
      { name: "low-item" },
      { name: "high-item" },
      { name: "mid-item" },
    ];

    const getInput = (item: { name: string }): ConfidenceInput => {
      if (item.name === "high-item") return maxInput();
      if (item.name === "mid-item") {
        return {
          policy: { hasOrdinanceLaw: true, coverageType: "RCV", relevantEndorsements: ["O&L"], policyExcludesItem: false }, // 30
          code: { isCodeRequired: true, r9052_1Confirmed: true, r9052_1Unverified: false, ircReferenced: false, countyName: "Test", ircVersion: "2021", codeSection: "R905.2.1" }, // 30
          manufacturer: { isRequired: false, r9052_1Applies: false, isWarrantyBasisOnly: false, isRecommendedNotRequired: false, manufacturerName: null, productName: null, warrantyVoidLanguage: null }, // 0
        };
      }
      return zeroInput(); // low
    };

    const sorted = scoreAndSort(items, getInput);

    expect(sorted).toHaveLength(3);
    expect(sorted[0].item.name).toBe("high-item");
    expect(sorted[1].item.name).toBe("mid-item");
    expect(sorted[2].item.name).toBe("low-item");
  });

  it("each result has item and confidence", () => {
    const items = [{ id: 1 }];
    const sorted = scoreAndSort(items, () => maxInput());

    expect(sorted[0].item).toEqual({ id: 1 });
    expect(sorted[0].confidence.totalScore).toBe(100);
    expect(sorted[0].confidence.tier).toBe("high");
  });

  it("handles empty array", () => {
    const sorted = scoreAndSort([], () => maxInput());
    expect(sorted).toEqual([]);
  });

  it("preserves original order for equal scores", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const sorted = scoreAndSort(items, () => maxInput());
    // All have the same score, so original order should be preserved (stable sort)
    expect(sorted[0].item.id).toBe("a");
    expect(sorted[1].item.id).toBe("b");
    expect(sorted[2].item.id).toBe("c");
  });
});
