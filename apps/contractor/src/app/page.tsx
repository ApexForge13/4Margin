import Link from "next/link";
import type { Metadata } from "next";
import { CoverageMap } from "@/components/landing/coverage-map";

export const metadata: Metadata = {
  title: "4Margin — AI-Powered Platform for Insurance Restoration Contractors",
  description:
    "Inspect. Decode. Supplement. Quote. One AI-powered platform for roofing contractors — inspection reports, policy analysis, supplement detection, and branded proposals.",
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

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ─────── workflow step data ─────── */

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Inspect",
    tagline: "Document the damage. Build your case.",
    description:
      "Upload property photos and let AI classify damage type, material condition, and affected components. Generate a professional inspection report that becomes the foundation for your supplement.",
    features: ["AI-powered photo classification", "Professional PDF reports", "Feeds directly into supplements"],
    price: "Free",
    priceNote: "Always free",
    color: "#00BFFF",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    ),
  },
  {
    number: "02",
    title: "Decode",
    tagline: "Know the policy before you talk to the adjuster.",
    description:
      "Upload any homeowner insurance policy and get a plain-English breakdown in minutes. Identify coverage limits, hidden exclusions, landmine clauses, and favorable provisions that strengthen your position.",
    features: ["Carrier-specific analysis", "Landmine & gap detection", "Favorable provision identification"],
    price: "$10",
    priceNote: "First 10 free",
    color: "#39FF9E",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
  {
    number: "03",
    title: "Supplement",
    tagline: "Find what the adjuster missed. Back it with evidence.",
    description:
      "Upload the adjuster's Xactimate estimate and let our 10-layer AI engine identify every missing line item. Get estimated recovery ranges with Xactimate codes, IRC building code references, and manufacturer installation requirements — the documentation you need to build your case.",
    features: ["200+ detectable missing items", "IRC + manufacturer-backed justification", "Estimated recovery ranges"],
    price: "$50",
    priceNote: "First 3 free",
    color: "#00BFFF",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
  {
    number: "04",
    title: "Quote",
    tagline: "Quote the job before you leave the property.",
    description:
      "Generate branded proposals with market-based material pricing ranges from all major manufacturers. Present a professional quote on-site that reflects the scope of work and builds homeowner confidence.",
    features: ["55+ shingle products across 6 manufacturers", "Market-based pricing ranges", "Branded PDF proposals"],
    price: "Free",
    priceNote: "Always free",
    color: "#39FF9E",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    ),
  },
];

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
            <a href="#workflow" className="transition hover:text-white">
              How It Works
            </a>
            <a href="#why" className="transition hover:text-white">
              Why 4Margin
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
              Start Free
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
            <span className="bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] bg-clip-text text-transparent">
              Inspect.
            </span>{" "}
            Decode.{" "}
            <span className="bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] bg-clip-text text-transparent">
              Supplement.
            </span>{" "}
            Quote.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            One AI-powered platform that connects your inspection reports,
            policy analysis, supplements, and proposals into a single workflow.{" "}
            <span className="font-semibold text-white">
              Built for insurance restoration contractors who want to recover every dollar.
            </span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30 sm:w-auto"
            >
              Start Free
            </Link>
            <a
              href="#workflow"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              See How It Works
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-6 border-t border-white/5 pt-10 sm:grid-cols-4">
            {[
              { value: "10", label: "Free policy decodes", color: "text-[#39FF9E]" },
              { value: "3", label: "Free supplements", color: "text-[#00BFFF]" },
              { value: "AI", label: "Powered analysis", color: "text-white" },
              { value: "IRC", label: "& manufacturer backed", color: "text-[#00BFFF]" },
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

      {/* ───── The Problem ───── */}
      <section className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <p className="text-lg leading-relaxed text-gray-400 sm:text-xl">
            Most restoration contractors juggle disconnected tools, manual
            supplement processes, and unread policies across every job.
            Inspections in one app. Estimates in another. Supplements outsourced
            or skipped entirely.{" "}
            <span className="font-semibold text-white">
              4Margin brings it all into one platform.
            </span>
          </p>
        </div>
      </section>

      {/* ───── The Workflow ───── */}
      <section id="workflow" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>How It Works</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Four tools. One connected workflow.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Each step feeds into the next — so your inspection photos back
              your supplement, your policy decode informs your strategy, and your
              quote reflects the full scope of work.
            </p>
          </div>

          <div className="mt-16 space-y-8">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                key={step.number}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10 md:p-10"
              >
                {/* Connecting line between steps */}
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="absolute -bottom-8 left-1/2 hidden h-8 w-px bg-gradient-to-b from-white/10 to-transparent md:block" />
                )}

                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
                  {/* Left: number + icon */}
                  <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-center md:gap-2">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${step.color}15` }}
                    >
                      <svg className="h-6 w-6" style={{ color: step.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {step.icon}
                      </svg>
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color: `${step.color}88` }}>
                      {step.number}
                    </span>
                  </div>

                  {/* Center: content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold md:text-2xl">{step.title}</h3>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: `${step.color}15`,
                          color: step.color,
                        }}
                      >
                        {step.price === "Free" ? "Free" : `${step.price}/each`}
                      </span>
                      {step.priceNote && step.price !== "Free" && (
                        <span className="text-xs text-gray-500">{step.priceNote}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium" style={{ color: step.color }}>
                      {step.tagline}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                      {step.description}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                      {step.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0" style={{ color: step.color } as React.CSSProperties} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
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
              Documentation adjusters can&apos;t dismiss.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Most supplement tools give you a list of missing items. 4Margin
              gives you the evidence to back every one of them.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "The logic adjusters can't deny",
                desc: "We identify every missing line item with the correct Xactimate code, backed by IRC references and manufacturer specs. You get the justification and documentation to build your supplement — not just a guess at what's missing.",
                color: "#00BFFF",
              },
              {
                title: "Built on code authority",
                desc: "Every supplement item references specific IRC building codes, manufacturer installation requirements, and industry standards. This is documentation grounded in authority — not opinion.",
                color: "#39FF9E",
              },
              {
                title: "Carrier pattern intelligence",
                desc: "We track which items each carrier approves and denies, by region. Your supplement is built to match what actually gets paid — not just what should be covered on paper.",
                color: "#00BFFF",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <CheckIcon className="h-5 w-5" style={{ color: card.color } as React.CSSProperties} />
                </div>
                <h3 className="text-lg font-bold">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Pricing</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Simple. Per-use. No subscriptions.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Inspections and quotes are free. Pay per decode and per supplement
              — only after your free tier runs out.
            </p>
          </div>

          <div className="mt-16 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-300">Service</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-300">Free Tier</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-300">Per-Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="px-6 py-5">
                    <div className="font-semibold">Inspection Reports</div>
                    <div className="mt-0.5 text-xs text-gray-500">AI photo analysis + PDF report</div>
                  </td>
                  <td className="px-6 py-5 text-[#39FF9E] font-semibold">Free</td>
                  <td className="px-6 py-5 text-gray-400">Free</td>
                </tr>
                <tr>
                  <td className="px-6 py-5">
                    <div className="font-semibold">Policy Decodes</div>
                    <div className="mt-0.5 text-xs text-gray-500">Coverage analysis + landmine detection</div>
                  </td>
                  <td className="px-6 py-5 text-[#39FF9E] font-semibold">10 free</td>
                  <td className="px-6 py-5">
                    <span className="font-semibold">$10</span>
                    <span className="text-gray-500"> /decode</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-5">
                    <div className="font-semibold">Supplements</div>
                    <div className="mt-0.5 text-xs text-gray-500">Missing item detection + documentation package</div>
                  </td>
                  <td className="px-6 py-5 text-[#39FF9E] font-semibold">3 free</td>
                  <td className="px-6 py-5">
                    <span className="font-semibold">$50</span>
                    <span className="text-gray-500"> /supplement</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-5">
                    <div className="font-semibold">Quotes & Proposals</div>
                    <div className="mt-0.5 text-xs text-gray-500">Branded PDF proposals with pricing ranges</div>
                  </td>
                  <td className="px-6 py-5 text-[#39FF9E] font-semibold">Free</td>
                  <td className="px-6 py-5 text-gray-400">Free</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/signup"
              className="inline-block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30"
            >
              Start Free — No Credit Card Required
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              Enterprise or volume pricing? <a href="mailto:team@4margin.com" className="text-[#00BFFF] hover:underline">Contact us</a>.
            </p>
          </div>
        </div>
      </section>

      {/* ───── Coverage ───── */}
      <section id="coverage" className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="mb-12 text-center">
            <SectionTag>Coverage</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              43 counties. Growing fast.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Our IRC code database and manufacturer requirement library
              currently covers Maryland, Pennsylvania, and Delaware. Policy
              decoder and quoting work nationwide. More code authority regions
              coming soon.
            </p>
          </div>
          <CoverageMap />
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start recovering more. Today.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
            Create your free account and decode your first policy in under 2
            minutes. No credit card. No commitment.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/5 bg-[#060A13]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <Logo />
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#workflow" className="transition hover:text-gray-300">
              How It Works
            </a>
            <a href="#why" className="transition hover:text-gray-300">
              Why 4Margin
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
