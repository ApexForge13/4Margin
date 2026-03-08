/**
 * Waste Calculator
 *
 * Calculates material waste based on EagleView measurements and
 * roof complexity. Displays transparent formula in PDF output.
 */

export interface WasteInput {
  measuredSquares: number;
  wastePercent: number;
  suggestedSquares: number | null;
  structureComplexity: string | null;
  numHips: number | null;
  numValleys: number | null;
  numDormers: number | null;
  countyName?: string;
}

export interface WasteResult {
  measuredSquares: number;
  wastePercent: number;
  wasteSquares: number;
  adjustedSquares: number;
  complexityCategory: string;
  formulaDisplay: string;
  source: string;
}

export function calculateWaste(input: WasteInput): WasteResult {
  const {
    measuredSquares,
    wastePercent,
    suggestedSquares,
    structureComplexity,
    numHips,
    numValleys,
    numDormers,
    countyName,
  } = input;

  // Determine complexity category
  let complexityCategory = structureComplexity || "Normal";
  if (!structureComplexity) {
    const complexityScore = (numHips || 0) + (numValleys || 0) + (numDormers || 0);
    if (complexityScore <= 2) complexityCategory = "Simple";
    else if (complexityScore <= 6) complexityCategory = "Normal";
    else complexityCategory = "Complex";
  }

  const wasteSquares = Math.round(measuredSquares * (wastePercent / 100) * 100) / 100;
  const adjustedSquares = suggestedSquares || Math.round((measuredSquares + wasteSquares) * 100) / 100;

  const source = countyName
    ? `EagleView measurement report, ${countyName} standard`
    : "EagleView measurement report, NRCA Guidelines";

  const formulaDisplay = [
    `Measured area: ${measuredSquares.toFixed(2)} SQ`,
    `Roof complexity: ${complexityCategory} (${numHips || 0} hips, ${numValleys || 0} valleys, ${numDormers || 0} dormers)`,
    `Waste factor: ${wastePercent}%`,
    `Waste calculation: ${measuredSquares.toFixed(2)} SQ x ${wastePercent}% = ${wasteSquares.toFixed(2)} SQ waste`,
    `Adjusted total: ${measuredSquares.toFixed(2)} + ${wasteSquares.toFixed(2)} = ${adjustedSquares.toFixed(2)} SQ`,
    `Source: ${source}`,
  ].join("\n");

  return {
    measuredSquares,
    wastePercent,
    wasteSquares,
    adjustedSquares,
    complexityCategory,
    formulaDisplay,
    source,
  };
}
