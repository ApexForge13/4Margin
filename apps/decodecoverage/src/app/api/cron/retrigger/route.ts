import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * Cron endpoint: marks policy checks as lead_contactable after 120 days.
 *
 * Runs on a schedule (e.g. daily via Vercel Cron).
 * Only targets checks where:
 *   - outcome = 'claim_filed' (contractor had an active claim)
 *   - retrigger_at <= now() (120 days have passed since submission)
 *   - lead_contactable = false (not already marked)
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: checks, error: fetchErr } = await supabase
    .from("policy_checks")
    .select("id")
    .eq("outcome", "claim_filed")
    .eq("lead_contactable", false)
    .lte("retrigger_at", new Date().toISOString())
    .not("retrigger_at", "is", null);

  if (fetchErr) {
    console.error("[cron/retrigger] Fetch error:", fetchErr);
    return NextResponse.json(
      { error: "Failed to query checks" },
      { status: 500 }
    );
  }

  if (!checks || checks.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const ids = checks.map((c) => c.id);

  const { error: updateErr } = await supabase
    .from("policy_checks")
    .update({
      lead_contactable: true,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateErr) {
    console.error("[cron/retrigger] Update error:", updateErr);
    return NextResponse.json(
      { error: "Failed to update checks" },
      { status: 500 }
    );
  }

  console.log(`[cron/retrigger] Marked ${ids.length} checks as contactable`);
  return NextResponse.json({ updated: ids.length });
}
