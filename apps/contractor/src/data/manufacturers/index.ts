// ── Manufacturer Index — All 6 Manufacturers ──────────────────────────────
//
// Unified access to all manufacturer installation requirements.
// Individual manufacturer files are in this directory.
// GAF and CertainTeed remain in the parent manufacturer-requirements.ts for
// backward compatibility.
//

import type { Manufacturer, ManufacturerRequirement } from "../manufacturer-requirements";
import { GAF, CERTAINTEED } from "../manufacturer-requirements";
import { OWENS_CORNING } from "./owens-corning";
import { IKO } from "./iko";
import { ATLAS } from "./atlas";
import { TAMKO } from "./tamko";

// ── All Manufacturers ────────────────────────────────────────────────────

export const ALL_MANUFACTURERS: Record<string, Manufacturer> = {
  GAF,
  CertainTeed: CERTAINTEED,
  "Owens Corning": OWENS_CORNING,
  IKO,
  Atlas: ATLAS,
  Tamko: TAMKO,
};

// Re-export individual manufacturers for direct access
export { GAF, CERTAINTEED, OWENS_CORNING, IKO, ATLAS, TAMKO };

// ── Lookup Functions ─────────────────────────────────────────────────────

/**
 * Get a manufacturer by name (case-insensitive, supports common aliases).
 */
export function getManufacturer(name: string): Manufacturer | undefined {
  const normalized = name.toLowerCase().trim();

  const aliases: Record<string, string> = {
    gaf: "GAF",
    certainteed: "CertainTeed",
    "certain teed": "CertainTeed",
    ct: "CertainTeed",
    "owens corning": "Owens Corning",
    owenscorning: "Owens Corning",
    oc: "Owens Corning",
    iko: "IKO",
    atlas: "Atlas",
    "atlas roofing": "Atlas",
    tamko: "Tamko",
    "tamko building products": "Tamko",
  };

  const key = aliases[normalized] || name;
  return ALL_MANUFACTURERS[key];
}

/**
 * Get all manufacturers as an array of [name, manufacturer] pairs.
 */
export function getAllManufacturers(): [string, Manufacturer][] {
  return Object.entries(ALL_MANUFACTURERS);
}

/**
 * Get all installation requirements across ALL manufacturers for a given
 * Xactimate code. Returns the manufacturer name alongside each requirement.
 */
export function getRequirementsForXactimateCode(
  xactimateCode: string
): { manufacturer: string; requirement: ManufacturerRequirement }[] {
  const results: { manufacturer: string; requirement: ManufacturerRequirement }[] = [];

  for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
    for (const req of mfr.installationRequirements) {
      if (req.xactimateCode === xactimateCode) {
        results.push({ manufacturer: name, requirement: req });
      }
    }
  }

  return results;
}

/**
 * Get all commonly missed items across ALL manufacturers.
 * Returns manufacturer name alongside each requirement.
 */
export function getCommonlyMissedItems(): {
  manufacturer: string;
  requirement: ManufacturerRequirement;
}[] {
  const results: { manufacturer: string; requirement: ManufacturerRequirement }[] = [];

  for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
    for (const req of mfr.installationRequirements) {
      if (req.commonlyMissedByAdjusters) {
        results.push({ manufacturer: name, requirement: req });
      }
    }
  }

  return results;
}

/**
 * Build a formatted string of manufacturer requirements for injection into
 * the Claude analysis prompt. Groups by manufacturer.
 */
export function buildManufacturerContextForPrompt(
  manufacturerName?: string
): string {
  const lines: string[] = [
    "## MANUFACTURER INSTALLATION REQUIREMENTS",
    "",
    "Use these VERIFIED manufacturer requirements in your justifications. These are sourced directly from manufacturer installation instructions and warranty documents.",
    "",
  ];

  const entries = manufacturerName
    ? [[manufacturerName, getManufacturer(manufacturerName)]].filter(
        ([, m]) => m !== undefined
      ) as [string, Manufacturer][]
    : Object.entries(ALL_MANUFACTURERS);

  for (const [name, mfr] of entries) {
    lines.push(`### ${name.toUpperCase()}`);
    lines.push(`Website: ${mfr.website}`);

    if (mfr.productLines.length > 0) {
      lines.push(
        `Product Lines: ${mfr.productLines.map((p) => p.name).join(", ")}`
      );
    }

    lines.push("");

    for (const req of mfr.installationRequirements) {
      lines.push(
        `- **${req.requirement}** [Xactimate: ${req.xactimateCode}]`
      );
      lines.push(`  ${req.description}`);
      if (req.commonlyMissedByAdjusters) {
        lines.push(`  ⚠ COMMONLY MISSED — Typical objection: "${req.typicalAdjusterObjection}"`);
        lines.push(`  Rebuttal: ${req.rebuttal}`);
      }
      lines.push("");
    }
  }

  lines.push(
    "IMPORTANT: When citing manufacturer requirements, reference the specific manufacturer and product line. These requirements have been verified against published installation instructions."
  );

  return lines.join("\n");
}

/**
 * Count of total requirements across all manufacturers.
 */
export function getTotalRequirementCount(): number {
  return Object.values(ALL_MANUFACTURERS).reduce(
    (sum, mfr) => sum + mfr.installationRequirements.length,
    0
  );
}
