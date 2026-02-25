import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPolicyDecoding } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DECODER_STATUS_LABELS } from "@/lib/constants";
import { PolicyUpload } from "@/components/policy-decoder/policy-upload";
import { PolicyDecoderResults } from "@/components/policy-decoder/decoder-results";
import { AutoRefresh } from "@/components/supplements/auto-refresh";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}

export default async function PolicyDecodingDetailPage({
  params,
  searchParams,
}: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { payment } = await searchParams;
  const { decoding, error } = await getPolicyDecoding(id);

  if (error || !decoding) {
    notFound();
  }

  const statusInfo = DECODER_STATUS_LABELS[decoding.status] || {
    label: decoding.status,
    variant: "secondary" as const,
  };

  const isPaid = !!decoding.paid_at;
  const hasFile = !!decoding.policy_pdf_url;
  const isComplete = decoding.status === "complete";
  const isProcessing = decoding.status === "processing";
  const isFailed = decoding.status === "failed";
  const needsUpload = isPaid && !hasFile && !isComplete && !isProcessing;

  return (
    <div className="space-y-6">
      {/* Auto-refresh while processing */}
      {isProcessing && <AutoRefresh status="generating" />}

      {/* Back button + header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/dashboard/policy-decoder">
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                Policy Decode
              </h2>
              <Badge
                variant={
                  isComplete || isFailed ? "default" : statusInfo.variant
                }
                className={
                  isComplete
                    ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
                    : isFailed
                      ? "bg-red-500 text-white hover:bg-red-600 border-red-500"
                      : ""
                }
              >
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {decoding.original_filename || "Policy document"}
              {" · "}
              {new Date(decoding.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Download PDF button — only when complete */}
          {isComplete && decoding.policy_analysis && (
            <Button variant="outline" asChild>
              <a
                href={`/api/policy-decoder/${decoding.id}/download`}
                download
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Payment success banner */}
      {payment === "success" && needsUpload && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Payment confirmed! Upload your policy document below to get started.
        </div>
      )}

      {/* Payment cancelled banner */}
      {payment === "cancelled" && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          Payment was cancelled. You can try again from the Policy Decoder list.
        </div>
      )}

      {/* Upload area — shown when paid but no file yet */}
      {needsUpload && <PolicyUpload decodingId={decoding.id} />}

      {/* Processing state */}
      {isProcessing && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-8 text-center">
          <div className="mx-auto flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-blue-900">
              Decoding your policy...
            </h3>
            <p className="text-sm text-blue-700">
              Our AI is analyzing coverages, deductibles, endorsements, and
              exclusions. This typically takes 30-60 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto flex flex-col items-center gap-3">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-900">
              Decoding failed
            </h3>
            <p className="text-sm text-red-700">
              There was an issue processing your policy. Please try uploading
              again or contact support.
            </p>
          </div>
        </div>
      )}

      {/* Results — shown when complete */}
      {isComplete && decoding.policy_analysis && (
        <PolicyDecoderResults
          analysis={decoding.policy_analysis}
          documentMeta={decoding.document_meta}
        />
      )}
    </div>
  );
}
