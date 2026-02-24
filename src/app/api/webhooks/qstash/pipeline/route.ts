/**
 * POST /api/webhooks/qstash/pipeline
 *
 * QStash webhook endpoint for running the supplement pipeline.
 * QStash sends a signed HTTP request here with the pipeline payload.
 * Verifies the QStash signature to prevent unauthorized access.
 *
 * Payload: { supplementId, claimId, companyId }
 */

import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { runSupplementPipeline } from "@/lib/ai/pipeline";

// Pipeline includes multiple Claude API calls — needs extended timeout
export const maxDuration = 120;

const receiver = process.env.QSTASH_CURRENT_SIGNING_KEY &&
  process.env.QSTASH_NEXT_SIGNING_KEY
  ? new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
  : null;

export async function POST(request: NextRequest) {
  const body = await request.text();

  // ── Verify QStash signature ──
  if (receiver) {
    const signature = request.headers.get("upstash-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    try {
      await receiver.verify({
        signature,
        body,
      });
    } catch {
      console.error("[qstash] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, require QStash signing keys
    console.error("[qstash] Signing keys not configured in production");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  // ── Parse and run pipeline ──
  let payload: { supplementId: string; claimId: string; companyId: string };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!payload.supplementId || !payload.claimId || !payload.companyId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  console.log(`[qstash] Running pipeline for supplement ${payload.supplementId}`);

  const result = await runSupplementPipeline({
    supplementId: payload.supplementId,
    claimId: payload.claimId,
    companyId: payload.companyId,
  });

  if (!result.success) {
    // Return 500 so QStash retries the job
    return NextResponse.json(
      { error: result.error || "Pipeline failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    itemCount: result.itemCount,
    supplementTotal: result.supplementTotal,
  });
}
