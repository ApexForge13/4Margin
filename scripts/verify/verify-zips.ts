#!/usr/bin/env npx tsx
// ── verify-zips.ts ────────────────────────────────────────────────────────────
//
// Cross-references every ZIP_TO_COUNTY entry against the Census Bureau's
// ZIP Code Tabulation Area (ZCTA) to County Relationship File.
//
// This eliminates ~80% of manual ZIP verification — only edge cases
// (cross-county ZIPs) need human review.
//
// Downloads: Census ZCTA-to-County Relationship File
//   https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
//
// Usage:  npx tsx scripts/verify/verify-zips.ts
// Output: scripts/verify/output/zip-report.csv
//
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "node:fs";
import * as path from "node:path";

import {
  ZIP_TO_COUNTY,
  ALL_COUNTIES,
} from "../../apps/contractor/src/data/county-jurisdictions";

// ── Census Data ─────────────────────────────────────────────────────────────

// The ZCTA-to-County file maps ZCTAs (ZIP code areas) to counties.
// Format is pipe-delimited with header. Key fields:
// GEOID_ZCTA5_20 | GEOID_COUNTY_20 | ... (other population/area fields)
// A ZCTA can span multiple counties — the file has one row per ZCTA-county pair.

const CENSUS_ZCTA_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";

interface ZctaCountyRow {
  zcta: string;
  countyFips: string;
  // We'll use the FIPS to look up county name from our data
}

async function downloadCensusZctaData(): Promise<ZctaCountyRow[]> {
  console.log("Downloading Census Bureau ZCTA-to-County data...");
  console.log("(This is a large file — may take 30-60 seconds)\n");

  const res = await fetch(CENSUS_ZCTA_URL);
  if (!res.ok) throw new Error(`Census download failed: ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());

  // File format (18 pipe-delimited columns):
  //   [1]  GEOID_ZCTA5_20   — ZIP/ZCTA code (5 digits)
  //   [9]  GEOID_COUNTY_20  — County FIPS code (5 digits)
  //   [10] NAMELSAD_COUNTY_20 — County name
  // Some rows have empty ZCTA fields — skip those.
  const ZCTA_IDX = 1;
  const COUNTY_FIPS_IDX = 9;

  // Only keep MD (24), PA (42), DE (10) entries
  const targetPrefixes = ["24", "42", "10"];
  const data: ZctaCountyRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("|");
    if (parts.length < 10) continue;

    const zcta = parts[ZCTA_IDX].trim();
    const countyFips = parts[COUNTY_FIPS_IDX].trim();

    // Skip rows with empty ZCTA or county FIPS
    if (!zcta || !countyFips) continue;

    const stateFips = countyFips.slice(0, 2);
    if (!targetPrefixes.includes(stateFips)) continue;

    data.push({ zcta, countyFips });
  }

  console.log(
    `  Downloaded ${lines.length - 1} total records, filtered to ${data.length} MD/PA/DE entries.\n`
  );
  return data;
}

// ── CSV helpers ─────────────────────────────────────────────────────────────

function csvVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("4Margin KB ZIP-to-County Verification");
  console.log("=====================================\n");

  // Build FIPS → county name lookup from our data
  const fipsToCounty = new Map<string, { county: string; state: string }>();
  for (const c of ALL_COUNTIES) {
    fipsToCounty.set(c.fipsCode, { county: c.county, state: c.state });
  }

  // State FIPS → abbreviation
  const stateByFips: Record<string, string> = {
    "24": "MD",
    "42": "PA",
    "10": "DE",
  };

  let censusData: ZctaCountyRow[];
  try {
    censusData = await downloadCensusZctaData();
  } catch (err) {
    console.error("Failed to download Census data:", err);
    console.log("\nFalling back to structural validation only...\n");
    censusData = [];
  }

  // Build Census lookup: ZIP → array of county FIPS (a ZIP can span counties)
  const censusByZip = new Map<string, string[]>();
  for (const row of censusData) {
    const existing = censusByZip.get(row.zcta) || [];
    existing.push(row.countyFips);
    censusByZip.set(row.zcta, existing);
  }

  // Check every ZIP in our data
  const ourZips = Object.entries(ZIP_TO_COUNTY);
  console.log(`Our ZIP_TO_COUNTY has ${ourZips.length} entries.`);
  console.log(
    `Census data has ${censusByZip.size} ZCTAs in MD/PA/DE.\n`
  );

  const results: {
    zip: string;
    ourCounty: string;
    ourState: string;
    censusCountyFips: string[];
    censusCountyNames: string[];
    verdict: string;
    notes: string;
  }[] = [];

  let matched = 0;
  let mismatched = 0;
  let noCensus = 0;
  let multiCounty = 0;

  for (const [zip, info] of ourZips) {
    const censusCountyFips = censusByZip.get(zip) || [];

    if (censusData.length === 0) {
      // No census data — structural check only
      results.push({
        zip,
        ourCounty: info.county,
        ourState: info.state,
        censusCountyFips: [],
        censusCountyNames: [],
        verdict: "NO CENSUS DATA",
        notes: "Census download failed — manual check required",
      });
      noCensus++;
      continue;
    }

    if (censusCountyFips.length === 0) {
      results.push({
        zip,
        ourCounty: info.county,
        ourState: info.state,
        censusCountyFips: [],
        censusCountyNames: [],
        verdict: "ZIP NOT IN CENSUS",
        notes: "This ZIP may be a PO Box or special-use ZIP",
      });
      noCensus++;
      continue;
    }

    // Resolve census FIPS to county names
    const censusCountyNames = censusCountyFips.map((fips) => {
      const match = fipsToCounty.get(fips);
      return match ? `${match.county}, ${match.state}` : `FIPS:${fips}`;
    });

    // Check if our county is among the census matches
    const ourCountyEntry = ALL_COUNTIES.find(
      (c) => c.county === info.county && c.state === info.state
    );
    const ourFips = ourCountyEntry?.fipsCode;

    if (ourFips && censusCountyFips.includes(ourFips)) {
      if (censusCountyFips.length > 1) {
        results.push({
          zip,
          ourCounty: info.county,
          ourState: info.state,
          censusCountyFips,
          censusCountyNames,
          verdict: "MATCH (MULTI-COUNTY ZIP)",
          notes: `ZIP spans ${censusCountyFips.length} counties — our assignment is one of them`,
        });
        matched++;
        multiCounty++;
      } else {
        results.push({
          zip,
          ourCounty: info.county,
          ourState: info.state,
          censusCountyFips,
          censusCountyNames,
          verdict: "MATCH",
          notes: "",
        });
        matched++;
      }
    } else {
      results.push({
        zip,
        ourCounty: info.county,
        ourState: info.state,
        censusCountyFips,
        censusCountyNames,
        verdict: "MISMATCH",
        notes: `Our: ${info.county} (${ourFips || "no FIPS"}). Census: ${censusCountyNames.join("; ")}`,
      });
      mismatched++;
    }
  }

  console.log(`Results:`);
  console.log(`  Matched:         ${matched} / ${ourZips.length}`);
  console.log(`    Multi-county:  ${multiCounty} (matched, but ZIP spans counties)`);
  console.log(`  Mismatched:      ${mismatched}`);
  console.log(`  Not in Census:   ${noCensus}`);

  // Check for orphan counties (counties with no ZIPs)
  const countiesWithZips = new Set(
    ourZips.map(([, info]) => `${info.state}-${info.county}`)
  );
  const orphanCounties = ALL_COUNTIES.filter(
    (c) => !countiesWithZips.has(`${c.state}-${c.county}`)
  );

  if (orphanCounties.length > 0) {
    console.log(`\n  Orphan counties (no ZIP mappings): ${orphanCounties.length}`);
    for (const c of orphanCounties) {
      console.log(`    - ${c.state} ${c.county}`);
    }
  }

  // Write CSV
  const outDir = path.join(__dirname, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const headers = [
    "ZIP",
    "Our County",
    "Our State",
    "Census County FIPS",
    "Census County Names",
    "Verdict",
    "Notes",
  ];

  const rows = results.map((r) =>
    [
      r.zip,
      r.ourCounty,
      r.ourState,
      r.censusCountyFips.join("; "),
      r.censusCountyNames.join("; "),
      r.verdict,
      r.notes,
    ].map(csvVal)
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  fs.writeFileSync(path.join(outDir, "zip-report.csv"), csv, "utf-8");
  console.log(`\nReport: ${path.join(outDir, "zip-report.csv")}`);

  // Print mismatches to console
  const mismatches = results.filter((r) => r.verdict === "MISMATCH");
  if (mismatches.length > 0) {
    console.log(`\n--- MISMATCHED ZIPs (need manual review) ---\n`);
    for (const r of mismatches.slice(0, 25)) {
      console.log(`  ${r.zip}: Ours=${r.ourCounty},${r.ourState} → Census=${r.censusCountyNames.join(" / ")}`);
    }
    if (mismatches.length > 25) {
      console.log(`  ... and ${mismatches.length - 25} more (see CSV)`);
    }
  }
}

main().catch(console.error);
