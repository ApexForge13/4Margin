import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPolicyCheck } from "../actions";
import { ContractorReport } from "@/components/policy-checks/contractor-report";
import { OutcomeActions } from "@/components/policy-checks/outcome-actions";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Link Sent", variant: "secondary" },
  opened: { label: "Opened", variant: "outline" },
  processing: { label: "Analyzing", variant: "secondary" },
  complete: { label: "Complete", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  wind: "Wind",
  hail: "Hail",
  fire: "Fire",
  water_flood: "Water/Flood",
  impact: "Impact",
  theft: "Theft",
  other: "Other",
};

const OUTCOME_LABELS: Record<string, string> = {
  claim_filed: "Claim Filed",
  no_claim: "No Claim Filed",
};

export default async function PolicyCheckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const check = await getPolicyCheck(id);

  if (!check) notFound();

  const status = STATUS_LABELS[check.status] || {
    label: check.status,
    variant: "secondary" as const,
  };

  const homeownerName = [check.homeowner_first_name, check.homeowner_last_name]
    .filter(Boolean)
    .join(" ") || check.homeowner_email;

  const DECODECOVERAGE_URL =
    process.env.DECODECOVERAGE_URL || "https://decodecoverage.com";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/policy-checks">
            &larr; All Policy Checks
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{homeownerName}</h2>
          <p className="text-sm text-muted-foreground">
            {check.homeowner_email}
            {check.homeowner_phone ? ` · ${check.homeowner_phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          {check.outcome && (
            <Badge variant="outline">
              {OUTCOME_LABELS[check.outcome] || check.outcome}
            </Badge>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {check.claim_type && (
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Claim Type
            </div>
            <div className="font-semibold mt-1">
              {CLAIM_TYPE_LABELS[check.claim_type] || check.claim_type}
            </div>
          </div>
        )}
        {check.carrier && (
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Carrier
            </div>
            <div className="font-semibold mt-1">{check.carrier}</div>
          </div>
        )}
        {check.homeowner_address && (
          <div className="rounded-lg border p-3 col-span-2">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Property
            </div>
            <div className="font-semibold mt-1">{check.homeowner_address}</div>
          </div>
        )}
      </div>

      {/* Status-specific content */}
      {(check.status === "pending" || check.status === "opened") && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {check.status === "pending"
              ? "Waiting for homeowner to open the link..."
              : "Homeowner has opened the link but hasn't submitted yet."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Link expires{" "}
            {new Date(check.expires_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {check.status === "processing" && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">
            Analyzing homeowner&apos;s policy... This usually takes 30-60
            seconds.
          </p>
        </div>
      )}

      {check.status === "failed" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
          <h3 className="font-semibold text-destructive mb-2">
            Analysis Failed
          </h3>
          <p className="text-sm text-muted-foreground">
            {check.policy_analysis
              ? "The analysis encountered an error."
              : "The uploaded policy could not be parsed."}
            {" "}
            The homeowner can try uploading again using the same link.
          </p>
        </div>
      )}

      {check.status === "complete" && check.policy_analysis && (
        <>
          {/* Outcome actions — only show if no outcome set yet */}
          {!check.outcome && <OutcomeActions checkId={check.id} />}

          {/* Contractor report */}
          <ContractorReport
            analysis={check.policy_analysis as unknown as Parameters<typeof ContractorReport>[0]["analysis"]}
            claimType={check.claim_type}
          />

          {/* Link to homeowner results */}
          <div className="rounded-lg border p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">
                Homeowner&apos;s Report
              </div>
              <p className="text-xs text-muted-foreground">
                View the report as the homeowner sees it (DecodeCoverage branded)
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`${DECODECOVERAGE_URL}/check/${check.token}/results`}
                target="_blank"
                rel="noopener"
              >
                View HO Report &rarr;
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
