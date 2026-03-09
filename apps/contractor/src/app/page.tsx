import Link from "next/link";
import type { Metadata } from "next";
import { CoverageMap } from "@/components/landing/coverage-map";

export const metadata: Metadata = {
  title: "4Margin — AI Supplement Engine & Policy Decoder for Roofing Contractors",
  description:
    "Win more supplements and decode any insurance policy. 10-layer AI engine with 3-pillar evidence, 48 manufacturer specs, and coverage across 43 counties.",
};

/* ─────── shared tiny components ─────── */

function Logo() {
  return (
    <span className="text-xl font-bold tracking-tight uppercase">
      <span className="text-[#00BFFF]">4</span>
      <span className="text-white">MARGIN</span>
    </span>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#00BFFF]">
      {children}
    </span>
  );
}

/* ─────── page ─────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060A13] text-white antialiased">
      {/* ───── Navbar ───── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#060A13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
            <a href="#how-it-works" className="transition hover:text-white">
              How It Works
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#coverage" className="transition hover:text-white">
              Coverage
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition hover:text-white sm:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#00BFFF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#00BFFF]/20 transition hover:bg-[#00A8E0] hover:shadow-[#00BFFF]/30"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#00BFFF]/8 blur-[120px]" />
        <div className="pointer-events-none absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-[#39FF9E]/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-300">
            <span className="inline-block h-2 w-2 rounded-full bg-[#39FF9E] animate-pulse" />
            Built by a roofer. Powered by AI.
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Win more supplements.{" "}
            <span className="bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] bg-clip-text text-transparent">
              Decode any policy.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            The AI-powered platform that helps roofing contractors write
            supplements, decode insurance policies, and{" "}
            <span className="font-semibold text-white">
              maximize claim recovery.
            </span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30 sm:w-auto"
            >
              Start Your First Supplement — Free
            </Link>
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              Decode a Policy — Free
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-6 border-t border-white/5 pt-10 sm:grid-cols-4">
            {[
              { value: "< 2 min", label: "Policy decode time", color: "text-[#00BFFF]" },
              { value: "10-Layer", label: "AI supplement engine", color: "text-[#39FF9E]" },
              { value: "48", label: "Manufacturer specs", color: "text-white" },
              { value: "First 3 Free", label: "No credit card needed", color: "text-[#00BFFF]" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className={`text-2xl font-extrabold sm:text-3xl ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>How It Works</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Two powerful tools. One platform.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Whether you need to write a supplement or decode a policy, 4Margin has you covered.
            </p>
          </div>

          {/* Supplement Engine Track */}
          <div className="mt-16">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00BFFF]/10">
                <svg className="h-5 w-5 text-[#00BFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Supplement Engine</h3>
              <span className="rounded-full bg-[#00BFFF]/10 px-3 py-1 text-xs font-semibold text-[#00BFFF]">$149/supplement</span>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload Everything",
                  desc: "Drop in the adjuster estimate, EagleView report, policy, and property photos. Our AI reads them all.",
                  color: "#00BFFF",
                },
                {
                  step: "02",
                  title: "AI Detects Missing Items",
                  desc: "10-layer engine analyzes your estimate against IRC codes, manufacturer specs, and Xactimate standards. Every item gets a confidence score.",
                  color: "#39FF9E",
                },
                {
                  step: "03",
                  title: "Download Your Package",
                  desc: "Get a complete supplement PDF, cover letter, justification document, and weather verification report — all in one ZIP.",
                  color: "#00BFFF",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10"
                >
                  <span className="font-mono text-sm font-bold" style={{ color: `${item.color}66` }}>
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Decoder Track */}
          <div className="mt-16">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#39FF9E]/10">
                <svg className="h-5 w-5 text-[#39FF9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Policy Decoder</h3>
              <span className="rounded-full bg-[#39FF9E]/10 px-3 py-1 text-xs font-semibold text-[#39FF9E]">$15/report</span>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload the Policy PDF",
                  desc: "Drop in the homeowner's insurance policy. Our AI reads and parses every section in seconds.",
                  color: "#39FF9E",
                },
                {
                  step: "02",
                  title: "AI Decodes Coverage",
                  desc: "Identifies dwelling limits, deductibles, endorsements, exclusions, and flags hidden gaps that could derail a claim.",
                  color: "#00BFFF",
                },
                {
                  step: "03",
                  title: "Review & Share",
                  desc: "Get a clear, professional report you can review with your team or share with the homeowner to build trust.",
                  color: "#39FF9E",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10"
                >
                  <span className="font-mono text-sm font-bold" style={{ color: `${item.color}66` }}>
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Features</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built for how contractors actually work.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "AI Supplement Detection",
                desc: "10-layer engine compares adjuster estimates against IRC codes, manufacturer specs, and Xactimate standards to find every missing line item.",
                emoji: "🔍",
              },
              {
                title: "Confidence Scoring",
                desc: "Every detected item gets a 100-point confidence score across 4 dimensions: policy support, code authority, manufacturer requirement, and carrier history.",
                emoji: "📊",
              },
              {
                title: "Policy Decoder",
                desc: "AI reads the full policy and decodes coverage limits, deductibles, endorsements, exclusions, and hidden gaps in under 2 minutes.",
                emoji: "🛡️",
              },
              {
                title: "Weather Verification",
                desc: "Automatic weather report for the date of loss — wind speed, hail data, and storm history to support your claim.",
                emoji: "🌩️",
              },
              {
                title: "Manufacturer Specs",
                desc: "48 installation requirements from 6 major manufacturers (GAF, CertainTeed, Owens Corning, IKO, Atlas, TAMKO) with warranty impact analysis.",
                emoji: "🏭",
              },
              {
                title: "Complete ZIP Package",
                desc: "Download supplement PDF, cover letter, justification document, weather report, and photos — all professionally formatted and ready to send.",
                emoji: "📦",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-6 transition hover:border-white/10"
              >
                <div className="mb-3 text-2xl">{f.emoji}</div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Why 4Margin ───── */}
      <section id="why" className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Why 4Margin</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Stop leaving money on the table.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Most contractors accept the first estimate. 4Margin finds what the adjuster missed and gives you the evidence to back it up.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Maximize every claim",
                desc: "Our supplement engine detects missing line items that adjusters commonly overlook — starter strip, drip edge, ice & water shield, underlayment, and more.",
              },
              {
                title: "3-pillar evidence",
                desc: "Every supplement item is backed by IRC building codes, manufacturer installation requirements, and Xactimate industry standards. Not just guesswork.",
              },
              {
                title: "Built by a roofer, not a tech company",
                desc: "We understand the frustration of underpaid claims because we've lived it. Every feature was designed around how contractors actually work.",
              },
              {
                title: "43 counties and growing",
                desc: "Full code authority data for Maryland, Pennsylvania, and Delaware — with local AHJ references and jurisdiction-specific requirements.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-6"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#39FF9E]/10">
                  <svg className="h-4 w-4 text-[#39FF9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Pricing</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Simple pricing. No subscriptions.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Pay per report. First 3 are free on both services — no credit card required.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {/* Policy Decoder */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#39FF9E]">
                Policy Decoder
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$15</span>
                <span className="text-gray-500">/report</span>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                AI-powered coverage breakdown for any homeowner&apos;s insurance policy.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-300">
                {["Coverage & limits breakdown", "Deductible analysis", "Endorsement parsing", "Gap & exclusion detection", "Professional PDF export", "First 3 reports free"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#39FF9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block rounded-xl border border-[#39FF9E]/30 bg-[#39FF9E]/5 px-6 py-3 text-center text-sm font-semibold text-[#39FF9E] transition hover:bg-[#39FF9E]/10"
              >
                Try Free
              </Link>
            </div>

            {/* Supplement Engine */}
            <div className="relative rounded-2xl border-2 border-[#00BFFF]/40 bg-[#00BFFF]/[0.03] p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00BFFF] px-4 py-1 text-xs font-bold text-white">
                MOST POPULAR
              </div>
              <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#00BFFF]">
                Supplement Engine
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$149</span>
                <span className="text-gray-500">/supplement</span>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                AI-powered supplement detection with 3-pillar evidence and complete document package.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-300">
                {["10-layer AI analysis", "3-pillar evidence (code, manufacturer, industry)", "Confidence scoring (100-point scale)", "Cover letter generation", "Weather verification report", "Justification document", "Complete ZIP package", "First 3 supplements free"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#00BFFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-6 py-3 text-center text-sm font-bold text-white shadow-lg shadow-[#00BFFF]/20 transition hover:shadow-[#00BFFF]/30"
              >
                Start Free
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Enterprise
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">Custom</span>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Volume pricing for teams and multi-location roofing companies.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-300">
                {["Bulk supplement pricing", "Team accounts & permissions", "Custom company branding", "Priority support", "API access", "Dedicated account manager"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:team@4margin.com?subject=Enterprise%20Inquiry"
                className="mt-8 block rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-semibold text-gray-300 transition hover:border-white/20 hover:bg-white/10"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Coverage ───── */}
      <section id="coverage" className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center mb-12">
            <SectionTag>Coverage</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              43 counties. 3 states. Growing fast.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Full supplement engine support with local building code data, AHJ references, and jurisdiction-specific requirements. Policy decoder works nationwide.
            </p>
          </div>
          <CoverageMap />
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to win your next supplement?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
            Start for free. No credit card. No commitment. See what the adjuster missed on your very first claim.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30"
            >
              Get Started — First 3 Free
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/5 bg-[#060A13]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <Logo />
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#how-it-works" className="transition hover:text-gray-300">
              How It Works
            </a>
            <a href="#features" className="transition hover:text-gray-300">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-gray-300">
              Pricing
            </a>
            <a href="#coverage" className="transition hover:text-gray-300">
              Coverage
            </a>
            <Link href="/terms" className="transition hover:text-gray-300">
              Terms
            </Link>
            <Link href="/privacy" className="transition hover:text-gray-300">
              Privacy
            </Link>
            <Link href="/login" className="transition hover:text-gray-300">
              Sign In
            </Link>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} 4Margin. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
