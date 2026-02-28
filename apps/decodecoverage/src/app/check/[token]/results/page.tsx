import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ResultsDisplay } from "@/components/results/results-display";
import { ProcessingView } from "@/components/results/processing-view";

export const dynamic = "force-dynamic";

export default async function CheckResultsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: check } = await supabase
    .from("policy_checks")
    .select("id, token, status, error_message, homeowner_first_name, policy_analysis, document_meta, company_id")
    .eq("token", token)
    .single();

  if (!check) notFound();

  if (check.status === "processing") {
    return <ProcessingView id={check.token} checkMode />;
  }

  if (check.status === "failed") {
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
          <h1>Analysis Failed</h1>
          <p>
            {check.error_message ||
              "Something went wrong analyzing your policy. Please try again."}
          </p>
        </div>
        <div style={{ marginTop: 24 }}>
          <a
            href={`/check/${token}`}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              width: "auto",
              padding: "12px 32px",
            }}
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Get company name for branding
  let companyName = "";
  if (check.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", check.company_id)
      .single();
    companyName = company?.name || "";
  }

  return (
    <ResultsDisplay
      id={check.id}
      firstName={check.homeowner_first_name || ""}
      analysis={check.policy_analysis}
      documentMeta={check.document_meta}
      consentContact={false}
      context="contractor-check"
      companyName={companyName}
      downloadUrl={`/api/check/${token}/download`}
    />
  );
}
