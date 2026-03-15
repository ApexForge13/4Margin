import Link from "next/link";
import type { Metadata } from "next";
import { CoverageMap } from "@/components/landing/coverage-map";

export const metadata: Metadata = {
  title: "4Margin — One Platform for Every Roof",
  description:
    "Inspect. Quote. Decode. Supplement. 4Margin keeps your jobs organized from first look to final payment. Built for roofing contractors.",
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

/* ─────── services data ─────── */

const SERVICES = [
  {
    number: "01",
    title: "Inspect",
    tagline: "Document it right the first time.",
    description:
      "Walk the roof, tap submit. Get a professional inspection report with photos, measurements, and manufacturer specs — ready to hand the homeowner or send to the carrier.",
    features: ["Photo-based reports", "Manufacturer specs included", "Feeds into quotes & supplements"],
    priceBadge: "Free",
    priceNote: "Unlimited",
    color: "#00BFFF",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    ),
  },
  {
    number: "02",
    title: "Quote",
    tagline: "Quote the job before you leave the property.",
    description:
      "Build accurate quotes with real product lines from 6 manufacturers. Material breakdowns, labor, waste — all in one document the homeowner can say yes to.",
    features: ["55+ shingle products", "6 manufacturers", "Branded PDF proposals"],
    priceBadge: "Free",
    priceNote: "3 free, then Pro",
    color: "#39FF9E",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    ),
  },
  {
    number: "03",
    title: "Decode",
    tagline: "Know the policy before you talk to the adjuster.",
    description:
      "Upload any insurance policy. Get a plain-English breakdown of what's covered, what's excluded, and what the carrier owes — before you start the job.",
    features: ["Coverage & exclusion breakdown", "Landmine clause detection", "Favorable provision identification"],
    priceBadge: "Free",
    priceNote: "3 free, then Pro",
    color: "#00BFFF",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
  {
    number: "04",
    title: "Supplement",
    tagline: "Find what the adjuster missed. Back it with evidence.",
    description:
      "Missing line items, underpaid trades, code-required work the adjuster skipped. 4Margin finds what's owed and builds the supplement with code authority and manufacturer backing.",
    features: ["200+ detectable missing items", "IRC code references", "Manufacturer-backed justification"],
    priceBadge: "Free",
    priceNote: "3 free, then Pro+",
    color: "#39FF9E",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
];

/* ─────── pricing data ─────── */

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try everything. No credit card required.",
    cta: "Get Started Free",
    highlighted: false,
    features: [
      "Unlimited inspection reports",
      "3 free quotes",
      "3 free policy decodes",
      "3 free supplements",
      "MD · PA · DE coverage",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "Unlimited quotes, decodes, and full knowledge base access.",
    cta: "Start Free, Upgrade Anytime",
    highlighted: true,
    features: [
      "Everything in Free",
      "Unlimited quotes",
      "Unlimited policy decodes",
      "Knowledge base — IRC codes, manufacturer specs, carrier insights",
      "Job management dashboard",
      "Document library",
    ],
  },
  {
    name: "Pro + Supplements",
    price: "$199",
    period: "/month",
    description: "Full platform with supplement and rebuttal support.",
    cta: "Start Free, Upgrade Anytime",
    highlighted: false,
    features: [
      "Everything in Pro",
      "5 supplements/month included",
      "Additional supplements $49 each",
      "Supplement and rebuttal support",
      "Cover letters & code authority docs",
    ],
  },
];

/* ─────── why 4margin data ─────── */

const VALUE_PROPS = [
  {
    title: "Everything in one place",
    desc: "Your inspections, quotes, policies, and supplements — all tied to the same job. No more jumping between apps or digging through email.",
    color: "#00BFFF",
  },
  {
    title: "Built for the field",
    desc: "Designed for contractors between jobs, not office workers at a desk. Fast, mobile-ready, no learning curve.",
    color: "#39FF9E",
  },
  {
    title: "Code and manufacturer authority",
    desc: "Every supplement and inspection report is backed by IRC building codes and manufacturer installation requirements — not opinions.",
    color: "#00BFFF",
  },
  {
    title: "Your jobs, your data",
    desc: "Every document, photo, and report lives in your account. Organized by job, accessible anytime.",
    color: "#39FF9E",
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
            <a href="#services" className="transition hover:text-white">
              Services
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
            Built by a roofer. Built for roofers.
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            One platform for{" "}
            <span className="bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] bg-clip-text text-transparent">
              every roof.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Inspect. Quote. Decode. Supplement.{" "}
            <span className="font-semibold text-white">
              4Margin keeps your jobs organized from first look to final payment.
            </span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30 sm:w-auto"
            >
              Get Started Free
            </Link>
            <a
              href="#services"
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
              { value: "6", label: "Manufacturers", color: "text-[#39FF9E]" },
              { value: "43", label: "Counties — MD · PA · DE", color: "text-[#00BFFF]" },
              { value: "4", label: "Services", color: "text-white" },
              { value: "$0", label: "Free to start", color: "text-[#39FF9E]" },
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

      {/* ───── Services ───── */}
      <section id="services" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Services</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Four tools. One connected workflow.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Each service feeds into the next — your inspection photos back your
              supplement, your policy decode informs your strategy, and your quote
              reflects the full scope of work.
            </p>
          </div>

          <div className="mt-16 space-y-8">
            {SERVICES.map((step, i) => (
              <div
                key={step.number}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10 md:p-10"
              >
                {/* Connecting line between steps */}
                {i < SERVICES.length - 1 && (
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
                        {step.priceBadge}
                      </span>
                      {step.priceNote && (
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
              Run your roofing business from one place.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              No more jumping between apps, emailing yourself photos, or losing
              track of what you sent to which homeowner.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {VALUE_PROPS.map((card) => (
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
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Pricing</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Start free. Scale when you&apos;re ready.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Unlimited inspections on every plan. Upgrade for unlimited quotes,
              policy decodes, and supplement support.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 transition ${
                  tier.highlighted
                    ? "border-[#00BFFF]/40 bg-[#00BFFF]/5 shadow-lg shadow-[#00BFFF]/10"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00BFFF] px-4 py-1 text-xs font-bold text-white">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">{tier.price}</span>
                    <span className="text-sm text-gray-500">{tier.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckIcon
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: tier.highlighted ? "#00BFFF" : "#39FF9E" } as React.CSSProperties}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    tier.highlighted
                      ? "bg-[#00BFFF] text-white shadow-lg shadow-[#00BFFF]/25 hover:bg-[#00A8E0]"
                      : "border border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Running 50+ jobs a month?{" "}
              <a href="mailto:team@4margin.com" className="text-[#00BFFF] hover:underline">
                Contact us for volume pricing
              </a>
              .
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
              Available in 43 counties across Maryland, Pennsylvania, and Delaware.
              Expanding soon.{" "}
              <a href="mailto:team@4margin.com" className="text-[#00BFFF] hover:underline">
                Need coverage in your area? Let us know.
              </a>
            </p>
          </div>
          <CoverageMap />
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start running your jobs from one platform.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
            Create your free account and run your first inspection in minutes.
            No credit card. No commitment.
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
            <a href="#services" className="transition hover:text-gray-300">
              Services
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
