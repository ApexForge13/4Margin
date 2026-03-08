# Code Engine Expansion — Design Doc

**Date:** 2026-03-08
**Scope:** Deepen IRC codes + manufacturer requirements for MD, southern PA, DE

## Goal
Build a comprehensive, jurisdiction-verified code authority database that maps every code-backed roofing line item to its IRC section, manufacturer requirement, and Xactimate code — covering MD (all counties), southern PA (below I-76 aligned with MD), and DE (all 3 counties).

## Current State
- `building-codes.ts` — 17 IRC entries, MD + PA jurisdictions only
- `county-jurisdictions.ts` — 24 MD counties + 14 PA counties, ZIP lookup
- `manufacturer-requirements.ts` — GAF + CertainTeed (9 + 6 requirements)

## File Structure (Approach B — Modular Manufacturers)

```
apps/contractor/src/data/
├── building-codes.ts              # EXPAND — add ~7 IRC sections + DE jurisdiction
├── county-jurisdictions.ts        # EXPAND — add 3 DE counties + 2 PA (Bedford, Fulton)
├── manufacturer-requirements.ts   # KEEP — GAF + CertainTeed (existing)
└── manufacturers/                 # NEW directory
    ├── index.ts                   # Re-exports all, unified lookup functions
    ├── owens-corning.ts           # NEW — Duration lines
    ├── iko.ts                     # NEW — Dynasty/Cambridge lines
    ├── atlas.ts                   # NEW — StormMaster/Pinnacle lines
    └── tamko.ts                   # NEW — Heritage/Titan XT lines
```

## New IRC Codes (building-codes.ts)

| # | Section | Title | Xactimate Codes | Why It Matters |
|---|---------|-------|-----------------|----------------|
| 1 | R908.3 | Re-roofing / Tear-off | RFG TEAR, RFG REMV | Max 2 layers — full tear-off mandatory when exceeded |
| 2 | R905.2.7 | Wind Resistance | (fastener/adhesion) | ASTM D7158 Class G/H per wind zone |
| 3 | R905.2.4 | Product Standards | (like-kind) | ASTM D3462 compliance, like-kind-and-quality |
| 4 | R903.2.2-CRICKET | Chimney Cricket/Saddle | RFG CRKT | Required when chimney >30" wide (dedicated entry) |
| 5 | R806.2 | Minimum Vent Area | RFG SOFV, RFG BFFL | NFA calculations, soffit vents, baffles |
| 6 | R301.2.1 | Wind Design Criteria | (drives fastener pattern) | ASCE 7-16 maps → 4 vs 6 nail, underlayment upgrades |
| 7 | R905.1.1 | Fire-Rated Assemblies | (product selection) | UL Class A/B/C rated products |

All existing 17 codes get DE jurisdiction added.

## Delaware Jurisdiction

- **IRC Edition:** 2021 IRC (county-level adoption)
- **Source:** New Castle: effective Jan 1, 2024; Sussex: effective Jan 1, 2023; Kent: similar
- **Climate Zone:** All 4A
- **Wind Speeds:** ~115 mph (ASCE 7-16)
- **Ice Barrier:** Required at eaves (January avg temp applicable)
- **3 counties:** New Castle, Kent, Sussex

## PA County Additions

- **Bedford County** — Climate Zone 5A, 115 mph, above Allegany MD
- **Fulton County** — Climate Zone 5A, 115 mph, between Bedford and Franklin

## New Manufacturers

Each follows existing `Manufacturer` interface with product lines, installation requirements (8-9 each), warranty tiers.

### Owens Corning
- Products: Duration, TruDefinition Duration, Duration STORM, Duration FLEX
- Key: SureNail Technology requirements
- Warranty: Standard, System Protection, Preferred Protection, Platinum, Total Protection Roofing System

### IKO
- Products: Dynasty, Cambridge, Nordic, Crowne Slate
- Key: ArmourZone nailing requirements
- Warranty: Iron Clad Protection, PRO4 Advantage

### Atlas
- Products: StormMaster Slate, Pinnacle Pristine, ProLam, Legend
- Key: Scotchgard Protector requirements
- Warranty: Signature Select, Pro Plus

### Tamko
- Products: Heritage, Elite Glass-Seal, Titan XT, Thunderstorm
- Key: WeatherBond warranty requirements
- Warranty: Standard, WeatherBond Limited

## Type Updates
- `CountyJurisdiction.state`: `"MD" | "PA"` → `"MD" | "PA" | "DE"`
- `JurisdictionCode.state`: `"MD" | "PA"` → `"MD" | "PA" | "DE"`
- Add `DE_JURISDICTION` constant
- Add `DE_COUNTIES` array

## Unified Manufacturer Index (manufacturers/index.ts)
```typescript
getAllManufacturers(): Manufacturer[]
getManufacturer(name: string): Manufacturer | undefined
getRequirementsForXactimateCode(code: string): { manufacturer: string; requirement: ManufacturerRequirement }[]
getCommonlyMissedItems(): { manufacturer: string; requirement: ManufacturerRequirement }[]
```
