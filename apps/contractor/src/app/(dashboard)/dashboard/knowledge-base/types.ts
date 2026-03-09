// ── Knowledge Base Supabase Types ──────────────────────────────────────────
// These correspond to the kb_* tables created in migration 035.

export interface KbCounty {
  id: string;
  county: string;
  state: string;
  climate_zone: string;
  design_wind_speed: number;
  high_wind_zone: boolean;
  ice_barrier_requirement: string;
  permit_required: boolean;
  permit_fee_range: string | null;
  ahj_name: string | null;
  ahj_phone: string | null;
  ahj_url: string | null;
  permit_notes: string | null;
  local_amendments: string[];
  fips_code: string | null;
}

export interface KbCodeJurisdiction {
  id: string;
  code_id: string;
  state: string;
  irc_edition: string;
  has_amendment: boolean;
  amendment_note: string | null;
  source_ref: string | null;
  source_urls: string[];
}

export interface KbBuildingCode {
  id: string;
  section: string;
  title: string;
  requirement: string;
  justification_text: string;
  category: string;
  xactimate_codes: string[];
  carrier_objection_rate: string;
  typical_objection: string | null;
  rebuttal: string | null;
  kb_code_jurisdictions: KbCodeJurisdiction[];
}
