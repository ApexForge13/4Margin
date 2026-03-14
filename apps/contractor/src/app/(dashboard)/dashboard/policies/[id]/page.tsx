import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { getPolicyDecoding } from "../../policy-decoder/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DECODER_STATUS_LABELS } from "@/lib/constants";
import { DecoderFlow } from "@/components/policy-decoder/decoder-flow";
import { shouldBypassPayment, recordUsage } from "@/lib/billing";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string; session_id?: string }>;
}

export default async function PolicyDetailPage({
  params,
  searchParams,
}: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { payment, session_id } = await searchParams;
  let { decoding, error } = await getPolicyDecoding(id);

  if (error || !decoding) {
    notFound();
  }

  // ── Handle Stripe webhook race / failure ────────────────────────────
  if (!decoding.paid_at) {
    const sessionIdToVerify =
      session_id || decoding.stripe_checkout_session_id;

    if (sessionIdToVerify) {
      try {
        const session =
          await stripe.checkout.sessions.retrieve(sessionIdToVerify);

        if (
          session.payment_status === "paid" &&
          session.metadata?.policyDecodingId === decoding.id
        ) {
          const admin = createAdminClient();
          await admin
            .from("policy_decodings")
            .update({
              paid_at: new Date().toISOString(),
              stripe_payment_id: (session.payment_intent as string) || null,
              stripe_checkout_session_id: session.id,
            })
            .eq("id", decoding.id);

          const refreshed = await getPolicyDecoding(id);
          if (refreshed.decoding) {
            decoding = refreshed.decoding;
          }
        }
      } catch (err) {
        console.error("[policies] Failed to verify Stripe session:", err);
      }
    }
  }

  // ── Determine isFirstDecode + enterprise status ─────────────
  let isFirstDecode = true;
  let isEnterprise = false;

  try {
    const admin = createAdminClient();
    const { data: userProfile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (userProfile?.company_id) {
      const { count: priorPaidCount } = await admin
        .from("policy_decodings")
        .select("id", { count: "exact", head: true })
        .eq("company_id", userProfile.company_id)
        .not("paid_at", "is", null);
      isFirstDecode = (priorPaidCount ?? 0) === 0;

      try {
        isEnterprise = await shouldBypassPayment(userProfile.company_id);
      } catch {
        // Enterprise billing not yet configured
      }

      // Enterprise auto-pay
      if (isEnterprise && !decoding.paid_at && decoding.policy_pdf_url) {
        await admin
          .from("policy_decodings")
          .update({ paid_at: new Date().toISOString() })
          .eq("id", decoding.id);

        try {
          const { data: userWithOffice } = await admin
            .from("users")
            .select("office_id")
            .eq("id", user.id)
            .single();

          await recordUsage(
            userProfile.company_id,
            user.id,
            userWithOffice?.office_id || null,
            "decode",
            decoding.id
          );
        } catch {
          console.error("[policies] Failed to record enterprise usage");
        }

        const refreshed = await getPolicyDecoding(id);
        if (refreshed.decoding) {
          decoding = refreshed.decoding;
        }
      }
    }
  } catch (err) {
    console.error("[policies] Error in enterprise/billing check:", err);
  }

  // ── Fetch linked job data (for address display + prefill) ──────
  let jobAddress: string | null = null;
  let jobPrefill: {
    carrierName?: string;
    claimNumber?: string;
    dateOfLoss?: string;
    homeownerName?: string;
  } | null = null;

  if (decoding.job_id) {
    try {
      const adminForJob = createAdminClient();
      const { data: job } = await adminForJob
        .from("jobs")
        .select("property_address, homeowner_name, insurance_data")
        .eq("id", decoding.job_id)
        .single();

      if (job) {
        jobAddress = job.property_address || null;
        const ins = job.insurance_data as Record<string, unknown> | null;
        if (ins || job.homeowner_name) {
          jobPrefill = {
            carrierName: (ins?.carrier_id as string) || undefined,
            claimNumber: (ins?.claim_number as string) || undefined,
            dateOfLoss: (ins?.date_of_loss as string) || undefined,
            homeownerName: (job.homeowner_name as string) || undefined,
          };
        }
      }
    } catch {
      // Non-critical
    }
  }

  // ── Compute state for DecoderFlow ──────────────────────────
  const isPaid = !!decoding.paid_at;
  const hasFile = !!decoding.policy_pdf_url;
  const isComplete = decoding.status === "complete";
  const isProcessing = decoding.status === "processing";
  const isFailed = decoding.status === "failed";

  type Phase =
    | "upload"
    | "uploading"
    | "payment"
    | "paying"
    | "processing"
    | "complete"
    | "error";

  let initialPhase: Phase;
  if (isComplete && decoding.policy_analysis) {
    initialPhase = "complete";
  } else if (isProcessing) {
    initialPhase = "processing";
  } else if (isFailed) {
    initialPhase = "upload";
  } else if (isEnterprise && hasFile) {
    initialPhase = "processing";
  } else if (hasFile && !isPaid) {
    initialPhase = "payment";
  } else if (isPaid && hasFile) {
    initialPhase = "processing";
  } else {
    initialPhase = "upload";
  }

  const autoProcess =
    isPaid &&
    hasFile &&
    !isComplete &&
    !isProcessing &&
    decoding.status === "draft";

  const statusInfo = DECODER_STATUS_LABELS[decoding.status] || {
    label: decoding.status,
    variant: "secondary" as const,
  };

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/dashboard/policies">
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
        </div>
      </div>

      {/* Payment cancelled banner */}
      {payment === "cancelled" && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          Payment was cancelled. You can try again below.
        </div>
      )}

      {/* DecoderFlow — handles upload, payment, processing, and results */}
      <DecoderFlow
        decodingId={decoding.id}
        isFirstDecode={isFirstDecode}
        initialPhase={initialPhase}
        fileName={decoding.original_filename}
        analysis={decoding.policy_analysis}
        documentMeta={decoding.document_meta}
        autoProcess={autoProcess}
        paymentReturned={payment === "success"}
        isEnterprise={isEnterprise}
        carrierNotes={decoding.carrier_notes ?? undefined}
        jobId={decoding.job_id ?? undefined}
        jobAddress={jobAddress ?? undefined}
        prefill={jobPrefill ?? undefined}
      />
    </div>
  );
}
