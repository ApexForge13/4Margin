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
  adjusterShingleSQ?: number | null;  // adjuster's scoped shingle quantity
}

export interface WasteResult {
  measuredSquares: number;
  wastePercent: number;
  wasteSquares: number;
  adjustedSquares: number;
  complexityCategory: string;
  formulaDisplay: string;
  source: string;
  adjusterShingleSQ: number | null;
  supplementShingleSQ: number | null;  // adjustedSquares - adjusterShingleSQ (null if no adjuster data)
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

  const source = "Contractor-confirmed measurement report";

  const adjSQ = input.adjusterShingleSQ ?? null;
  const supplementSQ = adjSQ != null ? Math.round((adjustedSquares - adjSQ) * 100) / 100 : null;

  const formulaLines: string[] = [
    `Measured area: ${measuredSquares.toFixed(2)} SQ`,
    `Roof geometry: ${numHips || 0} hips, ${numValleys || 0} valleys, ${numDormers || 0} dormers (${complexityCategory})`,
    `Waste factor: ${wastePercent}% (per contractor-confirmed measurements)`,
    `Waste calculation: ${measuredSquares.toFixed(2)} SQ × ${wastePercent}% = ${wasteSquares.toFixed(2)} SQ`,
    `Adjusted total: ${measuredSquares.toFixed(2)} + ${wasteSquares.toFixed(2)} = ${adjustedSquares.toFixed(2)} SQ`,
    `Supporting document: Measurement report (included)`,
  ];

  if (adjSQ != null && supplementSQ != null && supplementSQ > 0) {
    formulaLines.push(`Adjuster scoped: ${adjSQ.toFixed(2)} SQ`);
    formulaLines.push(`Supplement for shortage: ${adjustedSquares.toFixed(2)} - ${adjSQ.toFixed(2)} = ${supplementSQ.toFixed(2)} SQ`);
  }

  const formulaDisplay = formulaLines.join("\n");

  return {
    measuredSquares,
    wastePercent,
    wasteSquares,
    adjustedSquares,
    complexityCategory,
    formulaDisplay,
    source,
    adjusterShingleSQ: adjSQ,
    supplementShingleSQ: supplementSQ,
  };
}
