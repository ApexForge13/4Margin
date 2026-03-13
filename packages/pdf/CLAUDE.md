# @4margin/pdf — PDF Generation

## What This Is

Shared package for generating PDF documents across 4Margin apps. Currently generates the B2C decoder PDF for DecodeCoverage. Will expand to handle all document types (supplements, cover letters, inspection reports, proposals, CoC, etc.).

## Exports

- `generateDecoderPdf(data: DecoderPdfData): ArrayBuffer` — Generates the homeowner-facing policy decode PDF

## Source Files

```
src/
├── index.ts          # Re-exports
└── decoder-pdf.ts    # Decoder PDF generation logic
```

## Key Conventions

- Direct TS imports (no build step) — `"main": "./src/index.ts"`
- Returns `ArrayBuffer` for flexibility (can be stored, streamed, or sent as response)
- All PDFs must support contractor branding (logo, extracted brand colors)
- All PDFs must include educational disclaimer footer
- Document design: clean, professional, universal template system with brand color accents on headers/footers/dividers

## Future Document Types

As the platform expands, this package will generate:
- Contractor-facing policy decode report
- Homeowner-facing policy decode report
- Inspection / damage reports (from AI Inspect photos)
- Three-tier retail proposals
- Supplement evidence packages
- Cover letters
- Certificates of completion
- Depreciation recovery letters
- Production packets
- Business reports

Each document type follows the universal template system: logo at top, brand colors on accents, consistent typography, disclaimer footer.
