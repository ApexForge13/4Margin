-- ============================================================
-- Migration 013: Extended EagleView measurement columns
-- Adds pitch breakdown, feature counts, penetration data,
-- structure complexity, and total roof areas to claims table
-- ============================================================

-- Pitch breakdown and complexity
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS pitch_breakdown jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS structure_complexity text,
  ADD COLUMN IF NOT EXISTS total_roof_area numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_roof_area_less_penetrations numeric(10,2);

-- Feature counts (number of segments from EagleView)
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS num_eaves integer,
  ADD COLUMN IF NOT EXISTS num_rakes integer,
  ADD COLUMN IF NOT EXISTS num_flashing_lengths integer,
  ADD COLUMN IF NOT EXISTS num_step_flashing_lengths integer;

-- Penetration measurements
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS total_penetrations_area numeric(8,2),
  ADD COLUMN IF NOT EXISTS total_penetrations_perimeter numeric(8,2);

-- Comments
COMMENT ON COLUMN claims.pitch_breakdown IS 'JSONB array of {pitch, areaSqFt, percentOfRoof} from EagleView Areas per Pitch table';
COMMENT ON COLUMN claims.structure_complexity IS 'EagleView structure complexity: Simple, Normal, or Complex';
COMMENT ON COLUMN claims.total_roof_area IS 'Total roof area in sq ft (all pitches) from EagleView';
COMMENT ON COLUMN claims.total_roof_area_less_penetrations IS 'Total roof area minus penetrations in sq ft';
COMMENT ON COLUMN claims.num_eaves IS 'Count of eave segments from EagleView';
COMMENT ON COLUMN claims.num_rakes IS 'Count of rake segments from EagleView';
COMMENT ON COLUMN claims.num_flashing_lengths IS 'Count of flashing segments from EagleView';
COMMENT ON COLUMN claims.num_step_flashing_lengths IS 'Count of step flashing segments from EagleView';
COMMENT ON COLUMN claims.total_penetrations_area IS 'Total penetrations area in sq ft from EagleView';
COMMENT ON COLUMN claims.total_penetrations_perimeter IS 'Total penetrations perimeter in LF from EagleView';
