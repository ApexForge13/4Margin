# Confidence Scorer + Delta Math Design

**Date:** 2026-03-09
**Status:** Approved
**Scope:** Supplement engine confidence scoring overhaul + adjuster line item extraction + delta math

---

## Problem

Roofing material items (felt, IWS, waste, steep pitch) score low confidence (5-55) despite being backed by EagleView measurements. The scorer has no concept of measurement evidence. Additionally, supplement quantities are AI-invented rather than computed as the delta between EV measurements and adjuster scope.

## Change 1: Measurement Evidence Dimension

Add a 5th scoring dimension to the confidence scorer.

**New formula:** 5 dimensions x 30 pts = 150 raw, normalized to 0-100.

| Dimension | Max | Description |
|-----------|-----|-------------|
| Policy Support | 30 | Does the policy cover this item? |
| Code Authority | 30 | Is this code-required in this county? |
| Manufacturer Requirement | 30 | Does the manufacturer require it? |
| Physical Presence | 30 | Is this item physically on the roof? |
| **Measurement Evidence** | **30** | **Is quantity backed by EV/measurement data?** |

### Measurement Evidence Scoring

| Scenario | Score | Reasoning |
|----------|-------|-----------|
| Quantity derived directly from measurement (felt, IWS, waste, steep) | 30 | Hard measurement proof |
| Measurements exist but item not directly derived (dumpster, permit) | 10 | Measurements support scope |
| No measurements provided | 0 | No measurement basis |

### Confidence Floors (updated)

| Item type | Floor | Rationale |
|-----------|-------|-----------|
| D&R accessories (on-roof) | 85 | Physical presence is indisputable |
| Measurement-backed roofing items | 65 | EV measurement is strong evidence |
| Dumpster | 70 | Standard scope item |
| Permits | 65 | Code-required |

### Files Changed

- `apps/contractor/src/lib/scoring/confidence.ts` — add MeasurementContext interface, scoreMeasurementEvidence(), update normalization from /120 to /150
- `apps/contractor/src/lib/ai/pipeline.ts` — tag items with measurement source, pass MeasurementContext, add measurement-backed floor

## Change 2: Adjuster Line Item Extraction (Delta Math)

### Phase A: Claude extracts adjuster items

Add `adjuster_items` array to Claude's JSON response schema:

```json
{
  "adjuster_items": [
    { "xactimate_code": "RFG SHGL", "description": "Shingles", "quantity": 25.08, "unit": "SQ", "unit_price": 251.06 },
    { "xactimate_code": "RFG FELT", "description": "Felt underlayment", "quantity": 10.97, "unit": "SQ" }
  ]
}
```

Store in `adjuster_estimate_parsed` JSONB alongside existing data.

### Phase B: Pipeline delta math

After Claude returns, pipeline computes correct supplement quantities:

| Item | Formula |
|------|---------|
| Shingle waste | (measuredSQ x (1 + waste%)) - adjusterShingleSQ |
| Felt/underlayment | ((totalRoofArea - IWS_SF) / 100) - adjusterFeltSQ |
| IWS in valleys | (valleyLF x 3) - adjusterIWS_SF |
| Steep pitch | steepAreaSF - adjusterSteepSF |

Pipeline overrides Claude's quantities with calculated deltas for these 4 item types.

### Justification Language

Delta justifications follow this pattern:
> "Measurement report shows [X] total. Adjuster scoped [Y]. Supplement for the difference: [Z]."

### Files Changed

- `apps/contractor/src/lib/ai/analyze.ts` — add adjuster_items to JSON schema, update prompt, parse response
- `apps/contractor/src/lib/ai/pipeline.ts` — delta math overrides for felt/IWS/steep (waste override already exists, update it)
- `apps/contractor/src/lib/calculators/waste.ts` — accept adjusterShingleSQ param for delta calc

## Implementation Order

1. Measurement Evidence dimension in confidence.ts (isolated, no dependencies)
2. Adjuster items extraction in analyze.ts (prompt + schema change)
3. Delta math overrides in pipeline.ts (depends on #2)
4. Wire measurement context into pipeline scoring (depends on #1 + #3)
5. Update waste calculator for delta (depends on #2)
6. Update confidence floors in pipeline.ts
