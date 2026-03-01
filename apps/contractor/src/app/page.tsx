import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "4Margin — AI-Powered Policy Decoder for Roofing Contractors",
  description:
    "Upload any homeowner's insurance policy. Our AI decodes coverages, exclusions, deductibles, and hidden gaps — so you know exactly what's covered before you start the job.",
};

/* ─────── shared tiny components ─────── */

function Logo() {
  return (
    <span className="text-xl font-bold tracking-tight uppercase">
      <span className="text-[#00BFFF]">4</span>
      <span className="text-white">M</span>
      <span className="text-[#39FF9E]">A</span>
      <span className="text-white">RG</span>
      <span className="text-[#39FF9E]">I</span>
      <span className="text-white">N</span>
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
            <a href="#why" className="transition hover:text-white">
              Why 4Margin
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
            Know exactly what&apos;s covered{" "}
            <span className="bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] bg-clip-text text-transparent">
              before you start the job.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Upload any homeowner&apos;s insurance policy. Our AI decodes
            coverages, exclusions, deductibles, and hidden gaps —{" "}
            <span className="font-semibold text-white">
              in 2 minutes instead of 2 hours.
            </span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30 sm:w-auto"
            >
              Decode Your First Policy — Free
            </Link>
            <a
              href="#how-it-works"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-gray-300 transition hover:border-white/20 hover:bg-white/10 sm:w-auto"
            >
              See How It Works
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/5 pt-10">
            {[
              { value: "< 2 min", label: "From upload to full breakdown", color: "text-[#00BFFF]" },
              { value: "100%", label: "AI-powered, no manual review", color: "text-[#39FF9E]" },
              { value: "Free", label: "First decode — no credit card", color: "text-white" },
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
              Upload the policy. Get the breakdown. Win the job.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Three simple steps. No fine-print reading, no guesswork, no surprises mid-job.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload the Policy PDF",
                desc: "Drop in the homeowner's insurance policy declaration page. Our AI reads and parses every section in seconds.",
                color: "#00BFFF",
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "AI Decodes the Policy",
                desc: "Our engine identifies dwelling coverage, deductibles, endorsements, exclusions, and flags hidden gaps that could derail a claim.",
                color: "#39FF9E",
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Review & Share the Report",
                desc: "Get a clear, professional breakdown you can review with your team or share directly with the homeowner to build trust and close the deal.",
                color: "#00BFFF",
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10"
                style={{ ["--step-color" as string]: item.color }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl transition"
                    style={{ background: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color: `${item.color}66` }}>
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Features</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Everything you need to decode any policy.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Coverage Breakdown",
                desc: "Instantly see dwelling, other structures, personal property, loss of use, and liability limits — no more digging through page after page.",
                emoji: "🏠",
              },
              {
                title: "Deductible Analysis",
                desc: "Identifies wind/hail deductibles, percentage-based deductibles, and AOP deductibles so you can set accurate expectations with homeowners.",
                emoji: "💰",
              },
              {
                title: "Gap Detection",
                desc: "Flags missing or insufficient coverages — like low dwelling limits, ordinance & law exclusions, or mold/water damage restrictions.",
                emoji: "🔍",
              },
              {
                title: "Endorsement Parsing",
                desc: "Reads and summarizes every endorsement and rider on the policy. Know exactly what modifications are in play.",
                emoji: "📋",
              },
              {
                title: "Exclusion Alerts",
                desc: "Highlights critical exclusions that could leave the homeowner (and you) exposed during a claim — before work begins.",
                emoji: "⚠️",
              },
              {
                title: "PDF Report Export",
                desc: "Download a clean, professional report you can share with homeowners, adjusters, or your team to streamline conversations.",
                emoji: "📄",
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
              Stop guessing. Start knowing.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Most contractors don&apos;t read the policy until there&apos;s a problem. 4Margin puts that knowledge in your hands before the first shingle is removed.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Close more jobs with confidence",
                desc: "Walk the homeowner through their coverage in plain English. When they see you understand their policy better than the adjuster, trust is instant.",
              },
              {
                title: "Avoid mid-job surprises",
                desc: "Uncover percentage deductibles, cosmetic damage exclusions, and coverage caps before you commit crews and materials.",
              },
              {
                title: "Built by a roofer, not a tech company",
                desc: "We understand the frustration of underpaid claims because we've lived it. Every feature was designed around how contractors actually work.",
              },
              {
                title: "Save hours on every job",
                desc: "What used to take 1–2 hours of reading fine print now takes 2 minutes. Decode policies at scale and spend your time on the roof, not in the office.",
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

      {/* ───── CTA ───── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to decode your first policy?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
            Upload a homeowner&apos;s policy and see exactly what&apos;s covered — and what&apos;s not. No credit card. No commitment.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30"
          >
            Get Started — First Decode Free
          </Link>
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
            <a href="#why" className="transition hover:text-gray-300">
              Why 4Margin
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
