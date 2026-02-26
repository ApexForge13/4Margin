-- ============================================================
-- Migration 005: EagleView measurement format columns
-- Adds linear-feet measurement columns, waste/suggested squares,
-- accessories, and damage_types array to claims table
-- ============================================================

-- New measurement columns (EagleView format — linear feet)
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS waste_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS suggested_squares numeric(6,2),
  ADD COLUMN IF NOT EXISTS ft_ridges numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_hips numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_valleys numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_rakes numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_eaves numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_drip_edge numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_parapet numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_flashing numeric(8,2),
  ADD COLUMN IF NOT EXISTS ft_step_flashing numeric(8,2),
  ADD COLUMN IF NOT EXISTS accessories text,
  ADD COLUMN IF NOT EXISTS damage_types text[];

-- Add a comment explaining the damage_types array values
COMMENT ON COLUMN claims.damage_types IS 'Multi-select damage types: wind, hail, wind_hail, fire, impact, age_wear';
COMMENT ON COLUMN claims.ft_drip_edge IS 'Total drip edge = eaves + rakes';
COMMENT ON COLUMN claims.suggested_squares IS 'Squares with waste applied (0, .33, .66 increments)';
