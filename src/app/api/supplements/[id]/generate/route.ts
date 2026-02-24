/**
 * POST /api/supplements/[id]/generate
 *
 * Triggers the AI supplement generation pipeline.
 * Called after claim + supplement creation to start async processing.
 *
 * If QStash is configured → enqueues a durable background job with retries.
 * Otherwise → runs the pipeline inline (fire-and-forget for MVP).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSupplementPipeline } from "@/lib/ai/pipeline";
import { enqueuePipelineJob, isQueueEnabled } from "@/lib/queue/client";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: supplementId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = checkRateLimit(`generate:${user.id}`, RATE_LIMITS.generate);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429 }
    );
  }

  // Fetch supplement to get claim_id and company_id
  const { data: supplement, error } = await supabase
    .from("supplements")
    .select("claim_id, company_id")
    .eq("id", supplementId)
    .single();

  if (error || !supplement) {
    return NextResponse.json(
      { error: "Supplement not found" },
      { status: 404 }
    );
  }

  // Reset supplement status for retries — clear old items and reset to generating
  await supabase
    .from("supplement_items")
    .delete()
    .eq("supplement_id", supplementId);

  await supabase
    .from("supplements")
    .update({
      status: "generating",
      supplement_total: null,
      adjuster_total: null,
      adjuster_estimate_parsed: null,
      generated_pdf_url: null,
      weather_data: null,
      weather_pdf_url: null,
    })
    .eq("id", supplementId);

  const pipelineInput = {
    supplementId,
    claimId: supplement.claim_id,
    companyId: supplement.company_id,
  };

  // ── Try QStash first (durable, retryable) ──
  if (isQueueEnabled()) {
    try {
      const { queued, messageId } = await enqueuePipelineJob(pipelineInput);
      if (queued) {
        return NextResponse.json({
          supplementId,
          queued: true,
          messageId,
        });
      }
    } catch (err) {
      console.error("[generate] QStash enqueue failed, falling back to inline:", err);
    }
  }

  // ── Fallback: run pipeline inline ──
  const result = await runSupplementPipeline(pipelineInput);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Pipeline failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    supplementId: result.supplementId,
    itemCount: result.itemCount,
    supplementTotal: result.supplementTotal,
  });
}
