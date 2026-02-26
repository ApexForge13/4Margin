-- Add policy_analysis JSONB column to supplements table
-- Stores structured policy analysis from the Policy Decoder feature
-- Includes coverages, deductibles, exclusions, endorsements, landmines, favorable provisions

ALTER TABLE supplements
ADD COLUMN IF NOT EXISTS policy_analysis JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN supplements.policy_analysis IS 'Structured policy analysis JSON from AI policy decoder: coverages, deductibles, exclusions, endorsements, landmines, favorable provisions';
