"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CountyJurisdiction } from "@/data/county-jurisdictions";
import type { BuildingCode } from "@/data/building-codes";

interface CodesTabProps {
  mdCounties: CountyJurisdiction[];
  paCounties: CountyJurisdiction[];
  buildingCodes: BuildingCode[];
}

const ICE_BARRIER_LABELS: Record<string, string> = {
  eaves_only: "Eaves Only",
  eaves_valleys_penetrations: "Eaves, Valleys & Penetrations",
  eaves_valleys_penetrations_extended: "Extended (Eaves, Valleys, Penetrations)",
};

const OBJECTION_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export function CodesTab({ mdCounties, paCounties, buildingCodes }: CodesTabProps) {
  const allCounties = useMemo(() => [...mdCounties, ...paCounties], [mdCounties, paCounties]);
  const [selectedCounty, setSelectedCounty] = useState<CountyJurisdiction>(
    mdCounties.find((c) => c.county === "Baltimore County") ?? mdCounties[0]
  );
  const [search, setSearch] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const filteredMd = useMemo(
    () =>
      mdCounties.filter((c) =>
        c.county.toLowerCase().includes(search.toLowerCase())
      ),
    [mdCounties, search]
  );

  const filteredPa = useMemo(
    () =>
      paCounties.filter((c) =>
        c.county.toLowerCase().includes(search.toLowerCase())
      ),
    [paCounties, search]
  );

  const applicableCodes = useMemo(
    () =>
      buildingCodes.filter((code) =>
        code.jurisdictions.some((j) => j.state === selectedCounty.state)
      ),
    [buildingCodes, selectedCounty.state]
  );

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left panel — County list */}
      <div className="w-72 shrink-0 rounded-2xl bg-white border border-gray-100 overflow-hidden flex flex-col"
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
          {/* Maryland */}
          {filteredMd.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40 bg-gray-50/50">
                Maryland ({filteredMd.length})
              </div>
              {filteredMd.map((county) => (
                <button
                  key={county.fipsCode}
                  onClick={() => setSelectedCounty(county)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all duration-100 border-l-[3px] ${
                    selectedCounty.fipsCode === county.fipsCode
                      ? "border-l-[#00BFFF] bg-[#00BFFF]/[0.04]"
                      : "border-l-transparent hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${
                      selectedCounty.fipsCode === county.fipsCode
                        ? "text-[#344767]"
                        : "text-[#344767]/80"
                    }`}>
                      {county.county}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#344767]/40">Zone {county.climateZone}</span>
                      {county.highWindZone && (
                        <span className="text-[10px] font-medium text-amber-600">High Wind</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#344767]/50 font-medium shrink-0">
                    2018 IRC
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Pennsylvania */}
          {filteredPa.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40 bg-gray-50/50">
                Pennsylvania ({filteredPa.length})
              </div>
              {filteredPa.map((county) => (
                <button
                  key={county.fipsCode}
                  onClick={() => setSelectedCounty(county)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all duration-100 border-l-[3px] ${
                    selectedCounty.fipsCode === county.fipsCode
                      ? "border-l-[#00BFFF] bg-[#00BFFF]/[0.04]"
                      : "border-l-transparent hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${
                      selectedCounty.fipsCode === county.fipsCode
                        ? "text-[#344767]"
                        : "text-[#344767]/80"
                    }`}>
                      {county.county}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#344767]/40">Zone {county.climateZone}</span>
                      {county.highWindZone && (
                        <span className="text-[10px] font-medium text-amber-600">High Wind</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#344767]/50 font-medium shrink-0">
                    2018 IRC
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredMd.length === 0 && filteredPa.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#344767]/40">
              No counties match your search.
            </div>
          )}
        </div>
      </div>

      {/* Right panel — County details + codes */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* County header card */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#344767]">
                {selectedCounty.county}
              </h3>
              <p className="text-sm text-[#344767]/50">
                {selectedCounty.state === "MD" ? "Maryland" : "Pennsylvania"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#00BFFF]/10 text-[#00BFFF] border-0 text-xs font-medium">
                2018 IRC
              </Badge>
              <Badge className="bg-gray-100 text-[#344767]/60 border-0 text-xs font-medium">
                Zone {selectedCounty.climateZone}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Design Wind Speed</p>
              <p className="text-sm font-semibold text-[#344767]">{selectedCounty.designWindSpeed} mph</p>
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">High Wind Zone</p>
              <p className="text-sm font-semibold text-[#344767]">
                {selectedCounty.highWindZone ? (
                  <span className="text-amber-600">Yes (6-nail pattern)</span>
                ) : (
                  "No"
                )}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Ice Barrier Req.</p>
              <p className="text-sm font-semibold text-[#344767]">
                {ICE_BARRIER_LABELS[selectedCounty.iceBarrierRequirement]}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Climate Zone</p>
              <p className="text-sm font-semibold text-[#344767]">{selectedCounty.climateZone}</p>
            </div>
          </div>
        </div>

        {/* Permit info */}
        <div className="rounded-2xl bg-white border border-gray-100 p-6"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <h4 className="text-sm font-bold text-[#344767] mb-4">Permit Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Permit Required</p>
              <p className="text-sm font-medium text-[#344767]">
                {selectedCounty.permit.required ? (
                  <span className="text-emerald-600">Yes</span>
                ) : (
                  <span className="text-red-600">No</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Fee Range</p>
              <p className="text-sm font-medium text-[#344767]">{selectedCounty.permit.typicalFeeRange}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#344767]/40 mb-1">AHJ</p>
              <p className="text-sm font-medium text-[#344767]">{selectedCounty.permit.ahjName}</p>
            </div>
            {selectedCounty.permit.ahjPhone && (
              <div>
                <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Phone</p>
                <p className="text-sm font-medium text-[#344767]">{selectedCounty.permit.ahjPhone}</p>
              </div>
            )}
            {selectedCounty.permit.ahjUrl && (
              <div>
                <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Website</p>
                <a
                  href={selectedCounty.permit.ahjUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#00BFFF] hover:underline truncate block"
                >
                  {selectedCounty.permit.ahjUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
            {selectedCounty.permit.notes && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-[11px] font-medium text-[#344767]/40 mb-1">Notes</p>
                <p className="text-sm text-[#344767]/70">{selectedCounty.permit.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Local Amendments */}
        {selectedCounty.localAmendments.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-6"
            style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.02)" }}
          >
            <h4 className="text-sm font-bold text-amber-800 mb-3">Local Amendments</h4>
            <ul className="space-y-2">
              {selectedCounty.localAmendments.map((amendment, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm text-amber-900/80">{amendment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Applicable Building Codes */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden"
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
                </tr>
              </thead>
              <tbody>
                {applicableCodes.map((code, idx) => {
                  const isExpanded = expandedCode === code.id;
                  const jurisdictionInfo = code.jurisdictions.find(
                    (j) => j.state === selectedCounty.state
                  );
                  return (
                    <>
                      <tr
                        key={code.id}
                        onClick={() => setExpandedCode(isExpanded ? null : code.id)}
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
                          <span className="capitalize text-[#344767]/60 text-xs">{code.category}</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {code.xactimateCodes.length > 0
                              ? code.xactimateCodes.map((xc) => (
                                  <span
                                    key={xc}
                                    className="text-[10px] font-mono bg-[#00BFFF]/10 text-[#00BFFF] px-1.5 py-0.5 rounded"
                                  >
                                    {xc}
                                  </span>
                                ))
                              : <span className="text-[#344767]/30 text-xs">--</span>
                            }
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              OBJECTION_COLORS[code.carrierObjectionRate]
                            }`}
                          >
                            {code.carrierObjectionRate}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${code.id}-expanded`}>
                          <td colSpan={5} className="px-6 py-4 bg-[#f8f9fa]">
                            <div className="space-y-3 max-w-3xl">
                              <div>
                                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                  Requirement
                                </p>
                                <p className="text-sm text-[#344767]/80">{code.requirement}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                  Justification Text
                                </p>
                                <p className="text-sm text-[#344767]/80">{code.justificationText}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                    Typical Carrier Objection
                                  </p>
                                  <p className="text-sm text-red-700/80 italic">{code.typicalObjection}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                    Rebuttal
                                  </p>
                                  <p className="text-sm text-emerald-800/80">{code.rebuttal}</p>
                                </div>
                              </div>
                              {jurisdictionInfo?.hasAmendment && jurisdictionInfo.amendmentNote && (
                                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                                  <p className="text-[11px] font-semibold uppercase text-amber-700 mb-1">
                                    {selectedCounty.state} Amendment
                                  </p>
                                  <p className="text-sm text-amber-900/80">
                                    {jurisdictionInfo.amendmentNote}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                  Source Reference
                                </p>
                                <p className="text-xs font-mono text-[#344767]/50">
                                  {jurisdictionInfo?.sourceRef}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
