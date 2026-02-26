import { ScanForm } from "@/components/scan-form";
import {
  Upload,
  Search,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Home,
  Shield,
  Lock,
  Clock,
  Zap,
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
          <a href="#scan" className="nav-cta">
            Get Free Scan
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="fade-up">
          <div className="hero-badge">
            <Zap size={14} />
            AI-Powered &middot; Results in 60 Seconds
          </div>
        </div>
        <h1 className="fade-up delay-1">
          Is your home <em>actually</em> covered?
        </h1>
        <p className="fade-up delay-2">
          Upload your homeowners insurance policy and our AI instantly decodes
          your coverage, finds gaps, and uncovers savings. Completely free.
        </p>
        <div className="fade-up delay-3">
          <a
            href="#scan"
            style={{
              display: "inline-flex",
              padding: "16px 40px",
              borderRadius: 100,
              background: "var(--accent)",
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
              gap: 8,
              transition: "all 0.2s",
              alignItems: "center",
            }}
          >
            Scan My Policy Free
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
        </div>
        <div className="hero-stats fade-up delay-4">
          <div className="hero-stat">
            <div className="num">73%</div>
            <div className="label">Have coverage gaps</div>
          </div>
          <div className="hero-stat">
            <div className="num">$487</div>
            <div className="label">Avg. annual savings</div>
          </div>
          <div className="hero-stat">
            <div className="num">60s</div>
            <div className="label">Scan time</div>
          </div>
        </div>
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
            <h3>Upload your policy</h3>
            <p>
              Drop your declarations page or full policy PDF. Our AI reads it
              instantly — no waiting, no phone calls.
            </p>
          </div>
          <div className="step">
            <div className="step-icon">
              <Search size={20} />
            </div>
            <div className="step-num">02</div>
            <h3>AI decodes everything</h3>
            <p>
              We translate insurance jargon into plain English and flag what
              matters — gaps, overpayments, and risks.
            </p>
          </div>
          <div className="step">
            <div className="step-icon">
              <CheckCircle size={20} />
            </div>
            <div className="step-num">03</div>
            <h3>Get your results</h3>
            <p>
              Receive your Policy Health Score with clear recommendations you can
              act on immediately.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT WE FIND */}
      <section className="findings">
        <div className="findings-inner">
          <div className="section-label">What We Uncover</div>
          <h2>
            Most homeowners don&apos;t know what&apos;s hiding in their policy
          </h2>
          <div className="findings-grid">
            <div className="finding-card">
              <div className="finding-icon gap">
                <AlertTriangle size={22} />
              </div>
              <h3>Coverage Gaps</h3>
              <p>
                Water backup, mold, sewer line, foundation — the things that
                actually happen and aren&apos;t covered by default.
              </p>
              <span className="tag gap-tag">Common Risk</span>
            </div>
            <div className="finding-card">
              <div className="finding-icon save">
                <DollarSign size={22} />
              </div>
              <h3>Overpayments</h3>
              <p>
                Duplicate coverages, inflated replacement costs, unused riders
                you&apos;re paying for every month.
              </p>
              <span className="tag save-tag">Savings Found</span>
            </div>
            <div className="finding-card">
              <div className="finding-icon gap">
                <Home size={22} />
              </div>
              <h3>Underinsured Dwelling</h3>
              <p>
                Rebuilding costs have surged. If your coverage limit hasn&apos;t
                kept up, you&apos;d be paying out of pocket after a total loss.
              </p>
              <span className="tag gap-tag">High Impact</span>
            </div>
            <div className="finding-card">
              <div className="finding-icon save">
                <Shield size={22} />
              </div>
              <h3>Deductible Optimization</h3>
              <p>
                Your deductible may be costing you more in premiums than it
                would ever save in a claim. We&apos;ll show you the math.
              </p>
              <span className="tag save-tag">Quick Win</span>
            </div>
          </div>
        </div>
      </section>

      {/* SCAN FORM */}
      <section className="form-section" id="scan">
        <div className="form-wrapper">
          <h2>Get your free scan</h2>
          <p>Takes 30 seconds. No credit card. No commitment.</p>
          <ScanForm />
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="trust-bar">
        <div className="trust-inner">
          <div className="trust-item">
            <Lock size={20} />
            256-bit encryption
          </div>
          <div className="trust-item">
            <Shield size={20} />
            Data never sold without consent
          </div>
          <div className="trust-item">
            <Clock size={20} />
            Results in under 60 seconds
          </div>
          <div className="trust-item">
            <CheckCircle size={20} />
            100% free, no credit card
          </div>
        </div>
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
