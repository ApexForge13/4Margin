# Supporting Arguments PDF — Reference Links

**Date:** 2026-03-09
**Status:** Approved

## Summary

Add clickable hyperlinks to the Supporting Arguments section of the supplement PDF. Each line item gets a "References" footer with links to the relevant IRC code section, manufacturer installation guide, and county permits/code office page.

## Per-Item Footer Format

After each item's justification bullet points:

```
References:
  📖 IRC R905.2.8.2 — codes.iccsafe.org/...
  🏭 GAF Installation Instructions — gaf.com/...
  🏛 Howard County, MD Permits — howardcountymd.gov/...
```

Links are clickable in the PDF. Each link type is optional — only rendered when the data exists for that item.

## Data Sources

### 1. IRC Code Links
- Source: `irc_reference` field on each supplement item (e.g., `"R905.2.8.2"`)
- URL target: ICC Digital Codes — `codes.iccsafe.org/content/IRC2018P7/chapter-9-roof-assemblies`
- Implementation: `ircSectionToUrl(section, state)` helper in `building-codes.ts`
- Maps IRC chapter prefixes to ICC URL fragments:
  - `R9xx` → Chapter 9 (Roof Assemblies)
  - `R8xx` → Chapter 8 (Roof-Ceiling Construction)
  - `R3xx` → Chapter 3 (Building Planning)
  - Falls back to ICC main IRC page if section can't be mapped

### 2. Manufacturer Install Guide Links
- Source: `sourceUrl` on `ManufacturerRequirement` records
- Lookup: `getRequirementsForXactimateCode(item.xactimate_code)` → first match's `sourceUrl`
- Already stored in data — GAF, OC, IKO, Atlas, Tamko, CertainTeed all have URLs

### 3. County Code Office / Permits Links
- Source: New `permitUrl` field on county entries in `county-jurisdictions.ts`
- Lookup: `lookupCountyByZip(zip)` → county entry → `permitUrl`
- Need to add URLs for all 43 counties (24 MD + 16 PA + 3 DE)

## Files Changed

| File | Change |
|------|--------|
| `generate-supplement.ts` | Render reference links after each justification block using `doc.textWithLink()` |
| `generate-supplement.ts` | Add `referenceLinks` to `SupplementPdfData.items[]` type |
| `building-codes.ts` | Add `ircSectionToUrl(section, state?)` helper |
| `county-jurisdictions.ts` | Add `permitUrl: string` to `CountyJurisdiction` type + populate 43 entries |
| `finalize/route.ts` | Resolve reference links when building PDF data (IRC + manufacturer + county) |

## PDF Rendering Details

- Font: 7pt helvetica, sky-600 color for links
- Each link prefixed with an emoji icon (📖 / 🏭 / 🏛) for visual scanning
- Links rendered via jsPDF `doc.textWithLink(text, x, y, { url })` for clickable PDF links
- Indented under a "References:" label in textMuted color
- ~30pt vertical space per reference block (3 links × 10pt line height)
