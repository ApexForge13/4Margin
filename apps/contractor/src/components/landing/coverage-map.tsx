"use client";

import { useState, FormEvent } from "react";

/* ─────── County data ─────── */

interface SupportedCounty {
  name: string;
  state: "MD" | "PA" | "DE";
}

const SUPPORTED_COUNTIES: SupportedCounty[] = [
  // Maryland — 24 jurisdictions
  { name: "Allegany", state: "MD" },
  { name: "Anne Arundel", state: "MD" },
  { name: "Baltimore", state: "MD" },
  { name: "Baltimore City", state: "MD" },
  { name: "Calvert", state: "MD" },
  { name: "Caroline", state: "MD" },
  { name: "Carroll", state: "MD" },
  { name: "Cecil", state: "MD" },
  { name: "Charles", state: "MD" },
  { name: "Dorchester", state: "MD" },
  { name: "Frederick", state: "MD" },
  { name: "Garrett", state: "MD" },
  { name: "Harford", state: "MD" },
  { name: "Howard", state: "MD" },
  { name: "Kent", state: "MD" },
  { name: "Montgomery", state: "MD" },
  { name: "Prince George's", state: "MD" },
  { name: "Queen Anne's", state: "MD" },
  { name: "Somerset", state: "MD" },
  { name: "St. Mary's", state: "MD" },
  { name: "Talbot", state: "MD" },
  { name: "Washington", state: "MD" },
  { name: "Wicomico", state: "MD" },
  { name: "Worcester", state: "MD" },
  // Pennsylvania — 16 counties
  { name: "Adams", state: "PA" },
  { name: "Berks", state: "PA" },
  { name: "Bucks", state: "PA" },
  { name: "Chester", state: "PA" },
  { name: "Cumberland", state: "PA" },
  { name: "Dauphin", state: "PA" },
  { name: "Delaware", state: "PA" },
  { name: "Franklin", state: "PA" },
  { name: "Lancaster", state: "PA" },
  { name: "Lebanon", state: "PA" },
  { name: "Lehigh", state: "PA" },
  { name: "Montgomery", state: "PA" },
  { name: "Northampton", state: "PA" },
  { name: "Philadelphia", state: "PA" },
  { name: "Schuylkill", state: "PA" },
  { name: "York", state: "PA" },
  // Delaware — 3 counties
  { name: "Kent", state: "DE" },
  { name: "New Castle", state: "DE" },
  { name: "Sussex", state: "DE" },
];

const STATE_COUNTS = {
  MD: SUPPORTED_COUNTIES.filter((c) => c.state === "MD").length,
  PA: SUPPORTED_COUNTIES.filter((c) => c.state === "PA").length,
  DE: SUPPORTED_COUNTIES.filter((c) => c.state === "DE").length,
};

/* ─────── Component ─────── */

export function CoverageMap() {
  const [activeState, setActiveState] = useState<"MD" | "PA" | "DE" | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredCounties = activeState
    ? SUPPORTED_COUNTIES.filter((c) => c.state === activeState)
    : SUPPORTED_COUNTIES;

  const handleRequestSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/coverage-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          state: data.get("state"),
          county: data.get("county"),
        }),
      });

      if (res.ok) {
        setFormSubmitted(true);
        form.reset();
      }
    } catch {
      // Silently handle - form stays visible for retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Coverage tiers legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-sm bg-[#22c55e]" />
          <span className="text-sm text-gray-300">Fully Supported — supplements + decoder + local code data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-sm bg-[#eab308]" />
          <span className="text-sm text-gray-300">Policy decoder available — supplement engine expanding</span>
        </div>
      </div>

      {/* State cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-10">
        {(["MD", "PA", "DE"] as const).map((state) => {
          const stateNames: Record<string, string> = {
            MD: "Maryland",
            PA: "Pennsylvania",
            DE: "Delaware",
          };
          const isActive = activeState === state;

          return (
            <button
              key={state}
              type="button"
              onClick={() => setActiveState(isActive ? null : state)}
              className={`rounded-xl border p-6 text-left transition ${
                isActive
                  ? "border-[#22c55e]/50 bg-[#22c55e]/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{stateNames[state]}</div>
                  <div className="text-sm text-gray-400">
                    {STATE_COUNTS[state]} counties
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22c55e]/20">
                  <span className="text-sm font-bold text-[#22c55e]">{state}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-xs text-[#22c55e] font-medium">Live</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rest of US indicator */}
      <div className="mb-10 rounded-xl border border-[#eab308]/20 bg-[#eab308]/5 p-4 text-center">
        <div className="text-sm text-[#eab308] font-medium">
          All other states: Policy decoder available. Supplement engine partially available (no local code data yet).
        </div>
      </div>

      {/* County grid */}
      <div className="mb-12">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">
          {activeState
            ? `${activeState === "MD" ? "Maryland" : activeState === "PA" ? "Pennsylvania" : "Delaware"} Counties`
            : `All ${SUPPORTED_COUNTIES.length} Supported Counties`}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredCounties.map((c) => (
            <div
              key={`${c.state}-${c.name}`}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e]" />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto shrink-0 text-xs text-gray-500">{c.state}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Form */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        <h3 className="text-xl font-bold text-center">Not in your area yet?</h3>
        <p className="text-gray-400 text-center mt-2 text-sm">
          Request coverage for your state or county. We&apos;ll prioritize expansion based on demand and notify you when we go live.
        </p>

        {formSubmitted ? (
          <div className="mt-8 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 p-6 text-center">
            <div className="text-2xl mb-2">&#x2705;</div>
            <div className="font-semibold text-[#22c55e]">Request received!</div>
            <p className="text-sm text-gray-400 mt-1">
              We&apos;ll email you when we expand to your area.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="req-name" className="block text-xs font-medium text-gray-400 mb-1">
                Name
              </label>
              <input
                id="req-name"
                name="name"
                type="text"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF]/50 focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/30"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="req-email" className="block text-xs font-medium text-gray-400 mb-1">
                Email
              </label>
              <input
                id="req-email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF]/50 focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/30"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="req-company" className="block text-xs font-medium text-gray-400 mb-1">
                Company
              </label>
              <input
                id="req-company"
                name="company"
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF]/50 focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/30"
                placeholder="Your roofing company"
              />
            </div>
            <div>
              <label htmlFor="req-state" className="block text-xs font-medium text-gray-400 mb-1">
                State
              </label>
              <input
                id="req-state"
                name="state"
                type="text"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF]/50 focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/30"
                placeholder="e.g., Virginia"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="req-county" className="block text-xs font-medium text-gray-400 mb-1">
                County (optional)
              </label>
              <input
                id="req-county"
                name="county"
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#00BFFF]/50 focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/30"
                placeholder="e.g., Fairfax County"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#00BFFF]/20 transition hover:shadow-[#00BFFF]/30 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Request Coverage for My Area"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
