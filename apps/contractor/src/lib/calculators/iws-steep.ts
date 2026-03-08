/**
 * IWS Steep Pitch Calculator — Geometry-Based Coverage Proof
 *
 * Adjusters calculate IWS coverage based on eave linear footage at a flat
 * assumption. On steep roofs, meeting IRC R905.2.8.2's requirement of
 * 24 inches inside the exterior wall line requires significantly more
 * material along the slope. This gap is almost never caught.
 *
 * Formula: Required slope coverage = 24" / cos(pitch_angle_in_degrees)
 *
 * Examples:
 *   4/12 pitch (18.4°): 24 / cos(18.4°) = 25.3" along slope
 *   8/12 pitch (33.7°): 24 / cos(33.7°) = 28.8" along slope
 *  12/12 pitch (45.0°): 24 / cos(45.0°) = 33.9" along slope
 */

/* ─────── Types ─────── */

export interface FacetInput {
  facetId?: string;
  pitchRatio: string;     // e.g., "8/12"
  eaveLf: number;         // eave linear footage for this facet
}

export interface IwsInput {
  facets: FacetInput[];
  adjusterIwsSf: number | null;  // total IWS SF in adjuster estimate
  minimumHorizontalCoverage: number; // in inches, typically 24
}

export interface FacetResult {
  facetId: string;
  pitchRatio: string;
  pitchDegrees: number;
  eaveLf: number;
  requiredSlopeInches: number;  // 24 / cos(pitch)
  requiredSf: number;           // (requiredSlopeInches / 12) * eaveLf
  flatAssumptionSf: number;     // (24 / 12) * eaveLf = 2 * eaveLf
  deltaSf: number;              // additional SF needed vs flat assumption
}

export interface IwsResult {
  facets: FacetResult[];
  totalRequiredSf: number;
  totalFlatAssumptionSf: number;
  totalDeltaSf: number;
  adjusterIwsSf: number | null;
  supplementIwsSf: number | null;  // totalRequired - adjusterIws (if available)
  formulaDisplay: string;
  ircReference: string;
  hasSteepFacets: boolean;  // any facet ≥ 7/12
}

/* ─────── Helpers ─────── */

/**
 * Convert pitch ratio string (e.g., "8/12") to degrees
 */
export function pitchToDegrees(pitchRatio: string): number {
  const parts = pitchRatio.split("/");
  if (parts.length !== 2) return 0;
  const rise = parseFloat(parts[0]);
  const run = parseFloat(parts[1]);
  if (run === 0) return 0;
  return Math.atan(rise / run) * (180 / Math.PI);
}

/**
 * Check if pitch is "steep" (≥ 7/12)
 */
export function isSteepPitch(pitchRatio: string): boolean {
  const parts = pitchRatio.split("/");
  if (parts.length !== 2) return false;
  const rise = parseFloat(parts[0]);
  const run = parseFloat(parts[1]);
  return (rise / run) >= (7 / 12);
}

/* ─────── Main Calculator ─────── */

export function calculateIwsSteepPitch(input: IwsInput): IwsResult {
  const { facets, adjusterIwsSf, minimumHorizontalCoverage } = input;

  const facetResults: FacetResult[] = facets.map((f, i) => {
    const pitchDegrees = pitchToDegrees(f.pitchRatio);
    const pitchRadians = pitchDegrees * (Math.PI / 180);
    const cosPitch = Math.cos(pitchRadians);

    // Required slope distance to achieve horizontal coverage
    const requiredSlopeInches = cosPitch > 0
      ? minimumHorizontalCoverage / cosPitch
      : minimumHorizontalCoverage;

    // Convert to SF: (inches / 12) * linear footage
    const requiredSf = (requiredSlopeInches / 12) * f.eaveLf;

    // Flat assumption: (24 / 12) * eaveLf = 2 * eaveLf
    const flatAssumptionSf = (minimumHorizontalCoverage / 12) * f.eaveLf;

    const deltaSf = requiredSf - flatAssumptionSf;

    return {
      facetId: f.facetId || `Facet ${i + 1}`,
      pitchRatio: f.pitchRatio,
      pitchDegrees: Math.round(pitchDegrees * 10) / 10,
      eaveLf: f.eaveLf,
      requiredSlopeInches: Math.round(requiredSlopeInches * 10) / 10,
      requiredSf: Math.round(requiredSf * 100) / 100,
      flatAssumptionSf: Math.round(flatAssumptionSf * 100) / 100,
      deltaSf: Math.round(deltaSf * 100) / 100,
    };
  });

  const totalRequiredSf = facetResults.reduce((sum, f) => sum + f.requiredSf, 0);
  const totalFlatAssumptionSf = facetResults.reduce((sum, f) => sum + f.flatAssumptionSf, 0);
  const totalDeltaSf = facetResults.reduce((sum, f) => sum + f.deltaSf, 0);
  const hasSteepFacets = facets.some(f => isSteepPitch(f.pitchRatio));

  const supplementIwsSf = adjusterIwsSf != null
    ? Math.round((totalRequiredSf - adjusterIwsSf) * 100) / 100
    : null;

  // Build formula display
  const lines: string[] = [
    `IRC R905.2.8.2 requires ${minimumHorizontalCoverage}" of IWS coverage measured horizontally inside the exterior wall line.`,
    `On steep roofs, the slope distance exceeds the horizontal distance, requiring more material.`,
    ``,
    `Per-Facet Calculation:`,
  ];

  for (const f of facetResults) {
    if (f.deltaSf > 0.5) {
      lines.push(
        `  ${f.facetId} (${f.pitchRatio}, ${f.pitchDegrees}°): ` +
        `${minimumHorizontalCoverage}" / cos(${f.pitchDegrees}°) = ${f.requiredSlopeInches}" slope coverage needed. ` +
        `${f.requiredSlopeInches}" / 12 x ${f.eaveLf} LF = ${f.requiredSf.toFixed(1)} SF required ` +
        `(flat assumption: ${f.flatAssumptionSf.toFixed(1)} SF, delta: +${f.deltaSf.toFixed(1)} SF)`
      );
    }
  }

  lines.push(``);
  lines.push(`Total IWS required (slope-adjusted): ${totalRequiredSf.toFixed(1)} SF`);
  lines.push(`Total IWS at flat assumption: ${totalFlatAssumptionSf.toFixed(1)} SF`);
  lines.push(`Additional IWS needed for steep pitch: ${totalDeltaSf.toFixed(1)} SF`);

  if (adjusterIwsSf != null) {
    lines.push(`Adjuster's IWS estimate: ${adjusterIwsSf.toFixed(1)} SF`);
    if (supplementIwsSf != null && supplementIwsSf > 0) {
      lines.push(`Supplement IWS: ${supplementIwsSf.toFixed(1)} SF`);
    }
  }

  return {
    facets: facetResults,
    totalRequiredSf: Math.round(totalRequiredSf * 100) / 100,
    totalFlatAssumptionSf: Math.round(totalFlatAssumptionSf * 100) / 100,
    totalDeltaSf: Math.round(totalDeltaSf * 100) / 100,
    adjusterIwsSf,
    supplementIwsSf: supplementIwsSf != null && supplementIwsSf > 0 ? supplementIwsSf : null,
    formulaDisplay: lines.join("\n"),
    ircReference: "IRC R905.2.8.2",
    hasSteepFacets,
  };
}
