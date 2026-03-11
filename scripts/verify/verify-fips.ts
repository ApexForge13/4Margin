#!/usr/bin/env npx tsx
// ── verify-fips.ts ────────────────────────────────────────────────────────────
//
// Validates every CountyJurisdiction.fipsCode against the Census Bureau's
// official FIPS county code list.
//
// Downloads:  https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt
//
// Usage:  npx tsx scripts/verify/verify-fips.ts
// Output: scripts/verify/output/fips-report.csv
//
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "node:fs";
import * as path from "node:path";

import { ALL_COUNTIES } from "../../apps/contractor/src/data/county-jurisdictions";

// ── Census Data ─────────────────────────────────────────────────────────────

// Census national_county file format (pipe-delimited):
// STATE|STATEFP|COUNTYFP|COUNTYNS|COUNAME|CLASSFP|FUNCSTAT
// e.g.: MD|24|001|01709065|Allegany County|H1|A

const CENSUS_URL =
  "https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt";

interface CensusFips {
  state: string;
  stateFp: string;
  countyFp: string;
  fullFips: string; // stateFp + countyFp = 5 digits
  countyName: string;
}

async function downloadCensusData(): Promise<CensusFips[]> {
  console.log("Downloading Census Bureau FIPS data...");
  const res = await fetch(CENSUS_URL);
  if (!res.ok) throw new Error(`Census download failed: ${res.status}`);

  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim());

  // Skip header
  const data: CensusFips[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("|");
    if (parts.length < 5) continue;

    const [state, stateFp, countyFp, , countyName] = parts;
    data.push({
      state: state.trim(),
      stateFp: stateFp.trim(),
      countyFp: countyFp.trim(),
      fullFips: stateFp.trim() + countyFp.trim(),
      countyName: countyName.trim(),
    });
  }

  console.log(`  Downloaded ${data.length} Census FIPS records.\n`);
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
  console.log("4Margin KB FIPS Code Verification");
  console.log("=================================\n");

  const censusData = await downloadCensusData();

  // Build lookup by fullFips
  const censusByFips = new Map<string, CensusFips>();
  for (const c of censusData) {
    censusByFips.set(c.fullFips, c);
  }

  // State prefix validation
  const STATE_PREFIX: Record<string, string> = {
    MD: "24",
    PA: "42",
    DE: "10",
  };

  const results: {
    county: string;
    state: string;
    ourFips: string;
    censusMatch: string | null;
    censusCountyName: string | null;
    prefixOk: boolean;
    nameMatch: boolean;
    verdict: string;
  }[] = [];

  let matched = 0;
  let mismatched = 0;
  let missing = 0;

  for (const c of ALL_COUNTIES) {
    const censusEntry = censusByFips.get(c.fipsCode);
    const expectedPrefix = STATE_PREFIX[c.state];
    const prefixOk = c.fipsCode.startsWith(expectedPrefix);

    if (!censusEntry) {
      results.push({
        county: c.county,
        state: c.state,
        ourFips: c.fipsCode,
        censusMatch: null,
        censusCountyName: null,
        prefixOk,
        nameMatch: false,
        verdict: "NOT FOUND IN CENSUS",
      });
      missing++;
      continue;
    }

    // Check if county name roughly matches (Census adds " County" suffix)
    const censusName = censusEntry.countyName
      .replace(/ County$/i, "")
      .replace(/ city$/i, " City")
      .trim();
    const ourName = c.county.trim();
    const nameMatch =
      censusName.toLowerCase() === ourName.toLowerCase() ||
      censusEntry.countyName.toLowerCase().includes(ourName.toLowerCase());

    if (prefixOk && nameMatch) {
      results.push({
        county: c.county,
        state: c.state,
        ourFips: c.fipsCode,
        censusMatch: censusEntry.fullFips,
        censusCountyName: censusEntry.countyName,
        prefixOk,
        nameMatch,
        verdict: "MATCH",
      });
      matched++;
    } else {
      results.push({
        county: c.county,
        state: c.state,
        ourFips: c.fipsCode,
        censusMatch: censusEntry.fullFips,
        censusCountyName: censusEntry.countyName,
        prefixOk,
        nameMatch,
        verdict: nameMatch
          ? "FIPS MATCH / NAME CLOSE"
          : prefixOk
            ? "FIPS FOUND / NAME MISMATCH"
            : "PREFIX WRONG",
      });
      mismatched++;
    }
  }

  console.log(`Results:`);
  console.log(`  Matched:    ${matched} / ${ALL_COUNTIES.length}`);
  console.log(`  Mismatched: ${mismatched}`);
  console.log(`  Not Found:  ${missing}`);

  // Write CSV
  const outDir = path.join(__dirname, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const headers = [
    "County",
    "State",
    "Our FIPS",
    "Census FIPS",
    "Census County Name",
    "Prefix OK",
    "Name Match",
    "Verdict",
  ];

  const rows = results.map((r) =>
    [
      r.county,
      r.state,
      r.ourFips,
      r.censusMatch || "",
      r.censusCountyName || "",
      String(r.prefixOk),
      String(r.nameMatch),
      r.verdict,
    ].map(csvVal)
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  fs.writeFileSync(path.join(outDir, "fips-report.csv"), csv, "utf-8");
  console.log(`\nReport: ${path.join(outDir, "fips-report.csv")}`);

  // Print issues
  const issues = results.filter((r) => r.verdict !== "MATCH");
  if (issues.length > 0) {
    console.log(`\n--- Issues ---\n`);
    for (const r of issues) {
      console.log(
        `  [${r.verdict}] ${r.state} ${r.county}: ours=${r.ourFips} census=${r.censusMatch || "N/A"} (${r.censusCountyName || "N/A"})`
      );
    }
  } else {
    console.log(`\nAll ${ALL_COUNTIES.length} FIPS codes match Census data.`);
  }
}

main().catch(console.error);
