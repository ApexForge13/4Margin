import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DecodeCoverage",
  description:
    "How DecodeCoverage collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
          <a href="/#upload" className="nav-cta">
            Upload My Policy
          </a>
        </div>
      </nav>

      <main className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 10, 2026</p>

        <section>
          <h2>Who We Are</h2>
          <p>
            DecodeCoverage is a free homeowner-facing insurance policy decoder
            operated by 4Margin, LLC. We help homeowners understand their
            insurance coverage through AI-powered analysis.
          </p>
        </section>

        <section>
          <h2>Information We Collect</h2>
          <h3>Information You Provide</h3>
          <ul>
            <li>
              <strong>Policy Documents:</strong> Insurance policy PDFs you upload
              for analysis.
            </li>
            <li>
              <strong>Contact Information:</strong> Name, email address, and
              phone number (if you choose to connect with an advisor).
            </li>
            <li>
              <strong>Contact Preferences:</strong> Preferred contact method and
              best time to reach you.
            </li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <ul>
            <li>
              <strong>Usage Data:</strong> Pages visited, features used, and
              interaction patterns (via Google Analytics).
            </li>
            <li>
              <strong>Advertising Data:</strong> Conversion tracking for
              advertising campaigns (via Meta Pixel).
            </li>
          </ul>
        </section>

        <section>
          <h2>How We Use Your Information</h2>
          <ul>
            <li>
              <strong>Policy Analysis:</strong> Your uploaded policy PDF is
              processed by our AI system (powered by Anthropic&apos;s Claude) to
              generate your personalized coverage report.
            </li>
            <li>
              <strong>Advisor Connection:</strong> If you opt in, we share your
              contact information with licensed, independent insurance advisors
              who can help address coverage gaps.
            </li>
            <li>
              <strong>Email Communication:</strong> We send your coverage report
              via email (powered by Resend). We do not send marketing emails
              unless you opt in.
            </li>
            <li>
              <strong>Service Improvement:</strong> Aggregated, anonymized data
              helps us improve our analysis accuracy.
            </li>
          </ul>
        </section>

        <section>
          <h2>Data Storage &amp; Security</h2>
          <p>
            Your data is stored securely using Supabase (hosted on AWS).
            Uploaded policy PDFs are stored in encrypted cloud storage. We use
            industry-standard security measures including encryption in transit
            (TLS) and at rest.
          </p>
        </section>

        <section>
          <h2>Third-Party Services</h2>
          <p>We use the following third-party services to operate DecodeCoverage:</p>
          <ul>
            <li>
              <strong>Anthropic (Claude AI):</strong> Processes your policy
              documents for analysis. Policy content is sent to Anthropic&apos;s
              API for processing and is subject to{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anthropic&apos;s Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong>Resend:</strong> Delivers email reports.
            </li>
            <li>
              <strong>Google Analytics:</strong> Tracks website usage patterns.
            </li>
            <li>
              <strong>Meta Pixel:</strong> Tracks advertising conversions.
            </li>
            <li>
              <strong>Vercel:</strong> Hosts our application.
            </li>
            <li>
              <strong>Supabase:</strong> Stores application data and uploaded
              files.
            </li>
          </ul>
        </section>

        <section>
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Request a copy of the personal data we hold about you.</li>
            <li>
              Request deletion of your data, including uploaded policy documents
              and analysis results.
            </li>
            <li>
              Opt out of advisor contact at any time by emailing us.
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:support@decodecoverage.com">
              support@decodecoverage.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>
            We retain your policy analysis and contact information for up to 12
            months. Uploaded PDF files are retained for 90 days to support
            re-download of your report, then automatically deleted.
          </p>
        </section>

        <section>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            Questions about this Privacy Policy? Email us at{" "}
            <a href="mailto:support@decodecoverage.com">
              support@decodecoverage.com
            </a>
          </p>
        </section>

        <p className="legal-branding">
          Powered by{" "}
          <a href="https://4margin.com">4Margin</a>
        </p>
      </main>

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
