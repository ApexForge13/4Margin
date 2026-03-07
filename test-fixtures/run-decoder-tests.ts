/**
 * Decoder test runner — parses all 13 sample policy PDFs through the
 * policy engine, then generates both a DecodeCoverage (B2C) and
 * 4Margin (B2B) branded PDF for each.
 *
 * Usage:  npx tsx test-fixtures/run-decoder-tests.ts
 *
 * Output: test-fixtures/output/dc/  (13 DecodeCoverage PDFs)
 *         test-fixtures/output/4m/  (13 4Margin PDFs)
 *         test-fixtures/output/results.json  (raw parse results)
 */

import fs from "fs";
import path from "path";
import { parsePolicyPdfV2 } from "../packages/policy-engine/src/parser";
import { generateDecoderPdf } from "../packages/pdf/src/decoder-pdf";
import type { DecoderPdfData } from "../packages/pdf/src/decoder-pdf";
import type { PolicyAnalysis } from "../packages/policy-engine/src/parser";

// ── Config ──────────────────────────────────────────────
const SAMPLE_DIR = path.resolve(__dirname, "sample-policies");
const OUTPUT_DIR = path.resolve(__dirname, "output");
const DC_DIR = path.join(OUTPUT_DIR, "dc");
const FM_DIR = path.join(OUTPUT_DIR, "4m");

// ── Helpers ─────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function analysisToDecoderData(
  analysis: PolicyAnalysis,
  brand: "decodecoverage" | "4margin"
): DecoderPdfData {
  return {
    policyType: analysis.policyType,
    carrier: analysis.carrier,
    policyNumber: analysis.policyNumber,
    effectiveDate: analysis.effectiveDate,
    expirationDate: analysis.expirationDate,
    namedInsured: analysis.namedInsured,
    propertyAddress: analysis.propertyAddress,

    riskLevel: analysis.riskLevel,
    confidence: analysis.confidence,
    summaryForContractor: analysis.summaryForContractor,
    documentType: analysis.documentType,
    scanQuality: analysis.scanQuality,

    coverages: analysis.coverages.map((c) => ({
      label: c.label,
      limit: c.limit,
      description: c.description,
    })),

    deductibles: analysis.deductibles.map((d) => ({
      type: d.type,
      amount: d.amount,
      dollarAmount: d.dollarAmount,
      appliesTo: d.appliesTo,
    })),

    depreciationMethod: analysis.depreciationMethod,
    depreciationNotes: analysis.depreciationNotes,

    exclusions: analysis.exclusions.map((e) => ({
      name: e.name,
      severity: e.severity,
      description: e.description,
      impact: e.impact,
    })),

    endorsements: analysis.endorsements.map((e) => ({
      name: e.name,
      number: e.number,
      severity: e.severity,
      description: e.description,
      impact: e.impact,
    })),

    landmines: analysis.landmines.map((l) => ({
      name: l.name,
      severity: l.severity,
      impact: l.impact,
      actionItem: l.actionItem,
    })),

    favorableProvisions: analysis.favorableProvisions.map((f) => ({
      name: f.name,
      impact: f.impact,
    })),

    generatedDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),

    brand,
  };
}

// ── Main ────────────────────────────────────────────────

async function main() {
  // Set API key from contractor .env.local
  const envPath = path.resolve(__dirname, "../apps/contractor/.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not found. Check apps/contractor/.env.local");
    process.exit(1);
  }

  ensureDir(DC_DIR);
  ensureDir(FM_DIR);

  // Get all sample PDFs sorted by number
  const pdfFiles = fs
    .readdirSync(SAMPLE_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      return numA - numB;
    });

  console.log(`\n=== DECODER TEST RUNNER ===`);
  console.log(`Found ${pdfFiles.length} sample PDFs\n`);

  const results: Record<string, { analysis: PolicyAnalysis | null; error?: string }> = {};
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pdfFiles.length; i++) {
    const filename = pdfFiles[i];
    const filePath = path.join(SAMPLE_DIR, filename);
    const baseName = filename.replace(".pdf", "");
    const num = i + 1;

    console.log(`[${num}/${pdfFiles.length}] Parsing: ${filename}`);
    const startTime = Date.now();

    try {
      // Read PDF and convert to base64
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfBase64 = pdfBuffer.toString("base64");

      // Parse through the 3-pass policy engine
      const analysis = await parsePolicyPdfV2(pdfBase64);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `  -> ${analysis.carrier || "Unknown"} ${analysis.policyType || "?"} | ` +
          `Risk: ${analysis.riskLevel} | Confidence: ${Math.round(analysis.confidence * 100)}% | ` +
          `${analysis.landmines.length} landmines, ${analysis.favorableProvisions.length} favorable | ` +
          `${elapsed}s`
      );

      // Generate DecodeCoverage PDF
      const dcData = analysisToDecoderData(analysis, "decodecoverage");
      const dcPdf = generateDecoderPdf(dcData);
      const dcPath = path.join(DC_DIR, `${baseName}-decodecoverage.pdf`);
      fs.writeFileSync(dcPath, Buffer.from(dcPdf));
      console.log(`  -> DC PDF: ${dcPath}`);

      // Generate 4Margin PDF
      const fmData = analysisToDecoderData(analysis, "4margin");
      const fmPdf = generateDecoderPdf(fmData);
      const fmPath = path.join(FM_DIR, `${baseName}-4margin.pdf`);
      fs.writeFileSync(fmPath, Buffer.from(fmPdf));
      console.log(`  -> 4M PDF: ${fmPath}`);

      results[filename] = { analysis };
      successCount++;
    } catch (err: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`  !! FAILED (${elapsed}s): ${err.message}`);
      results[filename] = { analysis: null, error: err.message };
      failCount++;
    }

    console.log();
  }

  // Save raw results JSON
  const resultsPath = path.join(OUTPUT_DIR, "results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  // Summary
  console.log(`\n=== RESULTS ===`);
  console.log(`Success: ${successCount}/${pdfFiles.length}`);
  console.log(`Failed:  ${failCount}/${pdfFiles.length}`);
  console.log(`\nDC PDFs: ${DC_DIR}`);
  console.log(`4M PDFs: ${FM_DIR}`);
  console.log(`Raw JSON: ${resultsPath}\n`);

  // Summary table
  console.log("File                  | Carrier              | Type  | Risk   | Conf | Landmines | Favorable");
  console.log("─".repeat(105));
  for (const [file, r] of Object.entries(results)) {
    if (r.analysis) {
      const a = r.analysis;
      console.log(
        `${file.padEnd(22)}| ${(a.carrier || "?").padEnd(21)}| ${(a.policyType || "?").padEnd(6)}| ${a.riskLevel.padEnd(7)}| ${(Math.round(a.confidence * 100) + "%").padEnd(5)}| ${String(a.landmines.length).padEnd(10)}| ${a.favorableProvisions.length}`
      );
    } else {
      console.log(`${file.padEnd(22)}| FAILED: ${r.error}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
