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
  CARRIER_PROFILES,
  CARRIER_CODE_OBJECTIONS,
  getCarrierProfile,
  getCarrierCodeObjections,
  buildCarrierContextForPrompt,
  type CoverageSection,
  type DepreciationMethod,
  type DepreciationInfo,
  type LandmineRule,
  type FavorableProvision,
  type BaseFormExclusion,
  type CarrierEndorsementForm,
  type CarrierProfile,
  type CarrierCodeObjection,
} from "@4margin/policy-engine";
