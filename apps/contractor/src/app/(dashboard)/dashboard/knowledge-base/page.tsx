import { createAdminClient } from "@/lib/supabase/admin";

// TS fallback imports (used when DB tables don't exist or are empty)
import { BUILDING_CODES } from "@/data/building-codes";
import {
  MD_COUNTIES,
  PA_COUNTIES,
  DE_COUNTIES,
} from "@/data/county-jurisdictions";
import { MANUFACTURERS } from "@/data/manufacturer-requirements";
import {
  COVERAGE_SECTIONS,
  DEPRECIATION_METHODS,
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  CLAIM_TYPE_POLICY_SECTIONS,
  BASE_FORM_EXCLUSIONS,
  CARRIER_ENDORSEMENT_FORMS,
} from "@/data/policy-knowledge";

import { KnowledgeBaseClient } from "./knowledge-base-client";

import type { KbCounty, KbBuildingCode } from "./types";
import type { CountyJurisdiction } from "@/data/county-jurisdictions";
import type { BuildingCode } from "@/data/building-codes";

/**
 * Convert TS CountyJurisdiction[] to KbCounty[] shape for the client component.
 * Used as a fallback when the Supabase tables are not populated yet.
 */
function countiesToKbShape(counties: CountyJurisdiction[]): KbCounty[] {
  return counties.map((c) => ({
    id: c.fipsCode, // Use FIPS as a stable ID for fallback
    county: c.county,
    state: c.state,
    climate_zone: c.climateZone,
    design_wind_speed: c.designWindSpeed,
    high_wind_zone: c.highWindZone,
    ice_barrier_requirement: c.iceBarrierRequirement,
    permit_required: c.permit.required,
    permit_fee_range: c.permit.typicalFeeRange,
    ahj_name: c.permit.ahjName,
    ahj_phone: c.permit.ahjPhone,
    ahj_url: c.permit.ahjUrl,
    permit_notes: c.permit.notes,
    local_amendments: c.localAmendments,
    fips_code: c.fipsCode,
  }));
}

/**
 * Convert TS BuildingCode[] to KbBuildingCode[] shape for the client component.
 * Used as a fallback when the Supabase tables are not populated yet.
 */
function codesToKbShape(codes: BuildingCode[]): KbBuildingCode[] {
  return codes.map((c) => ({
    id: c.id,
    section: c.section,
    title: c.title,
    requirement: c.requirement,
    justification_text: c.justificationText,
    category: c.category,
    xactimate_codes: c.xactimateCodes,
    carrier_objection_rate: c.carrierObjectionRate,
    typical_objection: c.typicalObjection,
    rebuttal: c.rebuttal,
    kb_code_jurisdictions: c.jurisdictions.map((j) => ({
      id: `${c.id}-${j.state}`, // Synthetic ID for fallback
      code_id: c.id,
      state: j.state,
      irc_edition: j.ircEdition,
      has_amendment: j.hasAmendment,
      amendment_note: j.amendmentNote,
      source_ref: j.sourceRef,
      source_urls: [],
    })),
  }));
}

export default async function KnowledgeBasePage() {
  let counties: KbCounty[] = [];
  let codes: KbBuildingCode[] = [];
  let isAdmin = false;
  let fromDb = false;

  try {
    const supabase = createAdminClient();

    // Try to fetch counties from DB
    const { data: dbCounties, error: countiesError } = await supabase
      .from("kb_counties")
      .select("*")
      .order("state")
      .order("county");

    // Try to fetch codes with jurisdictions from DB
    const { data: dbCodes, error: codesError } = await supabase
      .from("kb_building_codes")
      .select("*, kb_code_jurisdictions(*)")
      .order("section");

    if (
      !countiesError &&
      !codesError &&
      dbCounties &&
      dbCounties.length > 0 &&
      dbCodes &&
      dbCodes.length > 0
    ) {
      // Supabase data available — use it
      counties = dbCounties as KbCounty[];
      codes = dbCodes as KbBuildingCode[];
      fromDb = true;
      isAdmin = true; // Only show edit buttons when data is from DB
    }
  } catch {
    // Supabase fetch failed — fall through to TS fallback
  }

  // Fallback: use TypeScript static data
  if (!fromDb) {
    counties = [
      ...countiesToKbShape(MD_COUNTIES),
      ...countiesToKbShape(PA_COUNTIES),
      ...countiesToKbShape(DE_COUNTIES),
    ];
    codes = codesToKbShape(BUILDING_CODES);
  }

  return (
    <KnowledgeBaseClient
      counties={counties}
      buildingCodes={codes}
      manufacturers={MANUFACTURERS}
      coverageSections={COVERAGE_SECTIONS}
      depreciationMethods={DEPRECIATION_METHODS}
      landmineRules={LANDMINE_RULES}
      favorableProvisions={FAVORABLE_PROVISIONS}
      claimTypePolicySections={CLAIM_TYPE_POLICY_SECTIONS}
      baseFormExclusions={BASE_FORM_EXCLUSIONS}
      carrierEndorsementForms={CARRIER_ENDORSEMENT_FORMS}
      isAdmin={isAdmin}
    />
  );
}
