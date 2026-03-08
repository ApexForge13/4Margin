"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodesTab } from "./codes-tab";
import { ManufacturersTab } from "./manufacturers-tab";
import { PolicyTab } from "./policy-tab";

import type { BuildingCode } from "@/data/building-codes";
import type { CountyJurisdiction } from "@/data/county-jurisdictions";
import type { Manufacturer } from "@/data/manufacturer-requirements";
import type {
  CoverageSection,
  DepreciationMethod,
  DepreciationInfo,
  LandmineRule,
  FavorableProvision,
  BaseFormExclusion,
  CarrierEndorsementForm,
} from "@4margin/policy-engine";

interface KnowledgeBaseClientProps {
  buildingCodes: BuildingCode[];
  mdCounties: CountyJurisdiction[];
  paCounties: CountyJurisdiction[];
  deCounties: CountyJurisdiction[];
  manufacturers: Record<string, Manufacturer>;
  coverageSections: CoverageSection[];
  depreciationMethods: Record<DepreciationMethod, DepreciationInfo>;
  landmineRules: LandmineRule[];
  favorableProvisions: FavorableProvision[];
  claimTypePolicySections: Record<string, string[]>;
  baseFormExclusions: BaseFormExclusion[];
  carrierEndorsementForms: CarrierEndorsementForm[];
}

export function KnowledgeBaseClient({
  buildingCodes,
  mdCounties,
  paCounties,
  deCounties,
  manufacturers,
  coverageSections,
  depreciationMethods,
  landmineRules,
  favorableProvisions,
  claimTypePolicySections,
  baseFormExclusions,
  carrierEndorsementForms,
}: KnowledgeBaseClientProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="rounded-2xl bg-white border border-gray-100 p-6"
        style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
      >
        <h2 className="text-xl font-bold text-[#344767]">Knowledge Base</h2>
        <p className="text-sm text-[#344767]/50 mt-1">
          Jurisdiction-verified building codes, manufacturer requirements, and policy knowledge for supplement justification.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="codes">
        <TabsList className="bg-white border border-gray-100 rounded-xl p-1 h-auto w-auto"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <TabsTrigger
            value="codes"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#00BFFF] data-[state=active]:to-[#0090cc] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_6px_rgba(0,191,255,0.3)]"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Building Codes
          </TabsTrigger>
          <TabsTrigger
            value="manufacturers"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#00BFFF] data-[state=active]:to-[#0090cc] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_6px_rgba(0,191,255,0.3)]"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Manufacturer Guidelines
          </TabsTrigger>
          <TabsTrigger
            value="policy"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#00BFFF] data-[state=active]:to-[#0090cc] data-[state=active]:text-white data-[state=active]:shadow-[0_2px_6px_rgba(0,191,255,0.3)]"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Policy Knowledge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="mt-6">
          <CodesTab
            mdCounties={mdCounties}
            paCounties={paCounties}
            deCounties={deCounties}
            buildingCodes={buildingCodes}
          />
        </TabsContent>

        <TabsContent value="manufacturers" className="mt-6">
          <ManufacturersTab manufacturers={manufacturers} />
        </TabsContent>

        <TabsContent value="policy" className="mt-6">
          <PolicyTab
            coverageSections={coverageSections}
            depreciationMethods={depreciationMethods}
            landmineRules={landmineRules}
            favorableProvisions={favorableProvisions}
            claimTypePolicySections={claimTypePolicySections}
            baseFormExclusions={baseFormExclusions}
            carrierEndorsementForms={carrierEndorsementForms}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
