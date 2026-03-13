# Photo Training Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a photo ingest script + review UI that classifies ~26K raw iPhone photos into a labeled roofing training dataset stored in Supabase.

**Architecture:** Node.js CLI script reads photos from a local folder, uploads originals to Supabase Storage (`training-photos` bucket), sends each to Claude Haiku Vision for classification, and stores labels in a `training_photos` table. An admin review page lets the user filter by confidence and correct labels. Non-roofing photos are auto-tagged and hidden.

**Tech Stack:** Node.js script (fs, @supabase/supabase-js, @anthropic-ai/sdk, heic-convert), Supabase Storage + PostgreSQL, Next.js 15 + Tailwind + shadcn/ui for review UI.

---

### Task 1: Database Migration

**Files:**
- Create: `apps/contractor/supabase/migrations/041_training_photos.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- Migration 041: Training photos table for photo AI pipeline
-- Stores Haiku Vision classification results for bulk training
-- data. Platform-level (no company_id), no RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS training_photos (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path      TEXT        NOT NULL,
  original_filename TEXT        NOT NULL,
  file_size         INTEGER,
  mime_type         TEXT,
  category          TEXT        NOT NULL DEFAULT 'other',
  subcategory       TEXT,
  damage_severity   TEXT,
  components_visible JSONB      NOT NULL DEFAULT '[]',
  description       TEXT,
  confidence        REAL,
  reviewed          BOOLEAN     NOT NULL DEFAULT false,
  reviewed_by       UUID        REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  source            TEXT        NOT NULL DEFAULT 'highmark_historical',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — platform-level training data, accessed via service role key only
-- (same pattern as consumer_leads in decodecoverage)

CREATE INDEX IF NOT EXISTS idx_training_photos_category
  ON training_photos (category);

CREATE INDEX IF NOT EXISTS idx_training_photos_confidence
  ON training_photos (confidence)
  WHERE category != 'non_roofing';

CREATE INDEX IF NOT EXISTS idx_training_photos_review
  ON training_photos (reviewed)
  WHERE category != 'non_roofing';

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_photos_filename
  ON training_photos (original_filename);
```

**Step 2: Commit**

```bash
git add apps/contractor/supabase/migrations/041_training_photos.sql
git commit -m "feat: add training_photos migration for photo AI pipeline"
```

**Note:** This migration must be applied to Supabase manually before the ingest script runs. Also create the `training-photos` storage bucket in the Supabase dashboard (private, no public access).

---

### Task 2: Ingest Script — Core Upload + Classification

**Files:**
- Create: `scripts/ingest-training-photos.js`

**Step 1: Write the ingest script**

The script must:

1. Accept a folder path as CLI argument: `node scripts/ingest-training-photos.js "/path/to/photos"`
2. Accept optional flags: `--concurrency=5` (default 5), `--dry-run` (scan only, no upload), `--resume` (skip already-ingested files)
3. Recursively scan the folder for image files (extensions: `.jpg`, `.jpeg`, `.png`, `.heic`, `.heif`, `.tiff`, `.webp`)
4. Skip video files (`.mov`, `.mp4`, `.avi`, `.m4v`, `.3gp`, `.mkv`, `.wmv`)
5. Skip non-media files silently
6. For HEIC/HEIF files, convert to JPEG buffer using `heic-convert` before upload and classification
7. Upload each image to Supabase Storage bucket `training-photos` with path `{uuid}.{ext}` (flat structure, uuid generated per file)
8. Send the image to Claude Haiku Vision (`claude-3-5-haiku-20241022`) with this prompt:

```
You are classifying photos for a roofing contractor's training dataset.

If this is NOT a roofing, construction, or property photo (e.g. personal photo, selfie, food, pet, screenshot), return:
{"category": "non_roofing", "subcategory": null, "damage_severity": null, "components_visible": [], "description": "Not a roofing photo", "confidence": 0.95}

Otherwise classify using this taxonomy:

category (required): elevation | roof_overview | damage | component | repair_install | other
subcategory (required):
  - If elevation: front | front_left | left | back_left | back | back_right | right | front_right
  - If damage: hail | wind | mechanical | thermal | blistering | wear | tree | other
  - If component: pipe_jack | ridge_cap | vent | flashing | valley | drip_edge | gutter | skylight | chimney | soffit | fascia | starter_strip | hip_cap | step_flashing | counter_flashing | boot | turbine | satellite_mount | other
  - If roof_overview/repair_install/other: null or descriptive string
damage_severity: none | minor | moderate | severe (null if not a damage photo)
components_visible: array of roofing components visible in the photo
description: 1-2 sentence plain English description of what you see
confidence: 0.0 to 1.0, how confident you are in this classification

Return ONLY a JSON object — no markdown, no code fences.
```

9. Parse Haiku's JSON response and insert a row into `training_photos` table with all fields
10. Handle errors per-photo (log and continue, don't abort the batch)
11. Log progress every 100 photos: `[1,200 / 26,000] 4.6% — 847 roofing, 353 non-roofing, 0 errors`
12. At completion, log summary: total processed, roofing count, non-roofing count, error count, elapsed time, estimated Haiku cost

**Concurrency model:**
- Use a semaphore pattern (simple counter + promise queue) to limit concurrent operations
- Each "operation" = upload to storage + send to Haiku + insert to DB (sequential per photo, parallel across photos)

**Resume support:**
- On start, query `training_photos` for all `original_filename` values
- Build a Set of already-processed filenames
- Skip any file whose name is already in the Set
- Log: `Resuming — 4,200 already processed, 21,800 remaining`

**Dependencies to install at project root:**
```bash
npm install heic-convert @supabase/supabase-js @anthropic-ai/sdk
```

Note: `@supabase/supabase-js` and `@anthropic-ai/sdk` are likely already installed in the contractor app. `heic-convert` is new. Install at root level since the script lives in `scripts/`.

**Environment:** Script reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` from `.env` or `.env.local` in the project root. Use `dotenv` to load (already a dependency).

**Step 2: Test with 5 photos**

Before running the full batch:
```bash
# Create a test folder with 5 photos (mix of roofing + non-roofing)
node scripts/ingest-training-photos.js "./test-photos" --concurrency=1
```

Verify in Supabase:
- 5 rows in `training_photos`
- 5 files in `training-photos` storage bucket
- Non-roofing photos tagged correctly
- Roofing photos have reasonable categories

**Step 3: Commit**

```bash
git add scripts/ingest-training-photos.js package.json package-lock.json
git commit -m "feat: add photo training ingest script with Haiku Vision classification"
```

---

### Task 3: Review UI — Server Component + Data Fetching

**Files:**
- Create: `apps/contractor/src/app/(dashboard)/dashboard/admin/photo-review/page.tsx`

**Step 1: Build the server component page**

This is an admin-only page. The server component should:

1. Check auth — redirect if not logged in
2. Accept search params for filters: `?category=damage&minConfidence=0&maxConfidence=0.8&reviewed=false`
3. Query `training_photos` using service role client (no RLS on this table):
   - Default filter: `category != 'non_roofing'` AND `reviewed = false`
   - Apply category filter if present
   - Apply confidence range if present
   - Order by `confidence ASC` (lowest confidence first = most needs review)
   - Limit to 100 per page with offset pagination
4. Also query aggregate stats: total count, reviewed count, by-category counts
5. Pass data to a client component `<PhotoReviewClient />`

**Step 2: Commit**

```bash
git add apps/contractor/src/app/\(dashboard\)/dashboard/admin/photo-review/page.tsx
git commit -m "feat: add photo review server page with filtered data fetching"
```

---

### Task 4: Review UI — Client Component

**Files:**
- Create: `apps/contractor/src/components/admin/photo-review-client.tsx`

**Step 1: Build the review client component**

Client component with "use client" directive. Features:

1. **Stats bar** at top: Total photos | Reviewed | Remaining | Accuracy (corrections / reviewed)
2. **Filter bar**: Category dropdown, confidence range slider, reviewed toggle, "Show non-roofing" toggle (off by default)
3. **Photo grid**: 4-column grid of photo cards. Each card shows:
   - Thumbnail image (from Supabase Storage signed URL)
   - Category + subcategory badge
   - Confidence percentage (color-coded: green >90%, amber 70-90%, red <70%)
   - Checkmark overlay if reviewed
4. **Detail modal** (click a card): Large image preview + editable fields:
   - Category dropdown (all 7 options)
   - Subcategory dropdown (filtered by selected category)
   - Damage severity dropdown (only if category = damage)
   - Components visible (multi-select or comma-separated input)
   - Description (textarea, pre-filled with Haiku's)
   - Confidence displayed (read-only)
   - "Confirm" button (marks reviewed=true, keeps labels as-is)
   - "Save & Next" button (saves edits, marks reviewed, advances to next photo)
   - Keyboard: Enter = Confirm, Arrow Right = Next, Arrow Left = Previous
5. **Batch actions**: "Confirm All Visible" button — marks all currently displayed photos as reviewed without changes. Useful for high-confidence batches.
6. **Pagination**: "Load More" button or infinite scroll

**API routes needed** (create in next task):
- `PATCH /api/admin/training-photos/[id]` — update labels + mark reviewed
- `POST /api/admin/training-photos/batch-confirm` — mark multiple as reviewed

**Step 2: Commit**

```bash
git add apps/contractor/src/components/admin/photo-review-client.tsx
git commit -m "feat: add photo review client component with grid, modal, batch confirm"
```

---

### Task 5: Review UI — API Routes

**Files:**
- Create: `apps/contractor/src/app/api/admin/training-photos/[id]/route.ts`
- Create: `apps/contractor/src/app/api/admin/training-photos/batch-confirm/route.ts`

**Step 1: Build the PATCH route for single photo update**

```typescript
// PATCH /api/admin/training-photos/[id]
// Updates classification labels and marks as reviewed
// Body: { category?, subcategory?, damage_severity?, components_visible?, description? }
// Sets reviewed=true, reviewed_by=userId, reviewed_at=now()
```

Auth check required. Use service role client for the update (no RLS on training_photos).

**Step 2: Build the batch confirm route**

```typescript
// POST /api/admin/training-photos/batch-confirm
// Body: { ids: string[] }
// Sets reviewed=true, reviewed_by=userId, reviewed_at=now() for all IDs
```

**Step 3: Commit**

```bash
git add apps/contractor/src/app/api/admin/training-photos/
git commit -m "feat: add training photo review API routes (single update + batch confirm)"
```

---

### Task 6: Navigation + Polish

**Files:**
- Modify: `apps/contractor/src/components/dashboard/shell.tsx`

**Step 1: Add nav link**

Add a "Photo Review" link under the admin section of the sidebar nav. Use the `Camera` icon from lucide-react. Only visible to admin users. Links to `/dashboard/admin/photo-review`.

**Step 2: Verify the full flow**

1. Run `turbo dev --filter=@4margin/contractor`
2. Navigate to `/dashboard/admin/photo-review`
3. Verify: stats bar shows counts, grid shows photos, click opens modal, confirm/edit works, batch confirm works, filters work
4. Verify: keyboard nav (arrows + Enter) works in modal

**Step 3: Commit**

```bash
git add apps/contractor/src/components/dashboard/shell.tsx
git commit -m "feat: add photo review nav link to admin sidebar"
```

---

### Task 7: Run Full Ingest

**Not a code task — operational step.**

1. Plug in iPad, copy photos to a local folder (e.g., `C:/Users/New User/Pictures/iPad Photos`)
2. Ensure migration 041 is applied to Supabase
3. Ensure `training-photos` storage bucket exists in Supabase (create via dashboard if not)
4. Run:
```bash
node scripts/ingest-training-photos.js "C:/Users/New User/Pictures/iPad Photos" --concurrency=5
```
5. Monitor progress in terminal
6. Expected runtime: 4-6 hours for 26K photos
7. Can be interrupted and resumed with `--resume` flag (already built into script)

---

## Execution Summary

| Task | What | Est. Time |
|------|------|-----------|
| 1 | Migration | 5 min |
| 2 | Ingest script | 30-45 min |
| 3 | Review page (server) | 15 min |
| 4 | Review client component | 45-60 min |
| 5 | API routes | 15 min |
| 6 | Nav + polish | 10 min |
| 7 | Run full ingest | 4-6 hours (background) |

Tasks 1-6 are code. Task 7 is operational (runs while you work on the Xactimate doc).
