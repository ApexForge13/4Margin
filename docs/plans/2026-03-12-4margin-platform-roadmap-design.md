# 4Margin Platform Roadmap — Full Design Document

**Date:** 2026-03-12
**Author:** 4Margin + Claude
**Status:** Approved

---

## Executive Summary

4Margin evolves from a supplement generation tool into a modular contractor platform covering the full job lifecycle — retail and insurance. Each module operates independently as a standalone product AND integrates with every other module. Contractors adopt tools one at a time; the CRM assembles itself passively from their usage. After 50 jobs through the platform, they've naturally replaced their existing CRM without making a conscious decision to switch.

---

## Core Architecture Principles

1. **Every module works standalone AND together.** No module requires another to function. Using multiple compounds value.
2. **The CRM builds itself.** Every tool interaction auto-creates or enriches a Job record. No manual data entry.
3. **Trojan horse adoption.** Standalone tools are so good contractors come in for one. The system quietly builds their job database. After 50 jobs, they've migrated without deciding to.
4. **Insurance AND retail.** Platform captures both or the job database is incomplete.
5. **AI does the work.** 4Margin doesn't track work — it DOES work. Every document parsed, every photo analyzed, every communication contextual.
6. **Legal rails.** Carrier-facing: code authority + industry manufacturer standards + Xactimate + physical evidence. NEVER policy language. Policy logic is internal strategy only. Manufacturer references generic unless carrier introduced a specific brand first.

---

## Section 1: Foundation — Job Architecture

### Jobs, Not Claims

The universal unit is a **Job** — any piece of work at a property:
- Insurance claim (storm damage, supplement needed)
- Retail re-roof (homeowner paying cash)
- Hybrid (insurance covers part, homeowner pays rest)
- Repair (small job)
- Gutters/siding add-on

Every Job has: property address, homeowner contact, type. Everything else fills in over time.

### Auto-Creation (The Trojan Horse)

Jobs materialize from tool usage:
- Upload estimate to supplement engine -> Job from parsed address/homeowner
- Upload policy to decoder -> Job from insured name + property address
- Upload inspection photos -> Job from address or EXIF GPS
- Inbound email with claim data -> Job auto-matched or created

### Job Matching

1. Exact address match
2. Claim number match
3. Homeowner name + approximate address (fuzzy)
4. Manual override

### Data Model: Lean Core + JSONB Buckets

**Core typed columns:** id, company_id, created_by, assigned_to, type (insurance|retail|hybrid|repair), status, property_address/city/state/zip, homeowner_name/phone/email, source, archived_at, created_at, updated_at

**JSONB buckets:** insurance_data, measurements, financials, metadata — flexible, promoted to typed columns when query patterns demand it

### Pipeline Stages

**Insurance:**
Lead -> Inspected -> Claim Filed -> Adjuster Scheduled -> Estimate Received -> Supplement Sent -> Revised Estimate -> Approved -> Sold -> Materials Ordered -> Work Scheduled -> In Progress -> Install Complete -> Depreciation Collected -> Closed

**Retail:**
Lead -> Inspected -> Quoted -> Sold -> Materials Ordered -> Work Scheduled -> In Progress -> Install Complete -> Paid -> Closed

### Install Complete Triggers (URGENT)

System fires immediately on "Install Complete":
- Upload install photos NOW
- CoC needs signature TODAY
- Auto-draft depreciation recovery letter ready to send
- Morning-of reminder if install date was pre-logged

### Dashboard

Replaces supplement-centric view with Jobs pipeline. Two swimlanes. Job cards: homeowner + address, carrier/tier, dollar value, days in status, next action.

### Business Intelligence (Dual View)

Platform-wide stats vs contractor's own stats side by side. Carrier approval rates, response times, recovery amounts. Gap analysis surfaces coaching.

### Multi-User Roles

- Owner: sees everything, full edit
- Admin: sees everything, full edit
- Sales Rep: own jobs + shared pipeline (read-only on others)
- Production Manager: "Sold" forward only

---

## Section 2: AI Inspect — The On-Roof Sales Engine

### Flow: Roof to Front Door in Under 5 Minutes

On roof: photos upload real-time, Vision AI processes incrementally. Climbing down: tap Generate Report (seconds, not minutes). At front door: professional branded report.

### Per-Photo Analysis (Claude Vision)

- Component identification (ridge cap, field shingles, pipe boot, drip edge, gutter, soffit, etc.)
- Damage classification (mechanical, wind, hail, wear, no damage)
- Severity (functional vs cosmetic vs undamaged)
- Material identification
- Auto-caption

### Photo Organization

Grouped by component and damage type. Duplicates/blurry flagged. Best photo per component starred. Contractor overrides teach the system.

### Fork A: Retail — Instant Three-Tier Quote

Measurements + contractor's pricing config = Good/Better/Best proposal at the door. Same-day close.

### Fork B: Insurance — On-the-Spot Decode

Upload policy at the door. 60-second decode. Green/yellow/red light. Red pivots to retail.

### Outputs

1. Homeowner damage report (branded PDF, under 1 minute)
2. Organized photo set (labeled, grouped, captioned)
3. Xactimate line item mapping (insurance, photo evidence -> potential codes)
4. Before/after documentation (retail completion portfolio)

---

## Section 3: AI Decode — Policy Intelligence

### One Decode. Two Reports. Done.

Full analysis in ~60 seconds. Two reports simultaneously. Used for the life of the claim.

### Report 1: Contractor Report

- Coverage summary (RCV/ACV, deductible, dwelling limit)
- Go/No-Go signal
- Exclusions & landmines (plain language, strategic implications)
- Favorable provisions (how to leverage each)
- O&P indicators, depreciation details
- Carrier battle card (EDITABLE — contractor's personal notes persist across jobs with same carrier)
- Key dates & deadlines

### Report 2: Homeowner Report

- Coverage at a glance (plain English)
- What's covered (good news, simple terms)
- What's not covered (honest, soft language — exclusions included, framed helpfully so homeowner isn't blindsided later)
- Deductible explained, what happens next, disclaimer
- Contractor branding

### Carrier Intelligence

Profiles enrich over time. Contractor notes layer on top. System surfaces trends.

---

## Section 4: AI Supplement

### Legal Rails (Critical)

- Carrier-facing: code + industry standards + Xactimate + photos. NEVER policy language.
- Internal: policy logic drives item selection. Contractor sees WHY via strategy notes. Carrier never sees.
- Manufacturer: generic "industry standard" unless carrier introduced specific brand.

### Three-Way Comparison

Contractor documented -> Codes/standards require -> Adjuster paid for. Per-item gap analysis with photo references, code citations.

### Outputs

1. Supplement (Xactimate-formatted, three-pillar justification)
2. Cover letter (no policy language)
3. Evidence package (compiled PDF)
4. Internal strategy notes (policy logic, confidence, talking points — contractor only)

### Estimate Diff + Outcome Tracking

Revised estimate -> line-by-line comparison. Outcomes logged per item, per carrier, per jurisdiction. Feeds intelligence engine.

---

## Section 5: EagleView Integration

Upload & parse existing reports (mostly built). Measurements auto-populate Jobs. API ordering at scale (pass-through pricing -> bundled). Powers: retail quotes, waste calc, steep pitch calc, supplements, O&P.

---

## Section 6: Email Integration

Gmail/Outlook OAuth. Inbound auto-match to Jobs. Send from contractor's actual email within 4Margin. AI-drafted communications (supplement submission, follow-ups, depreciation requests, HO updates). Contractor always reviews before sending. Never auto-send. Communication timeline per Job.

---

## Section 7: Homeowner Portal

Opt-in per contractor AND per job. Branded to contractor. Secure link, no login. Status tracker, inspection report, policy decode (HO version), financial summary, messages (one-way). Homeowner NEVER sees: contractor decode, supplement details, margins, internal notes. Post-completion Google review prompt.

---

## Section 8: Retail Quoting Engine

One-time pricing config. Three-tier proposal (Good/Better/Best) generated instantly at the door. Contract template auto-filled, e-signature on tablet. Future: gutters, siding, windows on same architecture.

---

## Section 9: Dashboard & Job Pipeline

Command center. Two swimlanes. Action feed (prioritized daily items). Business intelligence (pipeline value, revenue, close rate, carrier performance dual view). Multi-user team support.

---

## Section 10: Weather Intelligence

Storm monitoring + alerts. Predictive weather (72/24/12h). Canvassing lists (storm path + property age from tax records now, satellite imagery at scale). Enhanced weather reports. Date of loss assistance.

---

## Section 11: Document Generation

### Three Audiences

Carrier-facing (code + standards, never policy language), homeowner-facing (clean, branded, trustworthy), internal (technical, strategic).

### Template System

Logo upload -> auto-extract brand colors -> apply to ALL PDFs. Default neutral theme with "Powered by 4Margin" if no logo.

### Global Document Library

Sidebar storage for universal docs (auth forms, contracts, W-9, COI, licenses, manufacturer certs). Attachable to Jobs when used.

---

## Section 12: Data, Intelligence & the Moat

### Data Flywheel

Every module generates data that makes every other module smarter. Proprietary dataset (photos + policies + outcomes + carrier responses) doesn't exist elsewhere. Compounds with every user. Creates switching costs and network effects.

### Participation Model

System always learns from usage. Aggregate statistics require participation. Opt-out loses: carrier dashboard, coaching, optimized recommendations, trend alerts, calibrated confidence. Core tools still full quality. ~99% won't opt out.

### Privacy

Individual data private always. Aggregate anonymized. Full export available. Carrier data never sold to insurance companies.

---

## Section 13: Phasing & Roadmap

### Phase 1A: Foundation (BUILD NOW)
- Job architecture (replace claims table, lean core + JSONB)
- AI Decode enhancement (two reports, editable battle card, Go/No-Go)
- EagleView integration (wire parser into Jobs)
- Document template system (logo + color extraction + branded PDFs)
- Global document library

### Phase 1B: Supplement Enhancement (BLOCKED on Xactimate data)
- Three-way comparison, evidence packages, estimate diff, strategy notes, outcome tracking

### Phase 2: AI Inspect + Retail Quoting
- Photo upload + real-time Vision AI + damage report
- Pricing engine + three-tier proposals
- Pipeline split (insurance + retail)
- Install completion triggers

### Phase 3: Email Integration
- Gmail/Outlook OAuth, inbound parsing, send from 4Margin
- AI-drafted communications, action feed, follow-up automation

### Phase 4: Homeowner Portal + Contracts
- Opt-in portal, status tracker, notifications
- E-signature contracts + change orders
- Review generation

### Phase 5: Weather Intelligence + Canvassing
- Storm monitoring + predictive weather
- Canvassing lists, enhanced reports, date of loss assistance

### Phase 6: Intelligence Engine + Scale
- Carrier intelligence dual view, confidence calibration
- Supplement optimization, multi-user teams, business reporting
- EagleView API ordering, satellite imagery (if scale justifies)

---

## Appendix: Legal Rails

1. Never quote or reference policy language in carrier-facing documents
2. Justify through: IRC codes, industry manufacturer standards, Xactimate documentation, physical evidence
3. Manufacturer references generic unless carrier introduced specific brand
4. Internal strategy notes can reference policy logic — contractor reads, carrier never sees
5. All homeowner-facing outputs: educational, not legal/insurance advice, disclaimers on everything
