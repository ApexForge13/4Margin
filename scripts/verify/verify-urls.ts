#!/usr/bin/env npx tsx
// ── verify-urls.ts ────────────────────────────────────────────────────────────
//
// HTTP HEAD every URL in the knowledge base and report status.
// Eliminates ~30% of manual URL verification work.
//
// Usage:  npx tsx scripts/verify/verify-urls.ts
// Output: scripts/verify/output/url-report.csv
//
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "node:fs";
import * as path from "node:path";

import { ALL_COUNTIES } from "../../apps/contractor/src/data/county-jurisdictions";
import { ALL_MANUFACTURERS } from "../../apps/contractor/src/data/manufacturers/index";
import { BUILDING_CODES } from "../../apps/contractor/src/data/building-codes";

// ── Collect all URLs ────────────────────────────────────────────────────────

interface UrlEntry {
  source: string;
  itemId: string;
  field: string;
  url: string;
}

function collectUrls(): UrlEntry[] {
  const urls: UrlEntry[] = [];

  // County AHJ URLs
  for (const c of ALL_COUNTIES) {
    if (c.permit.ahjUrl) {
      urls.push({
        source: "county-jurisdictions",
        itemId: `${c.state}-${c.county}`,
        field: "permit.ahjUrl",
        url: c.permit.ahjUrl,
      });
    }
  }

  // Manufacturer website + documentLibrary
  for (const [name, mfr] of Object.entries(ALL_MANUFACTURERS)) {
    urls.push({
      source: "manufacturers",
      itemId: name,
      field: "website",
      url: mfr.website,
    });
    urls.push({
      source: "manufacturers",
      itemId: name,
      field: "documentLibrary",
      url: mfr.documentLibrary,
    });

    // Product line source docs
    for (const pl of mfr.productLines) {
      if (pl.sourceDoc) {
        urls.push({
          source: "manufacturers",
          itemId: `${name}/${pl.name}`,
          field: "productLine.sourceDoc",
          url: pl.sourceDoc,
        });
      }
    }

    // Individual requirement source URLs
    for (const req of mfr.installationRequirements) {
      if (req.sourceUrl) {
        urls.push({
          source: "manufacturers",
          itemId: req.id,
          field: "sourceUrl",
          url: req.sourceUrl,
        });
      }
    }
  }

  // Deduplicate by URL (same URL may appear in multiple contexts)
  const seen = new Set<string>();
  return urls.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

// ── Check URL ───────────────────────────────────────────────────────────────

interface UrlResult extends UrlEntry {
  status: number | "error";
  statusText: string;
  redirectUrl: string | null;
  responseTimeMs: number;
}

async function checkUrl(entry: UrlEntry): Promise<UrlResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(entry.url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; 4Margin-KBVerify/1.0; +https://4margin.com)",
      },
    });

    clearTimeout(timeout);

    // Check if we were redirected to a different host
    const finalUrl = res.url;
    const redirectUrl =
      finalUrl && finalUrl !== entry.url ? finalUrl : null;

    return {
      ...entry,
      status: res.status,
      statusText: res.statusText,
      redirectUrl,
      responseTimeMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // If HEAD fails, try GET (some servers reject HEAD)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(entry.url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; 4Margin-KBVerify/1.0; +https://4margin.com)",
        },
      });

      clearTimeout(timeout);
      // Read minimal body to complete the request
      await res.text().catch(() => {});

      const finalUrl = res.url;
      const redirectUrl =
        finalUrl && finalUrl !== entry.url ? finalUrl : null;

      return {
        ...entry,
        status: res.status,
        statusText: `${res.statusText} (GET fallback)`,
        redirectUrl,
        responseTimeMs: Date.now() - start,
      };
    } catch {
      return {
        ...entry,
        status: "error",
        statusText: message.slice(0, 100),
        redirectUrl: null,
        responseTimeMs: Date.now() - start,
      };
    }
  }
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
  console.log("4Margin KB URL Verification");
  console.log("===========================\n");

  const urls = collectUrls();
  console.log(`Found ${urls.length} unique URLs to check.\n`);

  // Check URLs with concurrency limit (5 at a time)
  const CONCURRENCY = 5;
  const results: UrlResult[] = [];
  let completed = 0;

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(checkUrl));
    results.push(...batchResults);
    completed += batch.length;
    process.stdout.write(`\r  Checked ${completed}/${urls.length} URLs...`);
  }

  console.log("\n");

  // Classify results
  const alive = results.filter(
    (r) => typeof r.status === "number" && r.status >= 200 && r.status < 400
  );
  const redirected = results.filter((r) => r.redirectUrl !== null);
  const broken = results.filter(
    (r) =>
      r.status === "error" ||
      (typeof r.status === "number" && r.status >= 400)
  );

  console.log(`Results:`);
  console.log(`  Alive (2xx/3xx): ${alive.length}`);
  console.log(`  Redirected:      ${redirected.length}`);
  console.log(`  Broken (4xx+):   ${broken.length}`);

  // Write CSV report
  const outDir = path.join(__dirname, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const headers = [
    "Source",
    "Item ID",
    "Field",
    "URL",
    "HTTP Status",
    "Status Text",
    "Redirect URL",
    "Response Time (ms)",
    "Verdict",
  ];

  const rows = results.map((r) => [
    csvVal(r.source),
    csvVal(r.itemId),
    csvVal(r.field),
    csvVal(r.url),
    csvVal(r.status),
    csvVal(r.statusText),
    csvVal(r.redirectUrl),
    csvVal(r.responseTimeMs),
    csvVal(
      r.status === "error"
        ? "BROKEN"
        : typeof r.status === "number" && r.status >= 400
          ? "BROKEN"
          : r.redirectUrl
            ? "REDIRECT"
            : "OK"
    ),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const outPath = path.join(outDir, "url-report.csv");
  fs.writeFileSync(outPath, csv, "utf-8");

  console.log(`\nReport: ${outPath}`);

  // Print broken URLs to console for immediate attention
  if (broken.length > 0) {
    console.log(`\n--- BROKEN URLs (need manual check) ---\n`);
    for (const r of broken) {
      console.log(`  [${r.status}] ${r.itemId} → ${r.url}`);
      console.log(`         ${r.statusText}`);
    }
  }
}

main().catch(console.error);
