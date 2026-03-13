# Photo Training Pipeline — Design Document

**Date:** 2026-03-13
**Status:** Approved
**Branch:** TBD (photo-training-pipeline)

## Purpose

Build a classified photo dataset from ~26K raw iPhone photos (of which ~10K are roofing-related) to train Claude Vision's roofing photo analysis. This is **training data only** — never attached to jobs, supplements, or carrier-facing documents. The labeled dataset improves auto-classification accuracy when contractors upload photos on real jobs.

## Taxonomy

### Categories
- `elevation` — Ground-level shots of house sides
- `roof_overview` — Wide shots from the roof showing general condition
- `damage` — Any damage documentation
- `component` — Close-ups of specific roofing components
- `repair_install` — During or after work shots
- `non_roofing` — Personal/non-roofing photos (auto-filtered)
- `other` — Roofing-related but doesn't fit above categories

### Subcategories

**Elevation (8-point):** front, front_left, left, back_left, back, back_right, right, front_right

**Damage types:** hail, wind, mechanical, thermal, blistering, wear, tree, other

**Components:** pipe_jack, ridge_cap, vent, flashing, valley, drip_edge, gutter, skylight, chimney, soffit, fascia, starter_strip, hip_cap, step_flashing, counter_flashing, boot, turbine, satellite_mount, other

### Additional Fields
- `damage_severity`: none / minor / moderate / severe (null for non-damage)
- `components_visible`: JSON array of components in frame
- `description`: 1-2 sentence plain English description from Haiku
- `confidence`: 0.0 - 1.0

## Architecture

### Database — `training_photos` table

```sql
CREATE TABLE training_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path    TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size       INTEGER,
  mime_type       TEXT,
  category        TEXT NOT NULL DEFAULT 'other',
  subcategory     TEXT,
  damage_severity TEXT,
  components_visible JSONB DEFAULT '[]',
  description     TEXT,
  confidence      REAL,
  reviewed        BOOLEAN NOT NULL DEFAULT false,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  source          TEXT NOT NULL DEFAULT 'highmark_historical',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

No `company_id` — platform-level training data, not tenant-scoped. No RLS (service role key only, like `consumer_leads`).

### Storage — Supabase

- Bucket: `training-photos` (private)
- Path format: `{category}/{uuid}.{ext}` (organized after classification)
- Full original files, no compression
- Estimated: ~26K images x 3-5MB = 80-130GB
- Current usage: 0.183GB of 100GB Pro tier

### Ingest Script — `scripts/ingest-training-photos.js`

Node.js CLI that runs locally on the dev machine.

**Input:** A folder path containing raw iPad photos (all 26K)

**Behavior:**
1. Scans folder recursively for image files (jpg, jpeg, png, heic, heif, tiff, webp)
2. Skips video files (mov, mp4, avi, m4v, 3gp, mkv)
3. Converts HEIC/HEIF to JPEG via `heic-convert` package
4. Uploads original to Supabase Storage (`training-photos/{uuid}.{ext}`)
5. Sends image to Claude Haiku Vision for classification
6. Writes classification results to `training_photos` table
7. Logs progress every 100 photos

**Resilience:**
- Batch concurrency: 5 parallel (upload + classify)
- Resume support: skips files already in DB by `original_filename`
- Retry with exponential backoff on failures (3 attempts)
- Saves progress to a local `.ingest-progress.json` file

**Estimated runtime:** 4-6 hours for 26K photos at 5 concurrent
**Estimated cost:** ~$80-160 for Haiku Vision (26K photos with descriptions)

### Haiku Classification Prompt

```
Classify this photo for a roofing contractor's training dataset.

If this is NOT a roofing/construction/property photo, return category "non_roofing".

Otherwise classify:

category: elevation | roof_overview | damage | component | repair_install | other
subcategory: (see taxonomy)
damage_severity: none | minor | moderate | severe (null if not damage)
components_visible: array of roofing components visible in the photo
description: 1-2 sentence plain English description of what you see
confidence: 0.0-1.0 how confident you are in this classification

Return JSON only.
```

### Review UI — `/dashboard/admin/photo-review`

Admin-only page in the contractor app.

**Features:**
- Photo grid with Haiku labels overlaid
- Filter by: category, subcategory, confidence range, reviewed status
- Click card → large preview + editable label dropdowns
- Keyboard navigation (arrow keys + Enter to confirm)
- Batch confirm: select all >90% confidence in a category, confirm in one click
- Stats bar: total / reviewed / corrected / remaining / accuracy rate

**Only shows roofing photos** — `non_roofing` category hidden by default (toggle to show if needed).

### How It Feeds the Product

The labeled dataset becomes context for the existing `analyzePhoto()` function in `src/lib/ai/photos.ts`. When a contractor uploads a job photo:

1. System queries `training_photos` for reviewed examples matching the detected category
2. Includes 3-5 few-shot examples in the Vision prompt
3. Better classification → better auto-labeling → less manual work for contractors

Future: Photo knowledge base library for contractor reference ("these are examples of hail damage vs. mechanical damage").

## Cost Summary

| Item | Estimated Cost |
|------|---------------|
| Haiku Vision (26K photos) | $80-160 |
| Supabase Storage (80-130GB) | $0-7.50/mo overage |
| **Total initial** | **~$90-170** |

## Implementation Tasks

1. Migration: `training_photos` table + `training-photos` storage bucket
2. Ingest script: upload + Haiku classification + DB write
3. Review UI: admin page with grid, filters, edit, batch confirm
4. Wire to product: update `analyzePhoto()` to pull few-shot examples from training data
