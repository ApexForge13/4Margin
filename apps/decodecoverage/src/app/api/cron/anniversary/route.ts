import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * TODO: Policy anniversary re-trigger
 * - Find leads whose policy expiration is within 30 days
 * - Send renewal reminder: "Your policy renews soon — here's what changed since your last scan"
 * - Offer free re-scan with updated analysis
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stub — not yet implemented
  return NextResponse.json({ message: "Anniversary reminders not yet implemented" });
}
