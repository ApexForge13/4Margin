# PDF Reference Links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add clickable hyperlinks (IRC codes, manufacturer guides, county permits) to the Supporting Arguments section of the supplement PDF.

**Architecture:** Add `ircSectionToUrl()` helper to map IRC section numbers to ICC Digital Codes URLs. At finalization, resolve all three link types per item (IRC, manufacturer, county) and pass them through `SupplementPdfData`. The PDF generator renders a "References" footer per item with `doc.textWithLink()`.

**Tech Stack:** jsPDF (`doc.textWithLink`), existing data modules (`building-codes.ts`, `manufacturers/index.ts`, `county-jurisdictions.ts`).

---

### Task 1: Add `ircSectionToUrl()` helper

**Files:**
- Modify: `apps/contractor/src/data/building-codes.ts` (append at end)

**Step 1: Add the helper function**

Append to the end of `building-codes.ts`:

```typescript
/**
 * Map an IRC section reference to an ICC Digital Codes URL.
 *
 * Input examples: "R905.2.8.2", "R903.2", "R806.2", "R301.2.1"
 * Falls back to the IRC 2018 table of contents if section can't be mapped.
 */
export function ircSectionToUrl(section: string | null | undefined): string | null {
  if (!section || section === "N/A") return null;

  // Strip leading whitespace and any "IRC " prefix
  const clean = section.replace(/^\s*(IRC\s*)?/i, "").trim();
  if (!clean) return null;

  const base = "https://codes.iccsafe.org/content/IRC2018P7";

  // Map by chapter prefix (first digit(s) after "R")
  const match = clean.match(/^R(\d+)/i);
  if (!match) return `${base}`;

  const chapterNum = parseInt(match[1].substring(0, 1), 10);
  // For 3-digit sections like R301, R905, the chapter is the hundreds digit
  const sectionNum = parseInt(match[1], 10);

  const chapterMap: Record<number, string> = {
    3: "/chapter-3-building-planning",
    4: "/chapter-4-foundations",
    5: "/chapter-5-floors",
    6: "/chapter-6-wall-construction",
    7: "/chapter-7-wall-covering",
    8: "/chapter-8-roof-ceiling-construction",
    9: "/chapter-9-roof-assemblies",
  };

  // Determine chapter from the section number (e.g., 905 → 9, 301 → 3, 806 → 8)
  const chapter = sectionNum >= 100 ? Math.floor(sectionNum / 100) : chapterNum;
  const path = chapterMap[chapter];

  if (path) return `${base}${path}`;
  return base;
}
```

**Step 2: Verify build**

Run: `npx turbo build --filter=@4margin/contractor`
Expected: PASS — no type errors

**Step 3: Commit**

```bash
git add apps/contractor/src/data/building-codes.ts
git commit -m "feat: add ircSectionToUrl helper for ICC code links"
```

---

### Task 2: Add `referenceLinks` to `SupplementPdfData`

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts` — type definition only

**Step 1: Add ReferenceLink type and extend the items array**

In `generate-supplement.ts`, add a `ReferenceLink` interface before `SupplementPdfData`, and add `referenceLinks?: ReferenceLink[]` to the items array type:

```typescript
export interface ReferenceLink {
  type: "code" | "manufacturer" | "county";
  label: string;
  url: string;
}
```

Add to the `items` array element type (after `confidence_tier`):

```typescript
    referenceLinks?: ReferenceLink[];
```

**Step 2: Verify build**

Run: `npx turbo build --filter=@4margin/contractor`
Expected: PASS — optional field, no breaking changes

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "feat: add ReferenceLink type to SupplementPdfData"
```

---

### Task 3: Render reference links in PDF

**Files:**
- Modify: `apps/contractor/src/lib/pdf/generate-supplement.ts` — justifications section

**Step 1: Add link rendering after each item's justification block**

In the Supporting Arguments section, after the existing IRC reference block (lines ~596-603) and before the spacer (line ~606), add reference link rendering:

Find this block:
```typescript
      // IRC Reference
      if (item.irc_reference) {
        checkPage(16);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.primaryDark);
        doc.text(`Code Ref: ${item.irc_reference}`, margin + 12, y);
        y += 12;
      }

      // Spacer between items
```

Replace with:
```typescript
      // IRC Reference (plain text label)
      if (item.irc_reference) {
        checkPage(16);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.primaryDark);
        doc.text(`Code Ref: ${item.irc_reference}`, margin + 12, y);
        y += 12;
      }

      // Reference links footer
      if (item.referenceLinks && item.referenceLinks.length > 0) {
        checkPage(12 + item.referenceLinks.length * 11);

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.textMuted);
        doc.text("References:", margin + 12, y);
        y += 10;

        for (const link of item.referenceLinks) {
          checkPage(12);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");

          const icon = link.type === "code" ? "§" : link.type === "manufacturer" ? "▸" : "⌂";

          setColor(BRAND.textMuted);
          doc.text(icon, margin + 16, y);

          // Clickable link text
          setColor(BRAND.primary);
          doc.textWithLink(link.label, margin + 24, y, { url: link.url });

          y += 10;
        }
        y += 2;
      }

      // Spacer between items
```

**Step 2: Verify build**

Run: `npx turbo build --filter=@4margin/contractor`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/contractor/src/lib/pdf/generate-supplement.ts
git commit -m "feat: render clickable reference links in supplement PDF"
```

---

### Task 4: Resolve reference links at finalization

**Files:**
- Modify: `apps/contractor/src/app/api/supplements/[id]/finalize/route.ts`

**Step 1: Add imports**

At the top of the finalize route, add:

```typescript
import { ircSectionToUrl } from "@/data/building-codes";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";
import { lookupCountyByZip } from "@/data/county-jurisdictions";
import type { ReferenceLink } from "@/lib/pdf/generate-supplement";
```

**Step 2: Build reference links per item**

In the finalize route, find where `pdfData.items` is built (the `items.map(...)` block around line 257). Add a helper before the `pdfData` object and modify the map:

Add this helper function inside the `POST` handler, before the `pdfData` construction:

```typescript
    // Resolve county from claim ZIP for permit links
    const propertyZip = (claim.property_zip as string) || "";
    const countyData = propertyZip ? lookupCountyByZip(propertyZip) : undefined;

    // Helper: build reference links for a given item
    function buildReferenceLinks(item: {
      xactimate_code: string;
      irc_reference?: string | null;
    }): ReferenceLink[] {
      const links: ReferenceLink[] = [];

      // 1. IRC code link
      const ircRef = item.irc_reference || "";
      const ircUrl = ircSectionToUrl(ircRef);
      if (ircUrl) {
        links.push({
          type: "code",
          label: `IRC ${ircRef} — ICC Digital Codes`,
          url: ircUrl,
        });
      }

      // 2. Manufacturer install guide link
      const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
      if (mfrMatches.length > 0) {
        const first = mfrMatches[0];
        if (first.requirement.sourceUrl) {
          links.push({
            type: "manufacturer",
            label: `${first.manufacturer} Installation Instructions`,
            url: first.requirement.sourceUrl,
          });
        }
      }

      // 3. County permits / code office link
      if (countyData?.permit.ahjUrl) {
        links.push({
          type: "county",
          label: `${countyData.county} County, ${countyData.state} — Permits & Inspections`,
          url: countyData.permit.ahjUrl,
        });
      }

      return links;
    }
```

Then modify the `items.map(...)` inside `pdfData` to include `referenceLinks`:

Change the existing map callback to add one line at the end:

```typescript
        referenceLinks: buildReferenceLinks(item),
```

**Step 3: Verify build**

Run: `npx turbo build --filter=@4margin/contractor`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/contractor/src/app/api/supplements/[id]/finalize/route.ts
git commit -m "feat: resolve IRC, manufacturer, and county reference links at finalization"
```

---

### Task 5: Build, verify, push

**Step 1: Full build**

Run: `npx turbo build --filter=@4margin/contractor`
Expected: PASS with 0 errors

**Step 2: Push**

```bash
git push
```

**Step 3: Verify Vercel deployment**

Check Vercel dashboard for successful deploy.
