# Upload-First Decoder Flow

## Date: 2026-03-01

## Problem

After paying for a decode, users land on a blank page ("waiting on your upload"), must navigate back to upload, then see only a spinner during 30-60s of processing. Too many clicks, no progress feedback.

## Solution: Upload-First Flow

Flip the order: upload first, pay after. Eliminates the blank post-payment page entirely.

### User Journeys

**First decode (free):**
Upload PDF (progress bar) -> auto-process immediately -> results inline

**Subsequent decodes ($50):**
Upload PDF (progress bar) -> "Pay $50" button -> Stripe checkout -> redirect back -> auto-process -> results inline

### Key Changes

1. **NewDecodeButton** - Creates draft, redirects to detail page (no Stripe redirect)
2. **DecoderFlow component** (new) - Replaces PolicyUpload. Unified upload + payment gate + processing progress + inline results
3. **Detail page** - Passes state to DecoderFlow, handles auto-process trigger on payment return
4. **Stripe checkout API** - Allow file to already exist on the decoding row

### What Stays the Same

- Parse API, Stripe webhook, PolicyDecoderResults, database schema, server actions

### Processing Progress UX

- Upload: real progress bar via XMLHttpRequest
- Processing: step indicators (Parsing PDF -> Analyzing coverages -> Identifying risks -> Generating report) + elapsed timer
- Results: rendered inline from API response (no page refresh)
