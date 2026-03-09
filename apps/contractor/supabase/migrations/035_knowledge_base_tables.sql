-- Migration 035: Knowledge Base Tables
-- Replaces TypeScript static data with database-backed records
-- for admin editing of county jurisdictions and building codes.

-- ── County Jurisdictions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kb_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  state VARCHAR(2) NOT NULL CHECK (state IN ('MD', 'PA', 'DE', 'VA', 'DC')),
  climate_zone VARCHAR(4) NOT NULL,
  design_wind_speed INTEGER NOT NULL,
  high_wind_zone BOOLEAN NOT NULL DEFAULT false,
  ice_barrier_requirement VARCHAR(50) NOT NULL,
  permit_required BOOLEAN NOT NULL DEFAULT true,
  permit_fee_range TEXT,
  ahj_name TEXT,
  ahj_phone TEXT,
  ahj_url TEXT,
  permit_notes TEXT,
  local_amendments JSONB DEFAULT '[]',
  fips_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_counties_county_state
  ON kb_counties (county, state);

-- ── Building Codes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kb_building_codes (
  id TEXT PRIMARY KEY,
  section VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  requirement TEXT NOT NULL,
  justification_text TEXT NOT NULL,
  category VARCHAR(30) NOT NULL,
  xactimate_codes TEXT[] DEFAULT '{}',
  carrier_objection_rate VARCHAR(10) NOT NULL DEFAULT 'medium',
  typical_objection TEXT,
  rebuttal TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Code Jurisdictions (per-state applicability for each code) ──────────

CREATE TABLE IF NOT EXISTS kb_code_jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id TEXT NOT NULL REFERENCES kb_building_codes(id) ON DELETE CASCADE,
  state VARCHAR(2) NOT NULL,
  irc_edition VARCHAR(20) NOT NULL DEFAULT '2018 IRC',
  has_amendment BOOLEAN DEFAULT false,
  amendment_note TEXT,
  source_ref TEXT,
  source_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (code_id, state)
);

CREATE INDEX IF NOT EXISTS idx_kb_code_jurisdictions_state
  ON kb_code_jurisdictions (state);

-- ── ZIP-to-County Lookup ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kb_zip_to_county (
  zip VARCHAR(5) PRIMARY KEY,
  county TEXT NOT NULL,
  state VARCHAR(2) NOT NULL,
  county_id UUID REFERENCES kb_counties(id)
);

CREATE INDEX IF NOT EXISTS idx_kb_zip_to_county_state
  ON kb_zip_to_county (state);
