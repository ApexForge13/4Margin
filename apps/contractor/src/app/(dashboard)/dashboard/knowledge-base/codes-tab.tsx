"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CountyEditDialog } from "@/components/knowledge-base/county-edit-dialog";
import { CodeEditDialog } from "@/components/knowledge-base/code-edit-dialog";
import type { KbCounty, KbBuildingCode } from "./types";

interface CodesTabProps {
  counties: KbCounty[];
  buildingCodes: KbBuildingCode[];
  isAdmin?: boolean;
}

const STATE_LABELS: Record<string, string> = {
  MD: "Maryland",
  PA: "Pennsylvania",
  DE: "Delaware",
};

const IRC_VERSION: Record<string, string> = {
  MD: "2018 IRC",
  PA: "2018 IRC",
  DE: "2021 IRC",
};

const ICE_BARRIER_LABELS: Record<string, string> = {
  eaves_only: "Eaves Only",
  eaves_valleys_penetrations: "Eaves, Valleys & Penetrations",
  eaves_valleys_penetrations_extended:
    "Extended (Eaves, Valleys, Penetrations)",
};

const OBJECTION_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export function CodesTab({
  counties,
  buildingCodes,
  isAdmin = false,
}: CodesTabProps) {
  const [selectedCounty, setSelectedCounty] = useState<KbCounty>(
    () =>
      counties.find(
        (c) => c.county === "Baltimore County" && c.state === "MD"
      ) ?? counties[0]
  );
  const [search, setSearch] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Edit dialog state
  const [editingCounty, setEditingCounty] = useState<KbCounty | null>(null);
  const [editingCode, setEditingCode] = useState<KbBuildingCode | null>(null);

  // Group counties by state
  const countiesByState = useMemo(() => {
    const groups: Record<string, KbCounty[]> = {};
    for (const c of counties) {
      if (!groups[c.state]) groups[c.state] = [];
      groups[c.state].push(c);
    }
    return groups;
  }, [counties]);

  // Filter each state group by search
  const filteredByState = useMemo(() => {
    const result: Record<string, KbCounty[]> = {};
    for (const [state, stateCounties] of Object.entries(countiesByState)) {
      const filtered = stateCounties.filter((c) =>
        c.county.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) result[state] = filtered;
    }
    return result;
  }, [countiesByState, search]);

  const stateOrder = ["MD", "PA", "DE"];
  const orderedStates = stateOrder.filter((s) => s in filteredByState);

  const applicableCodes = useMemo(
    () =>
      buildingCodes.filter((code) =>
        code.kb_code_jurisdictions.some(
          (j) => j.state === selectedCounty.state
        )
      ),
    [buildingCodes, selectedCounty.state]
  );

  const totalFiltered = Object.values(filteredByState).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left panel - County list */}
      <div
        className="w-72 shrink-0 rounded-2xl bg-white border border-gray-100 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
      >
        <div className="p-4 border-b border-gray-100">
          <Input
            placeholder="Search counties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm rounded-lg border-gray-200 focus:border-[#00BFFF] focus:ring-[#00BFFF]/20"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {orderedStates.map((state) => (
            <div key={state}>
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40 bg-gray-50/50">
                {STATE_LABELS[state] || state} (
                {filteredByState[state]?.length ?? 0})
              </div>
              {filteredByState[state]?.map((county) => (
                <button
                  key={county.id}
                  onClick={() => setSelectedCounty(county)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all duration-100 border-l-[3px] ${
                    selectedCounty.id === county.id
                      ? "border-l-[#00BFFF] bg-[#00BFFF]/[0.04]"
                      : "border-l-transparent hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        selectedCounty.id === county.id
                          ? "text-[#344767]"
                          : "text-[#344767]/80"
                      }`}
                    >
                      {county.county}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#344767]/40">
                        Zone {county.climate_zone}
                      </span>
                      {county.high_wind_zone && (
                        <span className="text-[10px] font-medium text-amber-600">
                          High Wind
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#344767]/50 font-medium shrink-0">
                    {IRC_VERSION[county.state] || "2018 IRC"}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {totalFiltered === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#344767]/40">
              No counties match your search.
            </div>
          )}
        </div>
      </div>

      {/* Right panel - County details + codes */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* County header card */}
        <div
          className="rounded-2xl bg-white border border-gray-100 p-6"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#344767]">
                  {selectedCounty.county}
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setEditingCounty(selectedCounty)}
                    className="p-1 rounded-md hover:bg-gray-100 text-[#344767]/40 hover:text-[#344767]/70 transition-colors"
                    title="Edit county"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-[#344767]/50">
                {STATE_LABELS[selectedCounty.state] || selectedCounty.state}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#00BFFF]/10 text-[#00BFFF] border-0 text-xs font-medium">
                {IRC_VERSION[selectedCounty.state] || "2018 IRC"}
              </Badge>
              <Badge className="bg-gray-100 text-[#344767]/60 border-0 text-xs font-medium">
                Zone {selectedCounty.climate_zone}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                Design Wind Speed
              </p>
              <p className="text-sm font-semibold text-[#344767]">
                {selectedCounty.design_wind_speed} mph
              </p>
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                High Wind Zone
              </p>
              <p className="text-sm font-semibold text-[#344767]">
                {selectedCounty.high_wind_zone ? (
                  <span className="text-amber-600">Yes (6-nail pattern)</span>
                ) : (
                  "No"
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                Ice Barrier Req.
              </p>
              <p className="text-sm font-semibold text-[#344767]">
                {ICE_BARRIER_LABELS[selectedCounty.ice_barrier_requirement] ??
                  selectedCounty.ice_barrier_requirement}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                Climate Zone
              </p>
              <p className="text-sm font-semibold text-[#344767]">
                {selectedCounty.climate_zone}
              </p>
            </div>
          </div>
        </div>

        {/* Permit info */}
        <div
          className="rounded-2xl bg-white border border-gray-100 p-6"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <h4 className="text-sm font-bold text-[#344767] mb-4">
            Permit Information
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                Permit Required
              </p>
              <p className="text-sm font-medium text-[#344767]">
                {selectedCounty.permit_required ? (
                  <span className="text-emerald-600">Yes</span>
                ) : (
                  <span className="text-red-600">No</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                Fee Range
              </p>
              <p className="text-sm font-medium text-[#344767]">
                {selectedCounty.permit_fee_range ?? "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                AHJ
              </p>
              <p className="text-sm font-medium text-[#344767]">
                {selectedCounty.ahj_name ?? "--"}
              </p>
            </div>
            {selectedCounty.ahj_phone && (
              <div>
                <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                  Phone
                </p>
                <p className="text-sm font-medium text-[#344767]">
                  {selectedCounty.ahj_phone}
                </p>
              </div>
            )}
            {selectedCounty.ahj_url && (
              <div>
                <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                  Website
                </p>
                <a
                  href={selectedCounty.ahj_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#00BFFF] hover:underline truncate block"
                >
                  {selectedCounty.ahj_url
                    .replace(/^https?:\/\//, "")
                    .replace(/\/$/, "")}
                </a>
              </div>
            )}
            {selectedCounty.permit_notes && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-[11px] font-medium text-[#344767]/40 mb-1">
                  Notes
                </p>
                <p className="text-sm text-[#344767]/70">
                  {selectedCounty.permit_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Local Amendments */}
        {selectedCounty.local_amendments &&
          selectedCounty.local_amendments.length > 0 && (
            <div
              className="rounded-2xl bg-amber-50 border border-amber-100 p-6"
              style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}
            >
              <h4 className="text-sm font-bold text-amber-800 mb-3">
                Local Amendments
              </h4>
              <ul className="space-y-2">
                {selectedCounty.local_amendments.map(
                  (amendment: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-sm text-amber-900/80">
                        {amendment}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

        {/* Applicable Building Codes */}
        <div
          className="rounded-2xl bg-white border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="p-6 pb-4">
            <h4 className="text-sm font-bold text-[#344767]">
              Applicable Building Codes
              <span className="ml-2 text-[#344767]/40 font-normal">
                ({applicableCodes.length} codes for {selectedCounty.state})
              </span>
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-100">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    IRC Section
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Title
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Xactimate Codes
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Objection Rate
                  </th>
                  {isAdmin && (
                    <th className="w-10 px-3 py-3" />
                  )}
                </tr>
              </thead>
              <tbody>
                {applicableCodes.map((code, idx) => {
                  const isExpanded = expandedCode === code.id;
                  const jurisdictionInfo =
                    code.kb_code_jurisdictions.find(
                      (j) => j.state === selectedCounty.state
                    );
                  return (
                    <CodesTableRow
                      key={code.id}
                      code={code}
                      idx={idx}
                      isExpanded={isExpanded}
                      jurisdictionInfo={jurisdictionInfo}
                      selectedCounty={selectedCounty}
                      isAdmin={isAdmin}
                      onToggle={() =>
                        setExpandedCode(isExpanded ? null : code.id)
                      }
                      onEdit={() => setEditingCode(code)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit dialogs */}
      {editingCounty && (
        <CountyEditDialog
          county={editingCounty}
          open={!!editingCounty}
          onOpenChange={(open) => {
            if (!open) setEditingCounty(null);
          }}
        />
      )}
      {editingCode && (
        <CodeEditDialog
          code={editingCode}
          selectedState={selectedCounty.state}
          open={!!editingCode}
          onOpenChange={(open) => {
            if (!open) setEditingCode(null);
          }}
        />
      )}
    </div>
  );
}

// ── Extracted row component for cleaner code ──────────────────────────────

function CodesTableRow({
  code,
  idx,
  isExpanded,
  jurisdictionInfo,
  selectedCounty,
  isAdmin,
  onToggle,
  onEdit,
}: {
  code: KbBuildingCode;
  idx: number;
  isExpanded: boolean;
  jurisdictionInfo:
    | KbBuildingCode["kb_code_jurisdictions"][number]
    | undefined;
  selectedCounty: KbCounty;
  isAdmin: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${
          idx % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]/50"
        } hover:bg-[#00BFFF]/[0.03]`}
      >
        <td className="px-6 py-3 font-mono text-xs font-medium text-[#344767]">
          {code.section}
        </td>
        <td className="px-6 py-3 text-[#344767]/80 font-medium">
          {code.title}
        </td>
        <td className="px-6 py-3">
          <span className="capitalize text-[#344767]/60 text-xs">
            {code.category}
          </span>
        </td>
        <td className="px-6 py-3">
          <div className="flex flex-wrap gap-1">
            {code.xactimate_codes.length > 0 ? (
              code.xactimate_codes.map((xc) => (
                <span
                  key={xc}
                  className="text-[10px] font-mono bg-[#00BFFF]/10 text-[#00BFFF] px-1.5 py-0.5 rounded"
                >
                  {xc}
                </span>
              ))
            ) : (
              <span className="text-[#344767]/30 text-xs">--</span>
            )}
          </div>
        </td>
        <td className="px-6 py-3">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              OBJECTION_COLORS[code.carrier_objection_rate] ?? ""
            }`}
          >
            {code.carrier_objection_rate}
          </span>
        </td>
        {isAdmin && (
          <td className="px-3 py-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded-md hover:bg-gray-100 text-[#344767]/40 hover:text-[#344767]/70 transition-colors"
              title="Edit code"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={isAdmin ? 6 : 5} className="px-6 py-4 bg-[#f8f9fa]">
            <div className="space-y-3 max-w-3xl">
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                  Requirement
                </p>
                <p className="text-sm text-[#344767]/80">
                  {code.requirement}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                  Justification Text
                </p>
                <p className="text-sm text-[#344767]/80">
                  {code.justification_text}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                    Typical Carrier Objection
                  </p>
                  <p className="text-sm text-red-700/80 italic">
                    {code.typical_objection}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                    Rebuttal
                  </p>
                  <p className="text-sm text-emerald-800/80">
                    {code.rebuttal}
                  </p>
                </div>
              </div>
              {jurisdictionInfo?.has_amendment &&
                jurisdictionInfo.amendment_note && (
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <p className="text-[11px] font-semibold uppercase text-amber-700 mb-1">
                      {selectedCounty.state} Amendment
                    </p>
                    <p className="text-sm text-amber-900/80">
                      {jurisdictionInfo.amendment_note}
                    </p>
                  </div>
                )}
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                  Source Reference
                </p>
                <p className="text-xs font-mono text-[#344767]/60 bg-white rounded px-2 py-1.5 border border-gray-100 inline-block">
                  {jurisdictionInfo?.source_ref}
                </p>

                {/* Source URLs */}
                {jurisdictionInfo?.source_urls &&
                  jurisdictionInfo.source_urls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {jurisdictionInfo.source_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-[#00BFFF] hover:underline"
                        >
                          <svg
                            className="h-3.5 w-3.5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            />
                          </svg>
                          {url
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, "")
                            .substring(0, 60)}
                          {url.replace(/^https?:\/\//, "").length > 60
                            ? "..."
                            : ""}
                        </a>
                      ))}
                    </div>
                  )}

                {/* Fallback: AHJ URL */}
                {(!jurisdictionInfo?.source_urls ||
                  jurisdictionInfo.source_urls.length === 0) &&
                  selectedCounty.ahj_url && (
                    <a
                      href={selectedCounty.ahj_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#00BFFF] hover:underline"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                        />
                      </svg>
                      View Code Authority Website (
                      {selectedCounty.ahj_name})
                    </a>
                  )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
