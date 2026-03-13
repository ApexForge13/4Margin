# @4margin/policy-engine — AI Policy Parser + Knowledge Base

## What This Is

Shared package that parses insurance policy PDFs using Claude AI and contains the insurance domain knowledge base. Used by both the contractor app and DecodeCoverage.

## Exports

### Parser
- `parsePolicyPdfV2(pdfBase64: string, options?): Promise<PolicyAnalysis>` — Main entry point. Sends PDF to Claude, returns structured analysis.

### Types (from parser)
- `PolicyAnalysis` — Top-level result (flat object with all analysis data)
- `DocumentMeta`, `PolicyCoverage`, `PolicyDeductible`, `PolicyExclusion`, `PolicyEndorsement`
- `DetectedLandmine`, `DetectedFavorable`, `SectionConfidence`

### Knowledge Base
- `LANDMINE_RULES` — Policy provisions that hurt the contractor
- `FAVORABLE_PROVISIONS` — Policy provisions that help the contractor
- `COVERAGE_SECTIONS` — Standard policy section definitions
- `DEPRECIATION_METHODS` — How carriers calculate depreciation
- `BASE_FORM_EXCLUSIONS` — Standard HO-3 exclusions
- `CARRIER_ENDORSEMENT_FORMS` — Common endorsement forms by carrier
- `CLAIM_TYPE_POLICY_SECTIONS` — Which sections matter for which claim types
- `getLandminesForClaimType(type)` — Filter landmines by claim type
- `getClaimTypeFocusPrompt(type)` — Get Claude prompt focus for claim type

### Carrier Profiles
- `CARRIER_PROFILES` — Carrier behavior data (aggressiveness, tactics, patterns)
- `CARRIER_CODE_OBJECTIONS` — How carriers object to specific code citations
- `getCarrierProfile(carrierName)` — Lookup carrier by name
- `getCarrierCodeObjections(carrierName)` — Get objection patterns
- `buildCarrierContextForPrompt(carrierName)` — Build Claude prompt context

### Utilities
- `withRetry(fn, options)` — Retry wrapper for API calls

## Source Files

```
src/
├── index.ts              # Re-exports everything
├── parser.ts             # Claude API integration, PDF parsing
├── knowledge.ts          # Insurance domain knowledge base
├── carrier-profiles.ts   # Carrier intelligence data
├── retry.ts              # Retry utility
├── knowledge.test.ts     # Knowledge base tests
└── carrier-profiles.test.ts  # Carrier profile tests
```

## Usage Pattern

```typescript
import { parsePolicyPdfV2, getCarrierProfile, LANDMINE_RULES } from '@4margin/policy-engine';

const analysis = await parsePolicyPdfV2(base64Pdf);
const carrier = getCarrierProfile(analysis.carrier);
```

## Key Conventions

- Direct TS imports (no build step) — `"main": "./src/index.ts"`
- All knowledge base entries must have citations or source references
- Carrier profiles must be factual and based on documented patterns
- Parser returns flat `PolicyAnalysis` object (not nested)
