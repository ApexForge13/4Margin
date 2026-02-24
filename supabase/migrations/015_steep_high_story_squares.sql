-- ============================================================
-- Migration 015: Add steep squares and high story squares
-- ============================================================

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS steep_squares numeric(6,2),
  ADD COLUMN IF NOT EXISTS high_story_squares numeric(6,2);

COMMENT ON COLUMN claims.steep_squares IS 'Square footage at steep pitch (7/12 or higher)';
COMMENT ON COLUMN claims.high_story_squares IS 'Square footage on stories above the first floor';
