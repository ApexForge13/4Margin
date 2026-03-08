import { BUILDING_CODES } from "@/data/building-codes";
import { MD_COUNTIES, PA_COUNTIES, DE_COUNTIES } from "@/data/county-jurisdictions";
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

export default function KnowledgeBasePage() {
  return (
    <KnowledgeBaseClient
      buildingCodes={BUILDING_CODES}
      mdCounties={MD_COUNTIES}
      paCounties={PA_COUNTIES}
      deCounties={DE_COUNTIES}
      manufacturers={MANUFACTURERS}
      coverageSections={COVERAGE_SECTIONS}
      depreciationMethods={DEPRECIATION_METHODS}
      landmineRules={LANDMINE_RULES}
      favorableProvisions={FAVORABLE_PROVISIONS}
      claimTypePolicySections={CLAIM_TYPE_POLICY_SECTIONS}
      baseFormExclusions={BASE_FORM_EXCLUSIONS}
      carrierEndorsementForms={CARRIER_ENDORSEMENT_FORMS}
    />
  );
}
