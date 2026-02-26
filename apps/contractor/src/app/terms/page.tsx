import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — 4Margin",
  description: "Terms of Service for the 4Margin supplement engine platform.",
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

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: February 23, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using the 4Margin platform (&quot;Service&quot;), you agree
              to be bound by these Terms of Service (&quot;Terms&quot;). If you do not
              agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">2. Description of Service</h2>
            <p className="mt-2">
              4Margin provides an AI-powered insurance supplement generation tool for
              roofing contractors. The Service analyzes adjuster Xactimate estimates,
              identifies potentially missing or underpaid line items, and generates
              professional supplement documents. The Service is a tool to assist
              contractors and does not guarantee any particular outcome with insurance
              carriers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">3. Account Registration</h2>
            <p className="mt-2">
              You must provide accurate, complete, and current information when creating
              an account. You are responsible for maintaining the confidentiality of
              your account credentials and for all activity that occurs under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">4. Fees and Payment</h2>
            <p className="mt-2">
              The Service operates on a per-supplement pricing model. Your first
              supplement is free. Subsequent supplements are charged at the rate
              displayed at the time of purchase. All payments are processed through
              Stripe. Fees are non-refundable except as required by law or at our sole
              discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">5. Acceptable Use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-400">
              <li>Use the Service for any unlawful purpose or to submit fraudulent claims</li>
              <li>Upload files containing malware, viruses, or harmful code</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Resell, redistribute, or sublicense access to the Service without authorization</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">6. Your Data</h2>
            <p className="mt-2">
              You retain ownership of all data you upload to the Service, including
              estimate PDFs, inspection photos, and measurement reports. By uploading
              data, you grant 4Margin a limited license to process your data solely for
              the purpose of providing the Service. We may use anonymized and
              aggregated data to improve the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">7. AI-Generated Content</h2>
            <p className="mt-2">
              Supplement documents generated by the Service are produced using
              artificial intelligence. While we strive for accuracy, AI-generated
              content may contain errors. You are responsible for reviewing all
              generated supplements before submission to insurance carriers. 4Margin
              does not guarantee the accuracy, completeness, or success of any
              supplement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">8. Disclaimer of Warranties</h2>
            <p className="mt-2">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
              WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 4MARGIN DOES
              NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT
              ANY SUPPLEMENT WILL RESULT IN INSURANCE APPROVAL OR PAYMENT.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">9. Limitation of Liability</h2>
            <p className="mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, 4MARGIN SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT
              OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT
              EXCEED THE AMOUNT YOU PAID TO 4MARGIN IN THE TWELVE MONTHS PRECEDING THE
              CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">10. Indemnification</h2>
            <p className="mt-2">
              You agree to indemnify and hold harmless 4Margin, its officers,
              directors, employees, and agents from any claims, liabilities, damages,
              losses, or expenses arising from your use of the Service, your violation
              of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">11. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate your access to the Service at any time, with
              or without cause. Upon termination, your right to use the Service ceases
              immediately. You may export your data prior to account termination by
              downloading your generated supplements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">12. Changes to Terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. We will notify you of
              material changes by posting the updated Terms on the Service. Your
              continued use of the Service after changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">13. Governing Law</h2>
            <p className="mt-2">
              These Terms shall be governed by and construed in accordance with the
              laws of the State of Texas, without regard to its conflict of law
              provisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">14. Contact</h2>
            <p className="mt-2">
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:support@4margin.com"
                className="text-[#00BFFF] underline underline-offset-2 hover:text-[#00A8E0]"
              >
                support@4margin.com
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
            <Link href="/terms" className="text-gray-300">Terms</Link>
            <Link href="/privacy" className="transition hover:text-gray-300">Privacy</Link>
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
