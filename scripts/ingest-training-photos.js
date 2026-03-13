#!/usr/bin/env node
/**
 * ingest-training-photos.js
 *
 * Reads photos from a local folder, uploads to Supabase Storage,
 * classifies with Claude Haiku Vision, and stores labels in training_photos.
 *
 * Usage:
 *   node scripts/ingest-training-photos.js "/path/to/photos" --concurrency=5 --dry-run --resume
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load env from project root .env.local
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk").default || require("@anthropic-ai/sdk");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".tiff", ".webp"]);
const VIDEO_EXTS = new Set([".mov", ".mp4", ".avi", ".m4v", ".3gp", ".mkv", ".wmv"]);
const HEIC_EXTS = new Set([".heic", ".heif"]);

const CLASSIFICATION_PROMPT = `You are classifying photos for a roofing contractor's training dataset.

If this is NOT a roofing, construction, or property photo (e.g. personal photo, selfie, food, pet, screenshot), return:
{"category": "non_roofing", "subcategory": null, "damage_severity": null, "components_visible": [], "description": "Not a roofing photo", "confidence": 0.95}

Otherwise classify using this taxonomy:

category (required): elevation | roof_overview | damage | component | repair_install | install | interior_damage | estimate_photo | other
subcategory (required):
  - If elevation: front | front_left | left | back_left | back | back_right | right | front_right
  - If damage: hail | wind | mechanical | thermal | blistering | wear | tree | other
  - If interior_damage: ceiling | wall | floor | window | attic | other
  - If component: pipe_jack | ridge_cap | vent | flashing | valley | drip_edge | gutter | skylight | chimney | soffit | fascia | starter_strip | hip_cap | step_flashing | counter_flashing | boot | turbine | satellite_mount | other
  - If install: tear_off | underlayment | shingle_install | flashing_install | ridge_install | completed | other
  - If estimate_photo: xactimate | handwritten | printed | other
  - If roof_overview/repair_install/other: null or descriptive string
damage_severity: none | minor | moderate | severe (null if not a damage photo)
components_visible: array of roofing components visible in the photo
description: 1-2 sentence plain English description of what you see
confidence: 0.0 to 1.0, how confident you are in this classification

Return ONLY a JSON object — no markdown, no code fences.`;

const STORAGE_BUCKET = "training-photos";
const HAIKU_MODEL = "claude-3-5-haiku-20241022";
const MAX_RETRIES = 3;

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { concurrency: 5, dryRun: false, resume: false, folder: null };

  for (const arg of args) {
    if (arg.startsWith("--concurrency=")) {
      opts.concurrency = parseInt(arg.split("=")[1], 10) || 5;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--resume") {
      opts.resume = true;
    } else if (!arg.startsWith("--")) {
      opts.folder = arg;
    }
  }

  if (!opts.folder) {
    console.error("Usage: node scripts/ingest-training-photos.js <folder> [--concurrency=N] [--dry-run] [--resume]");
    process.exit(1);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Recursively scan for image files
// ---------------------------------------------------------------------------
function scanFolder(dir) {
  const results = [];

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      console.warn(`[WARN] Cannot read directory: ${current} — ${err.message}`);
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext)) {
          results.push(full);
        } else if (VIDEO_EXTS.has(ext)) {
          // Skip video files silently
        }
        // Skip all other non-media files silently
      }
    }
  }

  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// HEIC conversion
// ---------------------------------------------------------------------------
let heicConvert = null;

async function loadHeicConvert() {
  if (!heicConvert) {
    heicConvert = require("heic-convert");
  }
  return heicConvert;
}

async function readImageBuffer(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath);

  if (HEIC_EXTS.has(ext)) {
    const convert = await loadHeicConvert();
    const jpegBuffer = await convert({
      buffer: raw,
      format: "JPEG",
      quality: 0.9,
    });
    return { buffer: Buffer.from(jpegBuffer), mediaType: "image/jpeg", uploadExt: "jpg" };
  }

  const mediaTypeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tiff": "image/tiff",
    ".webp": "image/webp",
  };

  return { buffer: raw, mediaType: mediaTypeMap[ext] || "image/jpeg", uploadExt: ext.slice(1) };
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------
async function withRetry(fn, label, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.warn(`[RETRY] ${label} — attempt ${attempt}/${retries} failed: ${err.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ---------------------------------------------------------------------------
// Semaphore for concurrency control
// ---------------------------------------------------------------------------
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.current--;
    }
  }
}

// ---------------------------------------------------------------------------
// Classify image with Claude Haiku Vision
// ---------------------------------------------------------------------------
async function classifyImage(anthropic, base64, mediaType) {
  return withRetry(async () => {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: CLASSIFICATION_PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].text.trim();
    // Try to parse JSON — handle potential markdown fences
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    return JSON.parse(jsonStr);
  }, "Haiku classification");
}

// ---------------------------------------------------------------------------
// Process a single photo
// ---------------------------------------------------------------------------
async function processPhoto(filePath, { supabase, anthropic, dryRun, stats }) {
  const filename = path.basename(filePath);
  const uuid = crypto.randomUUID();

  try {
    // 1. Read and possibly convert image
    const { buffer, mediaType, uploadExt } = await readImageBuffer(filePath);
    const storagePath = `${uuid}.${uploadExt}`;

    if (dryRun) {
      // In dry-run, still classify but don't upload or insert
      const base64 = buffer.toString("base64");
      const classification = await classifyImage(anthropic, base64, mediaType);
      const isRoofing = classification.category !== "non_roofing";
      if (isRoofing) stats.roofing++;
      else stats.nonRoofing++;
      stats.processed++;
      return;
    }

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: mediaType, upsert: false });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 3. Classify with Haiku
    const base64 = buffer.toString("base64");
    const classification = await classifyImage(anthropic, base64, mediaType);

    const isRoofing = classification.category !== "non_roofing";

    // 4. Insert into training_photos
    const row = {
      id: uuid,
      storage_path: storagePath,
      original_filename: filename,
      category: classification.category || "other",
      subcategory: classification.subcategory || null,
      damage_severity: classification.damage_severity || null,
      components_visible: classification.components_visible || [],
      ai_description: classification.description || null,
      ai_confidence: classification.confidence != null ? classification.confidence : null,
      source: "bulk_ingest",
      status: "labeled",
    };

    const { error: insertError } = await supabase.from("training_photos").insert(row);
    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

    if (isRoofing) stats.roofing++;
    else stats.nonRoofing++;
    stats.processed++;
  } catch (err) {
    stats.errors++;
    stats.processed++;
    console.error(`[ERROR] ${filename}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();

  // Validate env
  const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`Missing environment variable: ${key}`);
      process.exit(1);
    }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`Scanning folder: ${opts.folder}`);
  const allFiles = scanFolder(opts.folder);
  console.log(`Found ${allFiles.length.toLocaleString()} image files`);

  if (allFiles.length === 0) {
    console.log("No images found. Exiting.");
    return;
  }

  // Resume support — filter out already-processed files
  let files = allFiles;
  if (opts.resume) {
    console.log("Checking for already-processed files...");
    const processedSet = new Set();

    // Paginate through all training_photos to build the set
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("training_photos")
        .select("original_filename")
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error(`Failed to query training_photos for resume: ${error.message}`);
        process.exit(1);
      }

      if (!data || data.length === 0) break;
      for (const row of data) {
        processedSet.add(row.original_filename);
      }
      offset += pageSize;
      if (data.length < pageSize) break;
    }

    const before = files.length;
    files = files.filter((f) => !processedSet.has(path.basename(f)));
    const skipped = before - files.length;
    console.log(`Resuming — ${skipped.toLocaleString()} already processed, ${files.length.toLocaleString()} remaining`);
  }

  if (files.length === 0) {
    console.log("All files already processed. Exiting.");
    return;
  }

  if (opts.dryRun) {
    console.log("[DRY RUN] Will classify but not upload or insert into DB");
  }

  const stats = { processed: 0, roofing: 0, nonRoofing: 0, errors: 0 };
  const total = files.length;
  const startTime = Date.now();
  const sem = new Semaphore(opts.concurrency);
  const LOG_INTERVAL = 100;

  // Process all files with concurrency control
  const promises = files.map(async (filePath) => {
    await sem.acquire();
    try {
      await processPhoto(filePath, { supabase, anthropic, dryRun: opts.dryRun, stats });
    } finally {
      sem.release();
    }

    // Log progress every LOG_INTERVAL photos
    if (stats.processed % LOG_INTERVAL === 0 && stats.processed > 0) {
      const pct = ((stats.processed / total) * 100).toFixed(1);
      console.log(
        `[${stats.processed.toLocaleString()} / ${total.toLocaleString()}] ${pct}% — ` +
          `${stats.roofing.toLocaleString()} roofing, ${stats.nonRoofing.toLocaleString()} non-roofing, ${stats.errors.toLocaleString()} errors`
      );
    }
  });

  await Promise.all(promises);

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n--- INGEST COMPLETE ---");
  console.log(`Total processed: ${stats.processed.toLocaleString()}`);
  console.log(`Roofing photos:  ${stats.roofing.toLocaleString()}`);
  console.log(`Non-roofing:     ${stats.nonRoofing.toLocaleString()}`);
  console.log(`Errors:          ${stats.errors.toLocaleString()}`);
  console.log(`Elapsed:         ${elapsed}s`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
