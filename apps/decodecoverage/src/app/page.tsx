import { HeroUpload } from "@/components/hero-upload";
import { FaqAccordion } from "@/components/faq-accordion";
import { PoliciesCounter } from "@/components/policies-counter";
import {
  Upload,
  Search,
  BarChart3,
  Shield,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
          <a href="#upload" className="nav-cta">
            Get My Free Report
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="upload">
        <div className="hero-badge fade-up">
          <Shield size={14} />
          <PoliciesCounter />
        </div>

        <h1 className="fade-up delay-1">
          Your Insurance Policy Is<br />
          Hiding Something.<br />
          <em>We&apos;ll Show You What.</em>
        </h1>
        <p className="fade-up delay-2">
          Get a free Coverage Health Score in 60 seconds. Our AI decodes every
          page and shows you exactly what you&apos;re covered for, what
          you&apos;re not, and what it could cost you.
        </p>

        <div className="trust-bar-inline fade-up delay-2">
          <span>&#10003; No phone number required</span>
          <span>&#10003; No agent calls</span>
          <span>&#10003; 100% free</span>
          <span>&#10003; Results in 60 seconds</span>
        </div>

        <div className="fade-up delay-3">
          <HeroUpload />
        </div>

        {/* Social proof stats */}
        <div className="hero-stats fade-up delay-4">
          <div className="hero-stat">
            <div className="num">73%</div>
            <div className="label">Have coverage gaps</div>
          </div>
          <div className="hero-stat">
            <div className="num">$487</div>
            <div className="label">Avg. savings found</div>
          </div>
          <div className="hero-stat">
            <div className="num">60s</div>
            <div className="label">To get your report</div>
          </div>
        </div>
      </section>

      {/* WHY 73% HAVE GAPS */}
      <section className="why-gaps-section">
        <div className="section-label">The Problem</div>
        <h2>Why 73% of Homeowners Have Gaps They Don&apos;t Know About</h2>
        <p className="why-gaps-body">
          Home insurance policies are designed to be confusing. Wind/hail
          deductibles hidden on page 23. Dwelling coverage that hasn&apos;t kept
          up with construction costs. Exclusions buried in legal jargon. Your
          insurance company isn&apos;t going to call you and point this out. We
          will.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="section-label">How It Works</div>
        <h2>Three steps to clarity</h2>
        <div className="steps">
          <div className="step">
            <div className="step-icon">
              <Upload size={20} />
            </div>
            <div className="step-num">01</div>
            <h3>Enter your email</h3>
            <p>
              Tell us where to send your report. Then upload your policy PDF
              or answer 5 quick questions — your choice.
            </p>
          </div>
          <div className="step">
            <div className="step-icon">
              <BarChart3 size={20} />
            </div>
            <div className="step-num">02</div>
            <h3>Get your Coverage Health Score</h3>
            <p>
              See a clear green/yellow/red rating on your overall protection. No
              jargon, no legalese, no fine print.
            </p>
          </div>
          <div className="step">
            <div className="step-icon">
              <Search size={20} />
            </div>
            <div className="step-num">03</div>
            <h3>Unlock your full report</h3>
            <p>
              See every finding in plain English. Download your report, or
              get connected with a licensed advisor who can help fix the gaps.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-label">FAQ</div>
        <h2>Common questions</h2>
        <FaqAccordion />
      </section>

      {/* BOTTOM CTA */}
      <section className="bottom-cta">
        <Shield size={40} style={{ color: "var(--accent)", marginBottom: 16 }} />
        <h2>Still not sure?</h2>
        <p>
          Take 60 seconds. If we don&apos;t find anything, you&apos;ll sleep
          better tonight knowing you&apos;re covered. If we do, you just saved
          yourself thousands.
        </p>
        <a href="#upload" className="bottom-cta-btn">
          Get My Free Report
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-copy">
            &copy; 2026 DecodeCoverage. Not a licensed insurance broker or
            agent. Powered by{" "}
            <a
              href="https://4margin.com"
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              4Margin
            </a>
          </div>
          <div className="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="mailto:support@decodecoverage.com">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}
