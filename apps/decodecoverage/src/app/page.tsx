import { HeroUpload } from "@/components/hero-upload";
import { FaqAccordion } from "@/components/faq-accordion";
import {
  Upload,
  Search,
  BarChart3,
  ArrowRight,
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
            Upload My Policy
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="upload">
        <h1 className="fade-up">
          Your Insurance Policy Is<br />
          Hiding Something.<br />
          <em>We&apos;ll Show You What.</em>
        </h1>
        <p className="fade-up delay-1">
          Upload your homeowners policy. Our AI decodes every page in 60 seconds
          and shows you exactly what you&apos;re covered for, what you&apos;re
          not, and what it could cost you. Free. No calls unless you want them.
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
        <h2>Four steps to clarity</h2>
        <div className="steps">
          <div className="step">
            <div className="step-icon">
              <Upload size={20} />
            </div>
            <div className="step-num">01</div>
            <h3>Upload your policy</h3>
            <p>
              Drop in your PDF or snap a photo of your declarations page. Our AI
              reads every page instantly. Takes about 60 seconds.
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
            <h3>See exactly where you stand</h3>
            <p>
              Get specific findings in plain English: what you&apos;re covered
              for, what you&apos;re not, and exactly what it would cost you if
              something happened.
            </p>
          </div>
          <div className="step">
            <div className="step-icon">
              <ArrowRight size={20} />
            </div>
            <div className="step-num">04</div>
            <h3>Take action (or don&apos;t)</h3>
            <p>
              Download your free report and take it to your current agent, or let
              us connect you with someone who can help. Your choice. Zero
              pressure.
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
          Upload My Policy Free
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
