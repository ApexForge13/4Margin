import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — 4Margin",
  description: "Privacy Policy for the 4Margin supplement engine platform.",
};

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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#060A13] text-white antialiased">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#060A13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[#00BFFF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#00BFFF]/20 transition hover:bg-[#00A8E0]"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: February 23, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
            <p className="mt-2">We collect the following types of information:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-400">
              <li>
                <strong className="text-gray-300">Account information:</strong> name,
                email address, company name, phone number, and business address provided
                during registration and onboarding.
              </li>
              <li>
                <strong className="text-gray-300">Uploaded documents:</strong> adjuster
                Xactimate estimates (PDFs), inspection photos, and roof measurement
                reports that you upload to the Service.
              </li>
              <li>
                <strong className="text-gray-300">Claim information:</strong> property
                addresses, insurance carrier details, claim numbers, dates of loss, and
                damage descriptions entered into the Service.
              </li>
              <li>
                <strong className="text-gray-300">Payment information:</strong> payment
                transactions are processed by Stripe. We do not store credit card
                numbers on our servers.
              </li>
              <li>
                <strong className="text-gray-300">Usage data:</strong> pages visited,
                features used, and interaction patterns to improve the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">2. How We Use Your Information</h2>
            <p className="mt-2">We use your information to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-400">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process your uploaded documents and generate supplement reports</li>
              <li>Process payments and send transactional communications</li>
              <li>Send status updates about your supplements via email</li>
              <li>Provide customer support</li>
              <li>
                Generate anonymized, aggregated analytics to improve our AI models and
                missing item detection accuracy
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">3. AI Processing</h2>
            <p className="mt-2">
              Your uploaded documents are processed using third-party AI services
              (Anthropic Claude) to extract data, analyze content, and generate
              supplement documents. Document content is sent to these AI providers
              solely for processing and is not used by them to train their models. We
              select AI providers that offer enterprise-grade data handling and do not
              retain your data beyond the processing request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">4. Data Storage and Security</h2>
            <p className="mt-2">
              Your data is stored using Supabase (PostgreSQL database and file storage)
              with row-level security policies ensuring multi-tenant data isolation.
              Files are stored in private buckets accessible only to your account. We
              use HTTPS encryption in transit and encryption at rest for all stored
              data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">5. Data Sharing</h2>
            <p className="mt-2">
              We do not sell your personal information. We share data only with:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-400">
              <li>
                <strong className="text-gray-300">Service providers:</strong> Supabase
                (hosting/database), Stripe (payments), Anthropic (AI processing),
                Resend (email), Vercel (hosting), Sentry (error tracking), and Visual
                Crossing (weather data) — each bound by their own privacy policies.
              </li>
              <li>
                <strong className="text-gray-300">Insurance carriers:</strong> only when
                you explicitly choose to submit a supplement to a carrier through the
                Service.
              </li>
              <li>
                <strong className="text-gray-300">Legal requirements:</strong> if
                required by law, regulation, or legal process.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">6. Data Retention</h2>
            <p className="mt-2">
              We retain your account data and generated supplements for as long as your
              account is active. Uploaded documents (PDFs, photos) are retained for 90
              days after supplement generation to allow for re-downloads, then
              automatically deleted. You may request deletion of your data at any time
              by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">7. Your Rights</h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-400">
              <li>Access and download your data, including generated supplements</li>
              <li>Request correction of inaccurate account information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:privacy@4margin.com"
                className="text-[#00BFFF] underline underline-offset-2 hover:text-[#00A8E0]"
              >
                privacy@4margin.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">8. Cookies and Analytics</h2>
            <p className="mt-2">
              We use essential cookies for authentication and session management. We
              use PostHog for product analytics to understand how the Service is used.
              You may disable non-essential cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">9. Children&apos;s Privacy</h2>
            <p className="mt-2">
              The Service is not intended for use by individuals under the age of 18.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">10. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will notify you
              of material changes by email or through a notice on the Service. Your
              continued use of the Service after changes constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">11. Contact</h2>
            <p className="mt-2">
              For privacy-related inquiries, contact us at{" "}
              <a
                href="mailto:privacy@4margin.com"
                className="text-[#00BFFF] underline underline-offset-2 hover:text-[#00A8E0]"
              >
                privacy@4margin.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#060A13]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <Logo />
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/terms" className="transition hover:text-gray-300">Terms</Link>
            <Link href="/privacy" className="text-gray-300">Privacy</Link>
            <Link href="/login" className="transition hover:text-gray-300">Sign In</Link>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} 4Margin. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
