import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { Resend } from "resend";
import { getEmailTemplate, EMAIL_TIMING } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Auth guard — Vercel Cron sends CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Find leads eligible for the next email
  const { data: leads, error } = await supabase
    .from("consumer_leads")
    .select(
      "id, first_name, email, policy_score, policy_grade, email_sequence_stage, email_sequence_started_at, policy_analysis"
    )
    .not("email", "is", null)
    .lt("email_sequence_stage", 4)
    .lt("policy_score", 85)
    .not("email_sequence_started_at", "is", null);

  if (error) {
    console.error("[email-sequence] Query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ sent: 0, message: "No eligible leads" });
  }

  let sent = 0;
  const now = Date.now();

  for (const lead of leads) {
    const nextStage = (lead.email_sequence_stage || 0) + 1;
    if (nextStage > 4) continue;

    const startedAt = new Date(lead.email_sequence_started_at).getTime();
    const elapsed = now - startedAt;
    const threshold = EMAIL_TIMING[nextStage];

    if (elapsed < threshold) continue;

    // Extract context from policy_analysis
    const analysis = lead.policy_analysis as Record<string, unknown> | null;
    const landmines = (analysis?.landmines as Array<{ name: string; impact: string }>) || [];
    const primaryFinding = landmines[0]?.impact || landmines[0]?.name || undefined;
    const stateMatch = (analysis?.propertyAddress as string)?.match(/\b([A-Z]{2})\b\s*\d{5}/);
    const state = stateMatch ? stateMatch[1] : undefined;

    const template = getEmailTemplate(nextStage, {
      firstName: lead.first_name || "there",
      email: lead.email,
      leadId: lead.id,
      score: lead.policy_score || 0,
      gapCount: landmines.length,
      primaryFinding,
      state,
    });

    if (!template) continue;

    try {
      await resend.emails.send({
        from: "DecodeCoverage <reports@decodecoverage.com>",
        to: lead.email,
        subject: template.subject,
        html: template.html,
      });

      await supabase
        .from("consumer_leads")
        .update({
          email_sequence_stage: nextStage,
          last_email_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      sent++;
    } catch (err) {
      console.error(`[email-sequence] Failed to send email ${nextStage} to ${lead.id}:`, err);
    }
  }

  return NextResponse.json({ sent, total: leads.length });
}
