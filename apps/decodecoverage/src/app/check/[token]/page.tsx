import { createAdminClient } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import { CheckForm } from "@/components/check-form";

export const dynamic = "force-dynamic";

export default async function CheckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  // Fetch the policy check by token
  const { data: check } = await supabase
    .from("policy_checks")
    .select(
      "id, token, status, expires_at, claim_type, homeowner_first_name, homeowner_last_name, homeowner_email, company_id, payment_status"
    )
    .eq("token", token)
    .single();

  if (!check) notFound();

  // Check payment status
  if (check.payment_status === "unpaid") {
    return (
      <div className="results-page">
        <nav>
          <div className="nav-inner">
            <a href="/" className="logo">
              Decode<span>Coverage</span>
            </a>
          </div>
        </nav>
        <div className="results-header">
          <h1>Link Not Yet Active</h1>
          <p>
            This policy check link hasn&apos;t been activated yet. Please
            contact your contractor for an updated link.
          </p>
        </div>
      </div>
    );
  }

  // Check expiration
  if (new Date(check.expires_at) < new Date() || check.status === "expired") {
    return (
      <div className="results-page">
        <nav>
          <div className="nav-inner">
            <a href="/" className="logo">
              Decode<span>Coverage</span>
            </a>
          </div>
        </nav>
        <div className="results-header">
          <h1>Link Expired</h1>
          <p>
            This policy check link has expired. Please contact your contractor
            for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Already complete — redirect to results
  if (check.status === "complete" || check.status === "processing") {
    redirect(`/check/${token}/results`);
  }

  // Mark as opened if still pending
  if (check.status === "pending") {
    await supabase
      .from("policy_checks")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", check.id);
  }

  // Fetch company name for branding
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", check.company_id)
    .single();

  return (
    <div className="results-page">
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
        </div>
      </nav>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 20px" }}>
        {company && (
          <div
            style={{
              textAlign: "center",
              padding: "12px 20px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              marginBottom: 24,
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            Requested by <strong>{company.name}</strong>
          </div>
        )}
        <CheckForm
          token={check.token}
          prefill={{
            firstName: check.homeowner_first_name || "",
            lastName: check.homeowner_last_name || "",
            claimType: check.claim_type || "",
          }}
        />
      </div>
    </div>
  );
}
