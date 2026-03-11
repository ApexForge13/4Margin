# Knowledge Base Verification — Standard Operating Procedure

> **Purpose:** Verify every piece of static data in the 4Margin knowledge base against authoritative sources before launch. Two-person team, shared Google Sheet tracker.

**Last Updated:** 2026-03-10

---

## How This Works

The 4Margin contractor app includes ~1,376 static data items across 6 knowledge modules: building codes, county jurisdictions, manufacturer requirements, policy knowledge, carrier profiles, and a justification matrix. This data powers AI-generated insurance supplements — it must be correct.

**Your job:** Go through the Google Sheet tab-by-tab, verify each row against the authoritative source listed, and record your findings.

---

## Google Sheet Overview

**Sheet name:** `4Margin KB Verification Tracker`

**12 tabs** (one per data category), pre-populated from the codebase via `scripts/verify/populate-sheet.ts`.

### Standard Columns (every tab)

| Column | What to do |
|--------|------------|
| **Item ID** | Unique identifier — don't edit |
| **Current values** | What our codebase says — don't edit |
| **Source to Check** | Where to verify (URL, document, page #) |
| **Status** | Set one: `Verified` / `Incorrect` / `Partial` / `No Source` / `Pending` |
| **Correct Value** | If Incorrect — write what it SHOULD be |
| **Notes** | Anything worth flagging (ambiguous, outdated, edge case) |
| **Verified By** | Your name |
| **Date Verified** | Today's date |

### Status Values

| Status | When to use |
|--------|-------------|
| **Verified** | You checked the source and our data matches |
| **Incorrect** | Our data is wrong — fill in "Correct Value" column |
| **Partial** | Mostly right but needs minor correction or clarification |
| **No Source** | You could not find an authoritative source to verify against |
| **Pending** | Not yet checked (starting state for all rows) |

---

## Work Split

### Person A (technical — needs codebase context)
- Tab 1: IRC Codes (25 rows) — 12h
- Tab 2: State Adoption (75 rows) — 8h
- Tab 7: Manufacturer Requirements (48 rows) — 14h
- Tab 12: Justification Matrix (6 rows) — 2h

### Person B (industry knowledge — ex-adjuster / insurance pro)
- Tab 3: County Climate Zones (43 rows) — 3h
- Tab 4: County Wind Speeds (43 rows) — 3h
- Tab 5: County Permits / AHJ (43 rows) — 15h
- Tab 8: Endorsement Forms (47 rows) — 12h
- Tab 9: Carrier Profiles (13 rows) — 6h
- Tab 10: Carrier Code Objections (25 rows) — 4h
- Tab 11: Policy Knowledge (39 rows) — 4h

### Shared (script-assisted)
- Tab 6: ZIP Mappings (969 rows) — 8h (mostly automated, split edge-case review)

---

## Tab-by-Tab Verification Instructions

---

### Tab 1: IRC Codes (25 rows)
**Owner:** Person A
**Time estimate:** 12h
**Source:** ICC Digital Codes — [codes.iccsafe.org](https://codes.iccsafe.org) (free read access)

**For each row:**
1. Open ICC Digital Codes and search for the **Section** number (e.g., R905.2.1)
2. Verify the section exists in the cited IRC edition (2018 or 2021)
3. Verify our **Title** matches the official section title
4. Verify our **Requirement Summary** accurately describes what the code requires
5. Verify our **Justification Text** is a reasonable paraphrase (not misleading)
6. Check our **Xactimate Codes** mapping — does this code section logically relate to those line items?

**Common gotchas:**
- Some sections were renumbered between IRC 2018 and 2021 editions
- Sub-section numbering can shift (R905.2.8.2 in 2018 might be R905.2.8.3 in 2021)
- Our "requirement" is a summary, not a verbatim quote — it should capture the intent accurately

**Mark Incorrect if:** Section doesn't exist, title is wrong, requirement misrepresents the code

---

### Tab 2: State Adoption (75 rows = 25 codes x 3 states)
**Owner:** Person A
**Time estimate:** 8h
**Sources:**
- MD: [Maryland DHCD Building Codes](https://dsd.maryland.gov/Pages/BuildingCodes.aspx)
- PA: [PA Dept of Labor & Industry UCC](https://www.dli.pa.gov/ucc)
- DE: [Delaware State Housing Authority](https://dsha.delaware.gov/building-codes/)

**For each row:**
1. Confirm the state has adopted the **IRC Edition** we cite (2018 IRC for MD/PA, 2021 IRC for DE)
2. If **Has Amendment** is true, verify an amendment exists for this section in that state
3. Verify the **Amendment Note** text matches the actual amendment
4. Verify the **Source Ref** citation is accurate (statute or regulation number)

**Common gotchas:**
- PA uses "Uniform Construction Code" (UCC) which adopts IRC with amendments
- MD uses COMAR (Code of Maryland Regulations) references
- DE adopted 2021 IRC more recently — double-check effective dates
- Some amendments are at the state level, others are county-level (county overrides go in Tab 5)

---

### Tab 3: County Climate Zones (43 rows)
**Owner:** Person B
**Time estimate:** 3h
**Source:** IECC Figure R301.1 (Climate Zone Map) — available at [ICC Digital Codes](https://codes.iccsafe.org) or search "IECC climate zone map by county"

**For each row:**
1. Look up the county on the IECC climate zone map
2. Verify our **Climate Zone** (4A or 5A) matches the map
3. Verify our **Ice Barrier Requirement** is appropriate for the climate zone:
   - Zone 4A → typically "eaves_only"
   - Zone 5A → typically "eaves_valleys_penetrations" or "eaves_valleys_penetrations_extended"

**Common gotchas:**
- The 4A/5A boundary runs through central PA — counties near the line need careful checking
- Western MD (Allegany, Garrett) should be 5A
- All of DE should be 4A
- Coastal MD (Eastern Shore) should be 4A
- If any county shows "6A" that's likely wrong for our coverage area

---

### Tab 4: County Wind Speeds (43 rows)
**Owner:** Person B
**Time estimate:** 3h
**Source:** ASCE 7-16 Figure 26.5-1B (Basic Wind Speed Map) — search "ASCE 7-16 wind speed map" or use the ATC Hazards by Location tool at [atcouncil.org](https://hazards.atcouncil.org/)

**For each row:**
1. Look up the county on the ASCE 7-16 wind speed map
2. Verify our **Design Wind Speed** is in the right range
3. Verify **High Wind Zone** is `true` if and only if wind speed >= 120 mph

**Common gotchas:**
- Wind speeds can vary within a county — use the county seat or geographic center
- Eastern Shore MD and coastal DE have higher wind speeds (potential high wind zone)
- Most inland MD/PA counties should be 105-115 mph range
- The ATC Hazards tool gives precise values by address — use it for borderline cases

---

### Tab 5: County Permits / AHJ Data (43 rows)
**Owner:** Person B
**Time estimate:** 15h (most time-intensive tab)
**Source:** Individual county AHJ (Authority Having Jurisdiction) websites

**For each row:**
1. Visit the **AHJ URL** (if one is listed) — is the link live and correct?
2. Verify **AHJ Name** matches the actual department name on their website
3. Call or verify **AHJ Phone** is current (if listed)
4. Verify **Permit Required** is correct (almost all counties require roofing permits)
5. Verify **Fee Range** is in the right ballpark — find the county's fee schedule
6. Check **FIPS Code** format: should be exactly 5 digits, starting with `24` (MD), `42` (PA), or `10` (DE)
7. Review **Local Amendments** — are there any county-specific code amendments listed on their site?

**Common gotchas:**
- County websites get reorganized frequently — the URL may have changed
- Some counties call it "Department of Permits," others "Office of Planning & Zoning," etc.
- Fee schedules change yearly — our "typical fee range" should be approximate, not exact
- Baltimore City (MD) is a separate jurisdiction from Baltimore County
- Some smaller PA counties share services or point to a regional office

**Tips to save time:**
- Run `verify-urls.ts` first — it checks all AHJ URLs automatically
- Start with the FIPS code check (`verify-fips.ts` does this automatically)
- Use Google to search "[county name] building permit roofing" if the AHJ URL is broken

---

### Tab 6: ZIP Mappings (969 rows)
**Owner:** Shared (script-assisted)
**Time estimate:** 8h total (mostly automated)

**Process:**
1. Run `npx tsx scripts/verify/verify-zips.ts` — this downloads Census Bureau data and cross-references every ZIP
2. Import the `zip-report.csv` output into the Google Sheet
3. Review the results:
   - **MATCH** → auto-mark as Verified
   - **MATCH (MULTI-COUNTY ZIP)** → verify we picked the right primary county
   - **MISMATCH** → manually check using [USPS ZIP lookup](https://tools.usps.com/zip-code-lookup.htm)
   - **ZIP NOT IN CENSUS** → likely a PO Box or special-use ZIP, verify manually

**Common gotchas:**
- Some ZIPs span county lines — Census data shows ALL counties a ZIP touches
- Our mapping picks ONE county per ZIP (the primary one) — that's intentional
- PO Box ZIPs and military ZIPs may not appear in Census ZCTA data
- MD ZIPs should start with `20` or `21`; PA with `15-19`; DE with `197-199`

---

### Tab 7: Manufacturer Requirements (48 rows)
**Owner:** Person A
**Time estimate:** 14h
**Source:** Manufacturer installation guide PDFs (downloadable from manufacturer websites)

| Manufacturer | Installation Guide Location |
|-------------|---------------------------|
| GAF | [gaf.com/document-library](https://www.gaf.com/en-us/document-library) |
| CertainTeed | [certainteed.com/resources](https://www.certainteed.com/residential-roofing/resources/) |
| Owens Corning | [owenscorning.com/roofing](https://www.owenscorning.com/en-us/roofing/documents-and-downloads) |
| IKO | [iko.com/na/en](https://www.iko.com/na/en/roofing/pro/installation-guides/) |
| Atlas | [atlasroofing.com](https://www.atlasroofing.com/installation-resources) |
| TAMKO | [tamko.com](https://www.tamko.com/resources/installation/) |

**For each row:**
1. Download the current installation guide from the **Source URL**
2. Find the section referenced in **Source Section**
3. Verify our **Requirement** text matches what the guide actually says
4. Verify **Mandatory For Warranty** — does the guide explicitly state this is required for warranty?
5. Verify **Xactimate Code** makes sense for this requirement (e.g., starter strip → "RFG STRP")
6. Verify **Xactimate Unit** is correct (LF, SQ, EA, SF, or RL)

**Common gotchas:**
- Manufacturers update installation guides periodically — our sourceUrl may point to an older version
- Check `verify-urls.ts` output first to identify broken source URLs
- Some requirements are warranty-mandatory; others are "recommended" — the distinction matters
- Xactimate code mapping is our interpretation, not the manufacturer's — verify it's logical

---

### Tab 8: Endorsement Forms (47 rows)
**Owner:** Person B
**Time estimate:** 12h
**Source:** Carrier endorsement document libraries (some public, some require agent access)

**For each row:**
1. Verify the **Form Number** exists for this carrier (search: "[carrier] [form number] endorsement")
2. Verify our **Name** matches the actual form title
3. Verify our **Effect** accurately describes what the endorsement does
4. Verify **Severity** classification makes sense (critical = could deny entire claim, warning = reduces payout, info = procedural)
5. Verify **Affects Fields** lists the right coverage areas

**Common gotchas:**
- Carrier form numbers vary by state — we may have the national form number
- Some carriers (Amica, Chubb, Encompass) have less publicly available documentation
- Mark as "No Source" if you genuinely cannot find the form — that's OK
- Endorsement effects can be complex — focus on whether our summary captures the key impact

---

### Tab 9: Carrier Profiles (13 rows)
**Owner:** Person B
**Time estimate:** 6h
**Source:** Industry knowledge, carrier websites, adjuster forums, public claims data

**For each row:**
1. Does the **Aggressiveness** rating match industry reputation? (low / moderate / aggressive)
2. Spot-check **Depreciation Approach** — is this how this carrier actually handles depreciation?
3. Spot-check **Cosmetic Damage Stance** — accurate for this carrier?
4. Do the Strengths/Weaknesses counts seem reasonable?

**Important:** This data is inherently subjective. Use these judgment calls:
- **"Verified"** = Industry consensus supports our rating
- **"Partial"** = Mostly right but a detail is off
- **"Incorrect"** = Our rating is clearly wrong based on your experience
- Add a **Note** explaining your reasoning for any non-obvious calls

---

### Tab 10: Carrier Code Objections (25 rows)
**Owner:** Person B
**Time estimate:** 4h
**Source:** Industry experience, denial letter databases, adjuster forums

**For each row:**
1. Verify the **Carrier** actually makes this type of objection about the cited **IRC Section**
2. Verify the **Typical Objection** language is realistic — would a real adjuster say this?
3. Verify the **Effective Rebuttal** is a sound counter-argument
4. Does the **Objection Rate** (high/medium/low) seem accurate?

---

### Tab 11: Policy Knowledge (39 rows)
**Owner:** Person B
**Time estimate:** 4h
**Sources:** ISO HO-3, HO-5, HO-6 standard policy forms

This tab has 4 sub-categories:
- **Coverage Sections** (6 rows): Verify labels and descriptions match standard HO policy structure
- **Landmine Rules** (9 rows): Verify each "typical language" pattern matches real policy wording
- **Favorable Provisions** (4 rows): Verify search terms would find these in real policies
- **Base Form Exclusions** (20 rows): Verify against ISO standard forms (HO-3 = 12, HO-5 = 5, HO-6 = 3)

**Tip:** If you have access to ISO standard policy forms, compare directly. Otherwise, use sample policies from each form type.

---

### Tab 12: Justification Matrix (6 rows)
**Owner:** Person A
**Time estimate:** 2h
**Source:** Cross-reference all previously verified data

**For each row:**
1. Verify every **Source Ref** maps to a real manufacturer requirement (check Tab 7)
2. Verify **Code Requirement** text matches a verified IRC code (check Tab 1)
3. Verify **Line Item** and **Unit** match real Xactimate codes
4. Look for gaps: are there Xactimate codes that SHOULD be in the matrix but aren't?

---

## Automation Scripts

Run these BEFORE starting manual verification — they eliminate hours of work.

### verify-fips.ts (run first — 30 seconds)
```bash
npx tsx scripts/verify/verify-fips.ts
```
Downloads Census Bureau FIPS data and validates all 43 county FIPS codes. Output: `scripts/verify/output/fips-report.csv`

### verify-urls.ts (run second — 2-3 minutes)
```bash
npx tsx scripts/verify/verify-urls.ts
```
HTTP HEAD checks every URL in the knowledge base (AHJ websites, manufacturer doc URLs). Output: `scripts/verify/output/url-report.csv`

### verify-zips.ts (run third — 1-2 minutes)
```bash
npx tsx scripts/verify/verify-zips.ts
```
Cross-references all 969 ZIP codes against Census Bureau ZCTA data. Output: `scripts/verify/output/zip-report.csv`

### Using script results
Import the report CSVs as additional tabs in the Google Sheet. Use them to:
- Auto-mark FIPS codes as Verified (if MATCH)
- Flag broken AHJ URLs before checking Tab 5
- Auto-mark ZIP mappings as Verified (if MATCH), focus manual effort on mismatches

---

## Escalation Process

When you find an issue:

1. **Set Status to "Incorrect" or "Partial"** in the Google Sheet
2. **Fill in "Correct Value"** — what the data SHOULD be
3. **Add Notes** explaining why (link to source if possible)
4. A developer will review all Incorrect/Partial items and make code fixes
5. After fixes, re-run `populate-sheet.ts` and spot-check the corrected rows

**For ambiguous items:**
- If two sources disagree, note both in the Notes column
- If you're unsure, mark as "Partial" with a note explaining the uncertainty
- Don't mark something as "Verified" if you're not confident

---

## Completion Criteria

The verification is complete when:

1. Every row across all 12 tabs has a Status (zero "Pending" items)
2. All "Incorrect" items have a "Correct Value" filled in
3. A developer has made code fixes for all Incorrect items
4. Re-run of automated tests passes after corrections
5. Final spot-check of corrected items confirms fixes

**Target:** 100% of rows verified. No exceptions.
