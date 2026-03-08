"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  CoverageSection,
  DepreciationMethod,
  DepreciationInfo,
  LandmineRule,
  FavorableProvision,
  BaseFormExclusion,
  CarrierEndorsementForm,
} from "@4margin/policy-engine";

interface PolicyTabProps {
  coverageSections: CoverageSection[];
  depreciationMethods: Record<DepreciationMethod, DepreciationInfo>;
  landmineRules: LandmineRule[];
  favorableProvisions: FavorableProvision[];
  claimTypePolicySections: Record<string, string[]>;
  baseFormExclusions: BaseFormExclusion[];
  carrierEndorsementForms: CarrierEndorsementForm[];
}

type SectionKey =
  | "coverage"
  | "depreciation"
  | "landmines"
  | "favorable"
  | "claimTypes"
  | "exclusions"
  | "endorsements";

const SECTION_LABELS: Record<SectionKey, string> = {
  coverage: "Coverage Sections",
  depreciation: "Depreciation Methods",
  landmines: "Landmine Rules",
  favorable: "Favorable Provisions",
  claimTypes: "Claim Type Policy Sections",
  exclusions: "Base Form Exclusions",
  endorsements: "Carrier Endorsement Forms",
};

const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  coverage: "Standard homeowner policy coverage sections and their relevance to roofing claims.",
  depreciation: "How carriers calculate depreciation on roof damage claims.",
  landmines: "Policy provisions that can hurt the homeowner if not caught early.",
  favorable: "Provisions commonly overlooked that benefit the homeowner.",
  claimTypes: "Which policy sections are most relevant for each type of claim.",
  exclusions: "Standard exclusions present in every policy of a given form type.",
  endorsements: "Known carrier endorsement form numbers and their effects.",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const RELEVANCE_COLORS: Record<string, string> = {
  primary: "bg-[#00BFFF]/10 text-[#00BFFF]",
  secondary: "bg-gray-100 text-[#344767]/60",
  reference: "bg-gray-50 text-[#344767]/40",
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-gray-50 text-[#344767]/40",
};

export function PolicyTab({
  coverageSections,
  depreciationMethods,
  landmineRules,
  favorableProvisions,
  claimTypePolicySections,
  baseFormExclusions,
  carrierEndorsementForms,
}: PolicyTabProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("coverage");

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left panel — Section nav */}
      <div
        className="w-64 shrink-0 rounded-2xl bg-white border border-gray-100 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
      >
        <div className="p-4 border-b border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
            Knowledge Categories
          </p>
        </div>
        <div className="flex-1">
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full text-left px-4 py-3 transition-all duration-100 border-l-[3px] ${
                activeSection === key
                  ? "border-l-[#00BFFF] bg-[#00BFFF]/[0.04]"
                  : "border-l-transparent hover:bg-gray-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  activeSection === key
                    ? "text-[#344767]"
                    : "text-[#344767]/70"
                }`}
              >
                {SECTION_LABELS[key]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Section header */}
        <div
          className="rounded-2xl bg-white border border-gray-100 p-6"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <h3 className="text-lg font-bold text-[#344767]">
            {SECTION_LABELS[activeSection]}
          </h3>
          <p className="text-sm text-[#344767]/50 mt-1">
            {SECTION_DESCRIPTIONS[activeSection]}
          </p>
        </div>

        {/* Dynamic content by section */}
        {activeSection === "coverage" && (
          <CoverageSectionsView sections={coverageSections} />
        )}
        {activeSection === "depreciation" && (
          <DepreciationMethodsView methods={depreciationMethods} />
        )}
        {activeSection === "landmines" && (
          <LandmineRulesView rules={landmineRules} />
        )}
        {activeSection === "favorable" && (
          <FavorableProvisionsView provisions={favorableProvisions} />
        )}
        {activeSection === "claimTypes" && (
          <ClaimTypeSectionsView sections={claimTypePolicySections} />
        )}
        {activeSection === "exclusions" && (
          <BaseFormExclusionsView exclusions={baseFormExclusions} />
        )}
        {activeSection === "endorsements" && (
          <CarrierEndorsementsView endorsements={carrierEndorsementForms} />
        )}
      </div>
    </div>
  );
}

/* ── Sub-views ─────────────────────────────────────────────────────────────── */

function CoverageSectionsView({ sections }: { sections: CoverageSection[] }) {
  return (
    <div className="space-y-3">
      {sections.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl bg-white border border-gray-100 p-5"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-bold text-[#344767]">{s.label}</h4>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                RELEVANCE_COLORS[s.claimRelevance]
              }`}
            >
              {s.claimRelevance}
            </span>
          </div>
          <p className="text-sm text-[#344767]/70 mb-3">{s.description}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-medium text-[#344767]/40 mr-1 self-center">
              Search terms:
            </span>
            {s.searchTerms.map((t) => (
              <span
                key={t}
                className="text-[10px] bg-gray-100 text-[#344767]/60 px-1.5 py-0.5 rounded font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DepreciationMethodsView({
  methods,
}: {
  methods: Record<DepreciationMethod, DepreciationInfo>;
}) {
  return (
    <div className="space-y-3">
      {Object.values(methods).map((m) => (
        <div
          key={m.method}
          className="rounded-2xl bg-white border border-gray-100 p-5"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-[#00BFFF]/10 text-[#00BFFF] border-0 text-xs font-mono">
              {m.method}
            </Badge>
            <h4 className="text-sm font-bold text-[#344767]">{m.label}</h4>
          </div>
          <p className="text-sm text-[#344767]/70 mb-2">{m.description}</p>
          <div className="rounded-lg bg-[#f8f9fa] p-3">
            <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
              Impact
            </p>
            <p className="text-sm text-[#344767]/80">{m.impact}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LandmineRulesView({ rules }: { rules: LandmineRule[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {rules.map((rule) => {
        const isExpanded = expandedId === rule.id;
        return (
          <div
            key={rule.id}
            className="rounded-2xl bg-white border border-gray-100 overflow-hidden cursor-pointer"
            style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
            onClick={() => setExpandedId(isExpanded ? null : rule.id)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      SEVERITY_COLORS[rule.severity]
                    }`}
                  >
                    {rule.severity}
                  </span>
                  <h4 className="text-sm font-bold text-[#344767]">{rule.name}</h4>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#344767]/50 font-medium capitalize">
                  {rule.category}
                </span>
              </div>
              <p className="text-sm text-[#344767]/70">{rule.description}</p>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-5 bg-[#f8f9fa] space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                    Impact
                  </p>
                  <p className="text-sm text-[#344767]/80">{rule.impact}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                    Action Item
                  </p>
                  <p className="text-sm text-emerald-800/80">{rule.actionItem}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-2">
                    Typical Policy Language
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.typicalLanguage.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-white border border-gray-200 text-[#344767]/60 px-1.5 py-0.5 rounded font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                    Affected Claim Types
                  </p>
                  <div className="flex gap-1.5">
                    {rule.affectedClaimTypes.map((ct) => (
                      <span
                        key={ct}
                        className="text-[10px] font-medium bg-[#00BFFF]/10 text-[#00BFFF] px-2 py-0.5 rounded-full capitalize"
                      >
                        {ct.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FavorableProvisionsView({
  provisions,
}: {
  provisions: FavorableProvision[];
}) {
  return (
    <div className="space-y-3">
      {provisions.map((p) => (
        <div
          key={p.id}
          className="rounded-2xl bg-white border border-gray-100 p-5"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <h4 className="text-sm font-bold text-[#344767] mb-2">{p.name}</h4>
          <p className="text-sm text-[#344767]/70 mb-3">{p.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
              <p className="text-[11px] font-semibold uppercase text-emerald-700 mb-1">
                Impact
              </p>
              <p className="text-sm text-emerald-900/80">{p.impact}</p>
            </div>
            <div className="rounded-lg bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                Supplement Relevance
              </p>
              <p className="text-sm text-[#344767]/70">{p.supplementRelevance}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-medium text-[#344767]/40 mr-1 self-center">
              Search terms:
            </span>
            {p.searchTerms.map((t) => (
              <span
                key={t}
                className="text-[10px] bg-gray-100 text-[#344767]/60 px-1.5 py-0.5 rounded font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaimTypeSectionsView({
  sections,
}: {
  sections: Record<string, string[]>;
}) {
  return (
    <div className="space-y-3">
      {Object.entries(sections).map(([claimType, sectionIds]) => (
        <div
          key={claimType}
          className="rounded-2xl bg-white border border-gray-100 p-5"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <h4 className="text-sm font-bold text-[#344767] capitalize mb-3">
            {claimType.replace(/_/g, " ")} Damage
          </h4>
          <div className="flex flex-wrap gap-2">
            {sectionIds.map((id) => (
              <span
                key={id}
                className="text-xs bg-[#00BFFF]/10 text-[#00BFFF] font-medium px-2.5 py-1 rounded-lg"
              >
                {id.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BaseFormExclusionsView({
  exclusions,
}: {
  exclusions: BaseFormExclusion[];
}) {
  // Group by form type
  const grouped = exclusions.reduce<Record<string, BaseFormExclusion[]>>((acc, e) => {
    if (!acc[e.formType]) acc[e.formType] = [];
    acc[e.formType].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([formType, items]) => (
        <div key={formType}>
          <h4 className="text-sm font-bold text-[#344767] mb-3">
            {formType} — Standard Exclusions
          </h4>
          <div className="space-y-2">
            {items.map((e, i) => (
              <div
                key={`${formType}-${i}`}
                className="rounded-xl bg-white border border-gray-100 p-4"
                style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-start justify-between mb-1">
                  <h5 className="text-sm font-semibold text-[#344767]">{e.name}</h5>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                      RELEVANCE_COLORS[e.claimRelevance]
                    }`}
                  >
                    {e.claimRelevance} relevance
                  </span>
                </div>
                <p className="text-sm text-[#344767]/70">{e.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CarrierEndorsementsView({
  endorsements,
}: {
  endorsements: CarrierEndorsementForm[];
}) {
  // Group by carrier
  const grouped = endorsements.reduce<Record<string, CarrierEndorsementForm[]>>(
    (acc, e) => {
      if (!acc[e.carrier]) acc[e.carrier] = [];
      acc[e.carrier].push(e);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([carrier, forms]) => (
        <div key={carrier}>
          <h4 className="text-sm font-bold text-[#344767] mb-3">{carrier}</h4>
          <div
            className="rounded-2xl bg-white border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Form #
                  </th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Name
                  </th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Severity
                  </th>
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Effect
                  </th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f, idx) => (
                  <tr
                    key={f.formNumber}
                    className={idx % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]/50"}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-medium text-[#344767]">
                      {f.formNumber}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#344767]/80">
                      {f.name}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          SEVERITY_COLORS[f.severity]
                        }`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#344767]/70 text-xs max-w-sm">
                      {f.effect}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
