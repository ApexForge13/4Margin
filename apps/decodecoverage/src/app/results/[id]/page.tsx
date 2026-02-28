import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ResultsDisplay } from "@/components/results/results-display";
import { ProcessingView } from "@/components/results/processing-view";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("consumer_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) notFound();

  if (lead.status === "processing") {
    return <ProcessingView id={id} />;
  }

  if (lead.status === "failed") {
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
            {lead.error_message ||
              "Something went wrong analyzing your policy. Please try again."}
          </p>
        </div>
        <div style={{ marginTop: 24 }}>
          <a
            href="/#scan"
            className="btn btn-primary"
            style={{ display: "inline-flex", width: "auto", padding: "12px 32px" }}
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <ResultsDisplay
      id={id}
      firstName={lead.first_name}
      analysis={lead.policy_analysis}
      documentMeta={lead.document_meta}
      consentContact={lead.consent_contact ?? false}
    />
  );
}
