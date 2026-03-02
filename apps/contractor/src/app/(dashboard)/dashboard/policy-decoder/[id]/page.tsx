import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { getPolicyDecoding } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DECODER_STATUS_LABELS } from "@/lib/constants";
import { DecoderFlow } from "@/components/policy-decoder/decoder-flow";

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
  let { decoding, error } = await getPolicyDecoding(id);

  if (error || !decoding) {
    notFound();
  }

  // ── Handle Stripe webhook race / failure ────────────────────────────
  // The webhook that sets paid_at may not have fired yet (race condition)
  // or may have failed entirely. If paid_at is null but a checkout session
  // exists, verify with Stripe directly and set paid_at if payment succeeded.
  if (!decoding.paid_at && decoding.stripe_checkout_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        decoding.stripe_checkout_session_id
      );

      if (session.payment_status === "paid") {
        const admin = createAdminClient();
        await admin
          .from("policy_decodings")
          .update({
            paid_at: new Date().toISOString(),
            stripe_payment_id: (session.payment_intent as string) || null,
          })
          .eq("id", decoding.id);

        // Re-fetch so the rest of the page renders correctly
        const refreshed = await getPolicyDecoding(id);
        if (refreshed.decoding) {
          decoding = refreshed.decoding;
        }
      }
    } catch {
      // Stripe call failed — continue with unpaid state
      console.error("[policy-decoder] Failed to verify Stripe session");
    }
  }

  // ── Determine isFirstDecode ─────────────────────────────────
  const admin = createAdminClient();
  const { data: userProfile } = await admin
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  let isFirstDecode = true;
  if (userProfile?.company_id) {
    const { count: priorPaidCount } = await admin
      .from("policy_decodings")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userProfile.company_id)
      .not("paid_at", "is", null);
    isFirstDecode = (priorPaidCount ?? 0) === 0;
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
    initialPhase = "upload"; // allow retry
  } else if (hasFile && !isPaid) {
    initialPhase = "payment"; // has file, needs to pay
  } else if (isPaid && hasFile) {
    initialPhase = "processing"; // paid + file = ready to process
  } else {
    initialPhase = "upload"; // starting state
  }

  // Auto-process: paid + has file + still in draft state + returning from Stripe
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
      />
    </div>
  );
}
