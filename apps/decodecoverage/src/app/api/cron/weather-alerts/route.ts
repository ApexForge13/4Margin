import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * TODO: Weather-based re-trigger
 * - Query Visual Crossing or NWS for severe weather events in target markets
 * - Find leads in affected zip codes with score < 85
 * - Send weather-specific email: "A storm is heading to [area] — is your policy ready?"
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stub — not yet implemented
  return NextResponse.json({ message: "Weather alerts not yet implemented" });
}
