/**
 * Re-export from shared @4margin/policy-engine package.
 * All policy knowledge data now lives in packages/policy-engine.
 */
export {
  COVERAGE_SECTIONS,
  DEPRECIATION_METHODS,
  LANDMINE_RULES,
  FAVORABLE_PROVISIONS,
  CLAIM_TYPE_POLICY_SECTIONS,
  BASE_FORM_EXCLUSIONS,
  CARRIER_ENDORSEMENT_FORMS,
  getLandminesForClaimType,
  getClaimTypeFocusPrompt,
  type CoverageSection,
  type DepreciationMethod,
  type DepreciationInfo,
  type LandmineRule,
  type FavorableProvision,
  type BaseFormExclusion,
  type CarrierEndorsementForm,
} from "@4margin/policy-engine";
