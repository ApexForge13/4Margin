#!/usr/bin/env npx tsx
// ── populate-sheet.ts ─────────────────────────────────────────────────────────
//
// Extracts ALL knowledge base items from the 4Margin codebase and writes one
// CSV per Google Sheet tab. Import these CSVs into the shared verification
// tracker to pre-populate every row.
//
// Usage:  npx tsx scripts/verify/populate-sheet.ts
// Output: scripts/verify/output/*.csv  (12 files)
//
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "node:fs";
import * as path from "node:path";

// ── Data imports (relative from monorepo root) ──────────────────────────────

import {
  BUILDING_CODES,
  type BuildingCode,
} from "../../apps/contractor/src/data/building-codes";
import {
  ALL_COUNTIES,
  MD_COUNTIES,
  PA_COUNTIES,
  DE_COUNTIES,
  type CountyJurisdiction,
} from "../../apps/contractor/src/data/county-jurisdictions";

// ZIP_TO_COUNTY is a Record<string, { county: string; state: string }>
// We need to import it — check the export name
import { ZIP_TO_COUNTY } from "../../apps/contractor/src/data/county-jurisdictions";

import {
  ALL_MANUFACTURERS,
} from "../../apps/contractor/src/data/manufacturers/index";
import {
  JUSTIFICATION_MATRIX,
  type ManufacturerRequirement,
  type Manufacturer,
} from "../../apps/contractor/src/data/manufacturer-requirements";

import {
  COVERAGE_SECTIONS,
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  BASE_FORM_EXCLUSIONS,
  CARRIER_ENDORSEMENT_FORMS,
} from "../../packages/policy-engine/src/knowledge";

import {
  CARRIER_PROFILES,
  CARRIER_CODE_OBJECTIONS,
} from "../../packages/policy-engine/src/carrier-profiles";

// ── Helpers ─────────────────────────────────────────────────────────────────

const OUT_DIR = path.join(__dirname, "output");

/** Escape a value for CSV (wrap in quotes, double internal quotes) */
function csvVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Write rows to a CSV file */
function writeCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.map(csvVal).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvVal).join(","));
  }
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`  [+] ${filename} — ${rows.length} rows`);
}

// ── Tab 1: IRC Codes ────────────────────────────────────────────────────────

function exportIrcCodes() {
  const headers = [
    "Item ID",
    "Section",
    "Title",
    "Requirement Summary",
    "Category",
    "Xactimate Codes",
    "Justification Text (truncated)",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = BUILDING_CODES.map((c) => [
    c.id,
    c.section,
    c.title,
    c.requirement.slice(0, 200),
    c.category,
    c.xactimateCodes.join("; "),
    c.justificationText.slice(0, 150),
    `https://codes.iccsafe.org/content/IRC2021P7 — search for "${c.section}"`,
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("01-irc-codes.csv", headers, rows);
}

// ── Tab 2: State Adoption ───────────────────────────────────────────────────

function exportStateAdoption() {
  const headers = [
    "Item ID",
    "Code Section",
    "State",
    "IRC Edition",
    "Has Amendment",
    "Amendment Note",
    "Source Ref",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows: string[][] = [];
  for (const code of BUILDING_CODES) {
    for (const j of code.jurisdictions) {
      rows.push([
        `${code.id}/${j.state}`,
        code.section,
        j.state,
        j.ircEdition,
        String(j.hasAmendment),
        j.amendmentNote || "",
        j.sourceRef,
        j.state === "MD"
          ? "https://dsd.maryland.gov/Pages/BuildingCodes.aspx"
          : j.state === "PA"
            ? "https://www.dli.pa.gov/ucc"
            : "https://dsha.delaware.gov/building-codes/",
        "Pending",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  writeCsv("02-state-adoption.csv", headers, rows);
}

// ── Tab 3: County Climate Zones ─────────────────────────────────────────────

function exportCountyClimate() {
  const headers = [
    "Item ID",
    "County",
    "State",
    "Climate Zone",
    "Ice Barrier Requirement",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = ALL_COUNTIES.map((c) => [
    `${c.state}-${c.county.replace(/\s/g, "_")}`,
    c.county,
    c.state,
    c.climateZone,
    c.iceBarrierRequirement,
    "IECC Figure R301.1 Climate Zone Map",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("03-county-climate.csv", headers, rows);
}

// ── Tab 4: County Wind Speeds ───────────────────────────────────────────────

function exportCountyWind() {
  const headers = [
    "Item ID",
    "County",
    "State",
    "Design Wind Speed (mph)",
    "High Wind Zone",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = ALL_COUNTIES.map((c) => [
    `${c.state}-${c.county.replace(/\s/g, "_")}`,
    c.county,
    c.state,
    String(c.designWindSpeed),
    String(c.highWindZone),
    "ASCE 7-16 Figure 26.5-1B (Basic Wind Speed Map)",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("04-county-wind.csv", headers, rows);
}

// ── Tab 5: County Permits / AHJ ─────────────────────────────────────────────

function exportCountyPermits() {
  const headers = [
    "Item ID",
    "County",
    "State",
    "Permit Required",
    "Fee Range",
    "AHJ Name",
    "AHJ Phone",
    "AHJ URL",
    "Local Amendments",
    "FIPS Code",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = ALL_COUNTIES.map((c) => [
    `${c.state}-${c.county.replace(/\s/g, "_")}`,
    c.county,
    c.state,
    String(c.permit.required),
    c.permit.typicalFeeRange,
    c.permit.ahjName,
    c.permit.ahjPhone || "",
    c.permit.ahjUrl || "",
    c.localAmendments.join("; "),
    c.fipsCode,
    c.permit.ahjUrl || "Search: [county] building permits department",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("05-county-permits.csv", headers, rows);
}

// ── Tab 6: ZIP Mappings ─────────────────────────────────────────────────────

function exportZipMappings() {
  const headers = [
    "ZIP Code",
    "Mapped County",
    "State",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const entries = Object.entries(ZIP_TO_COUNTY).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const rows = entries.map(([zip, info]) => [
    zip,
    info.county,
    info.state,
    "Census Bureau FIPS-to-ZIP crosswalk / USPS ZIP lookup",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("06-zip-mappings.csv", headers, rows);
}

// ── Tab 7: Manufacturer Requirements ────────────────────────────────────────

function exportManufacturers() {
  const headers = [
    "Requirement ID",
    "Manufacturer",
    "Requirement",
    "Description (truncated)",
    "Mandatory For Warranty",
    "Xactimate Code",
    "Xactimate Unit",
    "Source Section",
    "Source URL",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows: string[][] = [];
  for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
    for (const req of mfr.installationRequirements) {
      rows.push([
        req.id,
        name,
        req.requirement,
        req.description.slice(0, 200),
        String(req.mandatoryForWarranty),
        req.xactimateCode,
        req.xactimateUnit,
        req.sourceSection,
        req.sourceUrl,
        req.sourceUrl || `${mfr.documentLibrary} — search for "${req.requirement}"`,
        "Pending",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  writeCsv("07-manufacturers.csv", headers, rows);
}

// ── Tab 8: Endorsement Forms ────────────────────────────────────────────────

function exportEndorsements() {
  const headers = [
    "Item ID",
    "Carrier",
    "Form Number",
    "Name",
    "Effect (truncated)",
    "Severity",
    "Affects Fields",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = CARRIER_ENDORSEMENT_FORMS.map((f, i) => [
    `ENDORSEMENT-${String(i + 1).padStart(3, "0")}`,
    f.carrier,
    f.formNumber,
    f.name,
    f.effect.slice(0, 200),
    f.severity,
    f.affectsFields.join("; "),
    `Search: "${f.carrier} ${f.formNumber}" endorsement form`,
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("08-endorsements.csv", headers, rows);
}

// ── Tab 9: Carrier Profiles ─────────────────────────────────────────────────

function exportCarrierProfiles() {
  const headers = [
    "Carrier Name",
    "Aliases",
    "Aggressiveness",
    "Depreciation Approach",
    "Cosmetic Damage Stance",
    "Supplement Tactics (count)",
    "Denial Language (count)",
    "Adjuster Behaviors (count)",
    "Strengths (count)",
    "Weaknesses (count)",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = CARRIER_PROFILES.map((p) => [
    p.name,
    p.aliases.join("; "),
    p.aggressiveness,
    p.depreciationApproach.slice(0, 150),
    p.cosmeticDamageStance.slice(0, 150),
    String(p.supplementTactics.length),
    String(p.commonDenialLanguage.length),
    String(p.adjusterBehavior.length),
    String(p.strengths.length),
    String(p.weaknesses.length),
    "Industry knowledge / carrier websites / adjuster forums",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("09-carrier-profiles.csv", headers, rows);
}

// ── Tab 10: Carrier Code Objections ─────────────────────────────────────────

function exportCarrierObjections() {
  const headers = [
    "Item ID",
    "Carrier",
    "IRC Section",
    "Objection Rate",
    "Typical Objection (truncated)",
    "Effective Rebuttal (truncated)",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = CARRIER_CODE_OBJECTIONS.map((obj, i) => [
    `OBJECTION-${String(i + 1).padStart(3, "0")}`,
    obj.carrierName,
    obj.ircSection,
    obj.objectionRate,
    obj.typicalObjection.slice(0, 200),
    obj.effectiveRebuttal.slice(0, 200),
    "Industry experience / denial letter databases",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("10-carrier-objections.csv", headers, rows);
}

// ── Tab 11: Policy Knowledge ────────────────────────────────────────────────

function exportPolicyKnowledge() {
  const headers = [
    "Item ID",
    "Category",
    "Name",
    "Description (truncated)",
    "Extra Info",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows: string[][] = [];

  // Coverage sections
  for (const s of COVERAGE_SECTIONS) {
    rows.push([
      s.id,
      "Coverage Section",
      s.label,
      s.description.slice(0, 200),
      `Relevance: ${s.claimRelevance}; Terms: ${s.searchTerms.join(", ")}`,
      "ISO HO-3 / HO-5 / HO-6 standard policy forms",
      "Pending",
      "",
      "",
      "",
      "",
    ]);
  }

  // Landmine rules
  for (const l of LANDMINE_RULES) {
    rows.push([
      l.id,
      "Landmine Rule",
      l.name,
      l.description.slice(0, 200),
      `Severity: ${l.severity}; Category: ${l.category}; Claims: ${l.affectedClaimTypes.join(", ")}`,
      "ISO HO-3 standard form + carrier endorsements",
      "Pending",
      "",
      "",
      "",
      "",
    ]);
  }

  // Favorable provisions
  for (const f of FAVORABLE_PROVISIONS) {
    rows.push([
      f.id,
      "Favorable Provision",
      f.name,
      f.description.slice(0, 200),
      `Terms: ${f.searchTerms.join(", ")}`,
      "ISO HO-3 standard form + carrier endorsements",
      "Pending",
      "",
      "",
      "",
      "",
    ]);
  }

  // Base form exclusions
  for (const e of BASE_FORM_EXCLUSIONS) {
    rows.push([
      `EXCL-${e.formType}-${e.name.slice(0, 30).replace(/\s/g, "_")}`,
      "Base Form Exclusion",
      e.name,
      e.description.slice(0, 200),
      `Form: ${e.formType}; Standard: ${e.isStandard}; Relevance: ${e.claimRelevance}`,
      `ISO ${e.formType} standard form — Section I Exclusions`,
      "Pending",
      "",
      "",
      "",
      "",
    ]);
  }

  writeCsv("11-policy-knowledge.csv", headers, rows);
}

// ── Tab 12: Justification Matrix ────────────────────────────────────────────

function exportJustificationMatrix() {
  const headers = [
    "Xactimate Code",
    "Line Item",
    "Unit",
    "Code Requirement (truncated)",
    "Typical Recovery",
    "# Sources",
    "Source Refs",
    "Source to Check",
    "Status",
    "Correct Value",
    "Notes",
    "Verified By",
    "Date Verified",
  ];

  const rows = Object.entries(JUSTIFICATION_MATRIX).map(([code, entry]) => [
    code,
    entry.lineItem,
    entry.unit,
    entry.codeRequirement.slice(0, 200),
    entry.typicalRecovery,
    String(entry.justificationSources.length),
    entry.justificationSources.map((s) => s.sourceRef).join("; "),
    "Cross-reference verified manufacturer reqs + IRC codes",
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  writeCsv("12-justification-matrix.csv", headers, rows);
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("4Margin KB Verification — CSV Export");
  console.log("=====================================\n");

  // Ensure output dir exists
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  let totalRows = 0;
  const count = (fn: () => void, label: string) => {
    console.log(`\n${label}:`);
    fn();
  };

  count(exportIrcCodes, "Tab 1: IRC Codes");
  count(exportStateAdoption, "Tab 2: State Adoption");
  count(exportCountyClimate, "Tab 3: County Climate Zones");
  count(exportCountyWind, "Tab 4: County Wind Speeds");
  count(exportCountyPermits, "Tab 5: County Permits / AHJ");
  count(exportZipMappings, "Tab 6: ZIP Mappings");
  count(exportManufacturers, "Tab 7: Manufacturer Requirements");
  count(exportEndorsements, "Tab 8: Endorsement Forms");
  count(exportCarrierProfiles, "Tab 9: Carrier Profiles");
  count(exportCarrierObjections, "Tab 10: Carrier Code Objections");
  count(exportPolicyKnowledge, "Tab 11: Policy Knowledge");
  count(exportJustificationMatrix, "Tab 12: Justification Matrix");

  // Count total rows across all CSVs
  const csvFiles = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".csv"));
  for (const f of csvFiles) {
    const content = fs.readFileSync(path.join(OUT_DIR, f), "utf-8");
    totalRows += content.split("\n").length - 1; // subtract header
  }

  console.log("\n=====================================");
  console.log(`Total: ${csvFiles.length} CSV files, ${totalRows} data rows`);
  console.log(`Output: ${OUT_DIR}/`);
  console.log("\nImport each CSV as a separate tab in Google Sheets.");
  console.log('Tab names match filenames (e.g., "01-irc-codes" → "IRC Codes")');
}

main();
