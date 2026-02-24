import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "4Margin — AI-Powered Insurance Supplements for Roofing Contractors",
  description:
    "Recover $3,000–$8,000 more per job. Upload the adjuster's scope, and our AI finds every missing line item in minutes — not hours.",
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
            <a href="#pricing" className="transition hover:text-white">
              Pricing
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
            Stop leaving{" "}
            <span className="bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] bg-clip-text text-transparent">
              $3,000–$8,000
            </span>{" "}
            on every insurance job.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Upload the adjuster&apos;s Xactimate estimate. Our AI finds every
            missing line item, calculates correct waste, and generates a
            professional supplement —{" "}
            <span className="font-semibold text-white">
              in 10 minutes instead of 3 hours.
            </span>
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-8 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30 sm:w-auto"
            >
              Start Your First Supplement — Free
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
              { value: "$4,200", label: "Avg. recovery per supplement", color: "text-[#39FF9E]" },
              { value: "< 10 min", label: "From upload to download", color: "text-[#00BFFF]" },
              { value: "$149", label: "Per supplement — pay as you go", color: "text-white" },
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
              Upload the scope. Get the supplement. Recover the money.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Three simple steps. No templates to fill out, no manual line-item hunting, no 3-hour spreadsheets.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload Adjuster's Estimate",
                desc: "Drop in the Xactimate PDF and your inspection photos. Our AI reads and parses every line item in seconds.",
                color: "#00BFFF",
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "AI Finds What's Missing",
                desc: "Our engine cross-references the scope against Xactimate codes, calculates correct waste, and flags every underpaid or missing item.",
                color: "#39FF9E",
                icon: (
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Download Your Supplement",
                desc: "Get a professional PDF supplement with Xactimate codes, justifications, photos, and code references — ready to send to the carrier.",
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
              Everything you need to supplement smarter.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Xactimate PDF Parsing",
                desc: "Upload any adjuster estimate. Our AI extracts every line item, code, quantity, and price — across all major carrier formats.",
                emoji: "📄",
              },
              {
                title: "Missing Item Detection",
                desc: "Cross-references parsed scope against our database of verified Xactimate codes to flag items the adjuster missed or underpaid.",
                emoji: "🔍",
              },
              {
                title: "Waste Calculation Engine",
                desc: "Geometry-based waste calculator accounts for valleys, hips, ridges, and dormers. Most adjusters underestimate waste by 5–12%.",
                emoji: "📐",
              },
              {
                title: "Photo Analysis",
                desc: "Upload inspection photos. Our AI identifies damage types, visible components, and cross-references them to support supplement items.",
                emoji: "📷",
              },
              {
                title: "Professional PDF Output",
                desc: "Download a carrier-ready supplement with Xactimate codes, justifications, embedded photos, and IRC code references.",
                emoji: "📋",
              },
              {
                title: "Supplement Tracking",
                desc: "Track every supplement from generation to carrier submission. See status updates, results, and total recovery across all claims.",
                emoji: "📊",
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

      {/* ───── ROI / Social Proof ───── */}
      <section className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="rounded-2xl border border-[#39FF9E]/10 bg-gradient-to-br from-[#00BFFF]/5 via-transparent to-[#39FF9E]/5 p-10 sm:p-16">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                The math is simple.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-gray-400">
                One supplement pays for itself 20x over. Stop giving money back to insurance companies.
              </p>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  value: "$149",
                  label: "Cost per supplement",
                  sub: "Pay only when you use it",
                  color: "#00BFFF",
                },
                {
                  value: "$4,200",
                  label: "Avg. additional recovery",
                  sub: "Found on every claim analyzed",
                  color: "#39FF9E",
                },
                {
                  value: "28x",
                  label: "Return on investment",
                  sub: "Per supplement generated",
                  color: "#00BFFF",
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-extrabold sm:text-4xl" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="mt-2 font-semibold text-white">{s.label}</div>
                  <div className="mt-1 text-sm text-gray-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Competitive Edge ───── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Why 4Margin</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your adjuster uses Xactimate. So do we.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Except we actually check their work.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Not a template library",
                desc: "Template tools give you a starting point — you still do the analysis. 4Margin analyzes the actual adjuster scope and tells you exactly what's missing.",
              },
              {
                title: "Not a $425/supplement service",
                desc: "Human supplement services charge $300–$500 and take 3–5 days. We deliver in minutes for $149 — and the AI catches things humans miss.",
              },
              {
                title: "Built by a roofer, not a tech company",
                desc: "We understand the frustration of underpaid claims because we've lived it. Every feature was designed around how contractors actually work.",
              },
              {
                title: "Carrier-ready output",
                desc: "Professional PDF supplements with Xactimate codes, IRC references, photo evidence, and written justifications that adjusters take seriously.",
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
      <section id="pricing" className="border-t border-white/5 bg-[#080D18]">
        <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <SectionTag>Simple Pricing</SectionTag>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              One supplement. One price.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-gray-400">
              No subscriptions required. Pay per supplement. Average recovery is
              $4,200 — that&apos;s a 28x return on every $149.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-[#00BFFF]/20 bg-gradient-to-b from-[#00BFFF]/5 to-transparent p-8 text-center sm:p-12">
            <div className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
              $149
            </div>
            <div className="mt-2 text-gray-400">per supplement</div>

            <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm">
              {[
                "AI-powered scope analysis",
                "Missing item detection with Xactimate codes",
                "Geometry-based waste calculation",
                "Photo analysis & cross-referencing",
                "Professional PDF supplement download",
                "Written justifications & IRC code references",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#39FF9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-10 inline-block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#00A8E0] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30"
            >
              Get Started — First Supplement Free
            </Link>
            <p className="mt-4 text-xs text-gray-500">
              No credit card required to sign up.
            </p>
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to recover what you&apos;re owed?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
            Upload your first adjuster estimate and see what the AI finds. No credit card. No commitment.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#39FF9E] px-10 py-4 text-base font-bold text-white shadow-lg shadow-[#00BFFF]/25 transition hover:shadow-xl hover:shadow-[#00BFFF]/30"
          >
            Start Your First Supplement Free
          </Link>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/5 bg-[#060A13]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <Logo />
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#how-it-works" className="transition hover:text-gray-300">
              How It Works
            </a>
            <a href="#features" className="transition hover:text-gray-300">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-gray-300">
              Pricing
            </a>
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
