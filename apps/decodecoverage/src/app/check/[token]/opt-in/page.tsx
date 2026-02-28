import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { calculatePolicyScore } from "@/lib/policy-score";
import { OptInForm } from "./opt-in-form";

export const dynamic = "force-dynamic";

export default async function OptInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: check } = await supabase
    .from("policy_checks")
    .select(
      "id, token, concierge_status, homeowner_first_name, policy_analysis"
    )
    .eq("token", token)
    .single();

  if (!check) notFound();

  // Already responded
  if (check.concierge_status === "opted_in") {
    return (
      <div className="results-page">
        <nav>
          <div className="nav-inner">
            <a href="/" className="logo">
              Decode<span>Coverage</span>
            </a>
          </div>
        </nav>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>You&apos;re All Set</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            A licensed insurance professional will reach out to review your
            options. There&apos;s no cost and no obligation.
          </p>
        </div>
      </div>
    );
  }

  if (check.concierge_status === "opted_out") {
    return (
      <div className="results-page">
        <nav>
          <div className="nav-inner">
            <a href="/" className="logo">
              Decode<span>Coverage</span>
            </a>
          </div>
        </nav>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px 40px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>No Problem</h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            We won&apos;t reach out. If you change your mind, you can always come
            back to this page.
          </p>
        </div>
      </div>
    );
  }

  if (check.concierge_status !== "email_sent") {
    notFound();
  }

  // Compute score for display
  let grade = "D";
  let headline = "Your policy has coverage issues";
  if (check.policy_analysis) {
    const scoreResult = calculatePolicyScore(
      check.policy_analysis as Parameters<typeof calculatePolicyScore>[0]
    );
    grade = scoreResult.grade;
    headline = scoreResult.headline;
  }

  const gradeColor =
    grade === "F" ? "#DC2626" : grade === "D" ? "#EA580C" : "#D97706";

  return (
    <div className="results-page">
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
        </div>
      </nav>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `${gradeColor}15`,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 700, color: gradeColor }}>
              {grade}
            </span>
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>
            {headline}
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Hi {check.homeowner_first_name || "there"}, your recent policy
            analysis found significant gaps in your homeowners insurance.
          </p>
        </div>

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>
            Free Expert Review
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: 16,
              fontSize: 15,
            }}
          >
            A licensed insurance professional can review your policy and help you
            find better coverage — often at a similar or lower premium. This
            review is completely free and there&apos;s no obligation.
          </p>
          <ul
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.8,
              paddingLeft: 20,
              fontSize: 15,
            }}
          >
            <li>Compare options from top-rated carriers</li>
            <li>Close the coverage gaps found in your analysis</li>
            <li>Potentially lower your premium</li>
          </ul>
        </div>

        <OptInForm token={token} />

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-muted)",
            marginTop: 24,
            lineHeight: 1.5,
          }}
        >
          We&apos;ll only share your information with a licensed professional if
          you opt in. Your data is never sold without your explicit consent.
        </p>
      </div>
    </div>
  );
}
