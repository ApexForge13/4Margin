# Carrier-Specific Policy Knowledge — Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

Expand the policy engine with carrier-specific intelligence: behavioral profiles, denial tactics, and per-carrier building code objection mappings for 13 carriers serving the MD/PA/DE/DC/VA market. All data is injected into AI prompts to make supplement output, rebuttals, and advocacy scripts carrier-aware. Not customer-facing — purely AI training context.

Sets the structural precedent for Option 4 (real outcome tracking via `carrier_patterns` table), where static knowledge gets validated and replaced by actual supplement outcome data over time.

## Carriers (13)

**Existing (8):** State Farm, Erie, Nationwide, Allstate, Travelers, USAA, Farmers, Liberty Mutual

**Adding (5):** Progressive, Amica, Auto-Owners, Chubb, Encompass

## Data Structures

### 1. Carrier Profiles (NEW)

Per-carrier behavioral intelligence for AI prompt injection.

```typescript
interface CarrierProfile {
  name: string;
  aliases: string[];                   // "SF", "State Farm Fire and Casualty"
  aggressiveness: "low" | "moderate" | "aggressive";
  supplementTactics: string[];         // "Delays 30+ days to pressure settlement"
  commonDenialLanguage: string[];      // "Not in original scope of loss"
  adjusterBehavior: string[];          // "Brings own measurements, rejects EagleView"
  depreciationApproach: string;        // "Aggressive ACV on roofs >10 years"
  cosmeticDamageStance: string;        // "Excludes via HW 08 02 endorsement"
  strengths: string[];                 // What they DO pay fairly
  weaknesses: string[];                // Where they consistently underpay
}
```

13 carriers × ~15-20 data points each.

### 2. Carrier-Code Objection Map (NEW)

Links carriers to specific building codes they commonly dispute.

```typescript
interface CarrierCodeObjection {
  carrierName: string;
  ircSection: string;                  // "R905.2.8.3"
  objectionRate: "high" | "medium" | "low";
  typicalObjection: string;            // "Not required for like-kind replacement"
  effectiveRebuttal: string;           // Carrier-specific rebuttal
}
```

~80-100 entries (not all 312 carrier×code combinations — only where knowledge exists).

### 3. Endorsement Forms Expansion (EXISTING)

Add endorsement forms for 5 new carriers (~3-5 forms each) to existing `CARRIER_ENDORSEMENT_FORMS` array in knowledge.ts.

## Architecture

### New File
- `packages/policy-engine/src/carrier-profiles.ts` — profiles + code objections + lookup functions

### Modified Files
- `packages/policy-engine/src/knowledge.ts` — add endorsement forms for 5 new carriers
- `packages/policy-engine/src/index.ts` — re-export new data
- `apps/contractor/src/data/policy-knowledge.ts` — re-export new data
- `apps/contractor/src/lib/ai/analyze.ts` — inject carrier profile into analysis prompt
- `apps/contractor/src/lib/ai/advocacy-prompt.ts` — inject carrier profile into advocacy prompt

### Lookup Functions
- `getCarrierProfile(name: string)` — fuzzy match with aliases
- `getCarrierCodeObjections(carrierName: string)` — all code objections for a carrier
- `buildCarrierContextForPrompt(carrierName: string)` — formatted string for AI injection

### No Changes
- No DB changes
- No UI changes
- No new API routes

## Consumers

The carrier data feeds into:
1. **AI Analysis Pipeline** (`analyze.ts`) — carrier-aware justification emphasis
2. **Advocacy Prompt Builder** (`advocacy-prompt.ts`) — carrier-specific tactics/coaching
3. **Rebuttal Letter Generator** (`rebuttal/ai/route.ts`) — carrier-aware rebuttal language
4. **Confidence Scorer** (future) — carrier-adjusted confidence when outcome data exists
5. **Chatbot Co-Pilot** (`chat-prompt.ts`) — carrier context in conversations

## Out of Scope

- Real outcome data tracking (Option 4 — future)
- Customer-facing carrier intelligence dashboard
- Adjuster-level profiling (beyond carrier-level)
- Carrier submission workflow automation
- Regional (county-level) carrier behavior variations
