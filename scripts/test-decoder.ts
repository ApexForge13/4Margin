#!/usr/bin/env npx tsx
/**
 * Policy Decoder Test Harness
 *
 * Runs all PDF policies in a folder through the shared parser,
 * saves JSON results + individual PDFs, and generates two branded
 * summary PDFs: one for DecodeCoverage (consumer), one for 4Margin (contractor).
 *
 * Usage:
 *   npx tsx scripts/test-decoder.ts "/path/to/test policies"
 *
 * Output goes to scripts/test-output/<timestamp>/
 */

import * as fs from "fs";
import * as path from "path";
import { parsePolicyPdfV2 } from "../packages/policy-engine/src/parser";
import type { PolicyAnalysis } from "../packages/policy-engine/src/parser";
import { generateDecoderPdf } from "../packages/pdf/src/decoder-pdf";
import type { DecoderPdfData } from "../packages/pdf/src/decoder-pdf";
import { jsPDF } from "jspdf";

// ── CLI Args ─────────────────────────────────────────────────────────────────

const inputDir = process.argv[2];
if (!inputDir) {
  console.error("Usage: npx tsx scripts/test-decoder.ts <folder-path>");
  console.error('  e.g. npx tsx scripts/test-decoder.ts ~/Desktop/"test policies"');
  process.exit(1);
}

const resolvedDir = path.resolve(inputDir);
if (!fs.existsSync(resolvedDir)) {
  console.error(`Folder not found: ${resolvedDir}`);
  process.exit(1);
}

// ── Find PDFs ────────────────────────────────────────────────────────────────

const pdfFiles = fs
  .readdirSync(resolvedDir)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .sort();

if (pdfFiles.length === 0) {
  console.error(`No PDF files found in: ${resolvedDir}`);
  process.exit(1);
}

console.log(`\nFound ${pdfFiles.length} PDF(s) in ${resolvedDir}\n`);

// ── Output Dir ───────────────────────────────────────────────────────────────

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outputDir = path.join(__dirname, "test-output", timestamp);
fs.mkdirSync(path.join(outputDir, "json"), { recursive: true });
fs.mkdirSync(path.join(outputDir, "pdf"), { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

function analysisToDecoderPdfData(
  a: PolicyAnalysis,
  filename: string
): DecoderPdfData {
  return {
    policyType: a.policyType || "",
    carrier: a.carrier || "",
    policyNumber: a.policyNumber || "",
    effectiveDate: a.effectiveDate || null,
    expirationDate: a.expirationDate || null,
    namedInsured: a.namedInsured || "",
    propertyAddress: a.propertyAddress || "",
    riskLevel: a.riskLevel || "medium",
    confidence: 0,
    summaryForContractor: a.summaryForContractor || "",
    documentType: a.documentType || "",
    scanQuality: a.scanQuality || "",
    coverages: a.coverages || [],
    deductibles: a.deductibles || [],
    depreciationMethod: a.depreciationMethod || "",
    depreciationNotes: a.depreciationNotes || "",
    exclusions: (a.exclusions || []).map((e) => ({
      name: e.name,
      severity: e.severity,
      description: e.description,
      impact: e.impact,
    })),
    endorsements: (a.endorsements || []).map((e) => ({
      name: e.name,
      number: e.number || null,
      severity: e.severity,
      description: e.description,
      impact: e.impact,
    })),
    landmines: (a.landmines || []).map((l) => ({
      name: l.name,
      severity: l.severity,
      impact: l.impact,
      actionItem: l.actionItem,
    })),
    favorableProvisions: (a.favorableProvisions || []).map((f) => ({
      name: f.name,
      impact: f.impact,
    })),
    generatedDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

interface TestResult {
  filename: string;
  success: boolean;
  error?: string;
  analysis?: PolicyAnalysis;
  durationMs?: number;
}

// ── Summary PDF Generator ────────────────────────────────────────────────────

function generateSummaryPdf(
  brand: "decodecoverage" | "4margin",
  results: TestResult[]
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentW = pageW - margin * 2;
  let y = margin;

  const isDC = brand === "decodecoverage";
  const title = isDC
    ? "DecodeCoverage — Test Results Summary"
    : "4Margin — Test Results Summary";
  const subtitle = isDC
    ? "Consumer-Facing Coverage Health Reports"
    : "Contractor-Facing Policy Analysis Reports";

  // Header
  doc.setFillColor(isDC ? 59 : 15, isDC ? 130 : 23, isDC ? 246 : 42);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 35);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, margin, 55);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US")}`, margin, 72);

  y = 100;

  // Stats
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Test Run Summary", margin, y);
  y += 20;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Policies: ${results.length}`, margin, y);
  y += 16;
  doc.text(`Successful: ${successful.length}`, margin, y);
  y += 16;
  doc.text(`Failed: ${failed.length}`, margin, y);
  y += 16;

  if (successful.length > 0) {
    const avgMs =
      successful.reduce((s, r) => s + (r.durationMs || 0), 0) / successful.length;
    doc.text(`Avg Processing Time: ${(avgMs / 1000).toFixed(1)}s`, margin, y);
  }
  y += 30;

  // Per-policy results
  for (const result of results) {
    // Check if we need a new page
    if (y > 680) {
      doc.addPage();
      y = margin;
    }

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentW, y);
    y += 15;

    // Filename
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(result.filename, margin, y);
    y += 18;

    if (!result.success) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 38, 38);
      doc.text(`ERROR: ${result.error || "Unknown error"}`, margin, y);
      y += 20;
      continue;
    }

    const a = result.analysis!;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);

    // Common info
    const lines = [
      `Carrier: ${a.carrier || "Unknown"}  |  Policy Type: ${a.policyType || "Unknown"}  |  Form: ${a.endorsementFormNumbers?.join(", ") || "—"}`,
      `Named Insured: ${a.namedInsured || "—"}  |  Property: ${a.propertyAddress || "—"}`,
      `Risk Level: ${a.riskLevel?.toUpperCase()}  |  Depreciation: ${a.depreciationMethod}  |  Doc Type: ${a.documentType}  |  Scan Quality: ${a.scanQuality}`,
      `Coverages: ${a.coverages.length}  |  Deductibles: ${a.deductibles.length}  |  Exclusions: ${a.exclusions.length}  |  Endorsements: ${a.endorsements.length}`,
      `Landmines: ${a.landmines.length}  |  Favorable: ${a.favorableProvisions.length}  |  Processing: ${((result.durationMs || 0) / 1000).toFixed(1)}s`,
    ];

    for (const line of lines) {
      doc.text(line, margin, y);
      y += 14;
    }

    // Brand-specific content
    y += 4;
    if (isDC) {
      // Consumer view: Coverage Health Score breakdown
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text("Consumer View — Key Findings:", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);

      // Show critical exclusions
      const criticals = a.exclusions.filter((e) => e.severity === "critical");
      if (criticals.length > 0) {
        doc.text(`Critical Gaps (${criticals.length}):`, margin + 10, y);
        y += 12;
        for (const ex of criticals.slice(0, 3)) {
          const text = `• ${ex.name}: ${ex.impact}`;
          const wrapped = doc.splitTextToSize(text, contentW - 20);
          doc.text(wrapped, margin + 20, y);
          y += wrapped.length * 12;
        }
        if (criticals.length > 3) {
          doc.text(`  ... and ${criticals.length - 3} more`, margin + 20, y);
          y += 12;
        }
      }

      // Landmines for consumer
      if (a.landmines.length > 0) {
        doc.text(`Hidden Risks (${a.landmines.length}):`, margin + 10, y);
        y += 12;
        for (const lm of a.landmines.slice(0, 3)) {
          const text = `• ${lm.name}: ${lm.impact}`;
          const wrapped = doc.splitTextToSize(text, contentW - 20);
          doc.text(wrapped, margin + 20, y);
          y += wrapped.length * 12;
        }
      }
    } else {
      // Contractor view: Supplement-relevant details
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Contractor View — Supplement Intel:", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Contractor summary
      if (a.summaryForContractor) {
        const wrapped = doc.splitTextToSize(a.summaryForContractor, contentW - 20);
        doc.text(wrapped.slice(0, 4), margin + 10, y);
        y += Math.min(wrapped.length, 4) * 12;
      }

      y += 4;

      // Favorable provisions (supplement relevant)
      if (a.favorableProvisions.length > 0) {
        doc.text(`Favorable Provisions (${a.favorableProvisions.length}):`, margin + 10, y);
        y += 12;
        for (const fp of a.favorableProvisions.slice(0, 3)) {
          const text = `• ${fp.name}: ${fp.supplementRelevance || fp.impact}`;
          const wrapped = doc.splitTextToSize(text, contentW - 20);
          doc.text(wrapped, margin + 20, y);
          y += wrapped.length * 12;
        }
      }

      // Deductible details
      if (a.deductibles.length > 0) {
        doc.text(`Deductibles (${a.deductibles.length}):`, margin + 10, y);
        y += 12;
        for (const d of a.deductibles) {
          doc.text(
            `• ${d.type}: ${d.amount}${d.dollarAmount ? ` ($${d.dollarAmount.toLocaleString()})` : ""} — ${d.appliesTo}`,
            margin + 20,
            y
          );
          y += 12;
        }
      }
    }

    y += 15;
  }

  // Footer
  doc.addPage();
  y = margin;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  const disclaimer = isDC
    ? "This report was generated by DecodeCoverage AI. Results should be verified by a licensed insurance professional."
    : "This report was generated by 4Margin Policy Decoder. All findings should be verified against the original policy documents before use in supplement preparation.";
  const wrapped = doc.splitTextToSize(disclaimer, contentW);
  doc.text(wrapped, margin, y);

  return doc.output("arraybuffer");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const results: TestResult[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const filename = pdfFiles[i];
    const filepath = path.join(resolvedDir, filename);
    const label = `[${i + 1}/${pdfFiles.length}]`;

    console.log(`${label} Processing: ${filename}`);

    try {
      const pdfBuffer = fs.readFileSync(filepath);
      const pdfBase64 = pdfBuffer.toString("base64");

      const start = Date.now();
      const analysis = await parsePolicyPdfV2(pdfBase64);
      const durationMs = Date.now() - start;

      console.log(
        `${label} ✓ Done in ${(durationMs / 1000).toFixed(1)}s — ` +
          `${analysis.carrier} | ${analysis.riskLevel} risk | ` +
          `${analysis.exclusions.length} exclusions | ` +
          `${analysis.landmines.length} landmines`
      );

      // Save JSON
      const jsonPath = path.join(
        outputDir,
        "json",
        filename.replace(/\.pdf$/i, ".json")
      );
      fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2));

      // Generate individual PDF
      const pdfData = analysisToDecoderPdfData(analysis, filename);
      const pdfOutput = generateDecoderPdf(pdfData);
      const pdfPath = path.join(
        outputDir,
        "pdf",
        filename.replace(/\.pdf$/i, "-analysis.pdf")
      );
      fs.writeFileSync(pdfPath, Buffer.from(pdfOutput));

      results.push({ filename, success: true, analysis, durationMs });

      // Brief pause between policies to avoid rate limiting
      if (i < pdfFiles.length - 1) {
        console.log(`${label} Waiting 5s before next policy...`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ FAILED: ${msg}`);
      results.push({ filename, success: false, error: msg });
    }
  }

  // Generate summary PDFs
  console.log("\nGenerating summary PDFs...");

  const dcSummary = generateSummaryPdf("decodecoverage", results);
  fs.writeFileSync(
    path.join(outputDir, "SUMMARY-DecodeCoverage-Consumer.pdf"),
    Buffer.from(dcSummary)
  );

  const fourMSummary = generateSummaryPdf("4margin", results);
  fs.writeFileSync(
    path.join(outputDir, "SUMMARY-4Margin-Contractor.pdf"),
    Buffer.from(fourMSummary)
  );

  // Print final summary
  console.log("\n" + "=".repeat(60));
  console.log("TEST RUN COMPLETE");
  console.log("=".repeat(60));
  console.log(`Total: ${results.length} policies`);
  console.log(`Success: ${results.filter((r) => r.success).length}`);
  console.log(`Failed: ${results.filter((r) => !r.success).length}`);
  console.log(`\nOutput: ${outputDir}`);
  console.log(`  json/           — Raw JSON results per policy`);
  console.log(`  pdf/            — Individual analysis PDFs`);
  console.log(`  SUMMARY-DecodeCoverage-Consumer.pdf`);
  console.log(`  SUMMARY-4Margin-Contractor.pdf`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
