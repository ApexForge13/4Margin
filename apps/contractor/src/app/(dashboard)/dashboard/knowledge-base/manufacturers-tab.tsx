"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Manufacturer } from "@/data/manufacturer-requirements";

interface ManufacturersTabProps {
  manufacturers: Record<string, Manufacturer>;
}

export function ManufacturersTab({ manufacturers }: ManufacturersTabProps) {
  const manufacturerNames = useMemo(() => Object.keys(manufacturers), [manufacturers]);
  const [selectedName, setSelectedName] = useState(manufacturerNames[0] ?? "GAF");
  const [search, setSearch] = useState("");
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  const manufacturer = manufacturers[selectedName];
  if (!manufacturer) return null;

  const filteredRequirements = manufacturer.installationRequirements.filter(
    (req) =>
      req.requirement.toLowerCase().includes(search.toLowerCase()) ||
      req.xactimateCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left panel — Manufacturer list */}
      <div
        className="w-64 shrink-0 rounded-2xl bg-white border border-gray-100 overflow-hidden flex flex-col"
        style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
      >
        <div className="p-4 border-b border-gray-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
            Manufacturers
          </p>
        </div>
        <div className="flex-1">
          {manufacturerNames.map((name) => {
            const m = manufacturers[name];
            return (
              <button
                key={name}
                onClick={() => {
                  setSelectedName(name);
                  setExpandedReq(null);
                  setSearch("");
                }}
                className={`w-full text-left px-4 py-4 flex items-center justify-between transition-all duration-100 border-l-[3px] ${
                  selectedName === name
                    ? "border-l-[#00BFFF] bg-[#00BFFF]/[0.04]"
                    : "border-l-transparent hover:bg-gray-50"
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      selectedName === name
                        ? "text-[#344767]"
                        : "text-[#344767]/70"
                    }`}
                  >
                    {name}
                  </p>
                  <p className="text-[11px] text-[#344767]/40 mt-0.5">
                    {m.installationRequirements.length} requirements
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#344767]/50 font-medium capitalize">
                  {m.type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Warranty tiers */}
        <div className="border-t border-gray-100 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40 mb-3">
            Warranty Tiers
          </p>
          <div className="space-y-2">
            {manufacturer.warrantyTiers.map((tier) => (
              <div
                key={tier.tier}
                className="rounded-lg bg-[#f8f9fa] p-2.5"
              >
                <p className="text-xs font-semibold text-[#344767]">{tier.tier}</p>
                <p className="text-[10px] text-[#344767]/50 mt-0.5">
                  Wind: {tier.windCoverage}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Manufacturer details */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Manufacturer header */}
        <div
          className="rounded-2xl bg-white border border-gray-100 p-6"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#344767]">{selectedName}</h3>
              <p className="text-sm text-[#344767]/50 capitalize">{manufacturer.type} Manufacturer</p>
            </div>
            <Badge className="bg-[#00BFFF]/10 text-[#00BFFF] border-0 text-xs font-medium">
              {manufacturer.installationRequirements.length} Requirements
            </Badge>
          </div>

          {/* Product lines */}
          <div className="flex flex-wrap gap-2">
            {manufacturer.productLines.map((pl) => (
              <div
                key={pl.name}
                className="rounded-lg bg-[#f8f9fa] px-3 py-2 text-xs"
              >
                <span className="font-medium text-[#344767]">{pl.name}</span>
                <span className="text-[#344767]/40 ml-2">{pl.warrantyTerm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by requirement name or Xactimate code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm rounded-lg border-gray-200 focus:border-[#00BFFF] focus:ring-[#00BFFF]/20 max-w-md"
          />
          <span className="text-xs text-[#344767]/40 shrink-0">
            {filteredRequirements.length} of {manufacturer.installationRequirements.length} shown
          </span>
        </div>

        {/* Requirements table */}
        <div
          className="rounded-2xl bg-white border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Requirement
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Xactimate
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Unit
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Warranty
                  </th>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#344767]/40">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequirements.map((req, idx) => {
                  const isExpanded = expandedReq === req.id;
                  return (
                    <>
                      <tr
                        key={req.id}
                        onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                        className={`cursor-pointer transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#f8f9fa]/50"
                        } hover:bg-[#00BFFF]/[0.03]`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#344767]">
                              {req.requirement}
                            </span>
                            {req.commonlyMissedByAdjusters && (
                              <span className="text-[9px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">
                                Commonly Missed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[11px] font-mono bg-[#00BFFF]/10 text-[#00BFFF] px-1.5 py-0.5 rounded">
                            {req.xactimateCode}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[#344767]/60 text-xs">
                          {req.xactimateUnit}
                        </td>
                        <td className="px-6 py-3">
                          {req.mandatoryForWarranty ? (
                            <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-gray-100 text-[#344767]/50 px-2 py-0.5 rounded-full">
                              Optional
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-[#344767]/50 max-w-[200px] truncate">
                          {req.sourceSection}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${req.id}-expanded`}>
                          <td colSpan={5} className="px-6 py-4 bg-[#f8f9fa]">
                            <div className="space-y-3 max-w-3xl">
                              <div>
                                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                  Full Description
                                </p>
                                <p className="text-sm text-[#344767]/80">{req.description}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                  Warranty Impact
                                </p>
                                <p className="text-sm text-[#344767]/80">{req.warrantyImpact}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                    Typical Adjuster Objection
                                  </p>
                                  <p className="text-sm text-red-700/80 italic">
                                    {req.typicalAdjusterObjection}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                    Rebuttal
                                  </p>
                                  <p className="text-sm text-emerald-800/80">{req.rebuttal}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                    Source Section
                                  </p>
                                  <p className="text-xs text-[#344767]/60">{req.sourceSection}</p>
                                </div>
                                {req.sourceUrl && (
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase text-[#344767]/40 mb-1">
                                      Source URL
                                    </p>
                                    <a
                                      href={req.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#00BFFF] hover:underline"
                                    >
                                      View Document
                                    </a>
                                  </div>
                                )}
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
