import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!body.firstName || !body.email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify lead exists
  const { data: lead } = await supabase
    .from("consumer_leads")
    .select("id, policy_score")
    .eq("id", id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    first_name: body.firstName,
    last_name: body.lastName || null,
    email: body.email,
    phone: body.phone || null,
    preferred_contact_method: body.preferredContact || null,
    best_time: body.bestTime || null,
    consent_terms: true,
    consent_contact: body.connectWithAdvisor || false,
    consent_timestamp: now,
    consent_certificate: {
      terms: {
        granted: true,
        text: "I agree to the Terms of Service and Privacy Policy.",
        timestamp: now,
      },
      contact: {
        granted: body.connectWithAdvisor || false,
        text: body.connectWithAdvisor
          ? "Connect me with a licensed advisor."
          : "",
        timestamp: body.connectWithAdvisor ? now : null,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      page_url: body.pageUrl || "unknown",
      collected_at: now,
    },
    converted_at: now,
    updated_at: now,
  };

  // Start email sequence if score < 85 and user provided email
  if (lead.policy_score !== null && lead.policy_score < 85) {
    updates.email_sequence_stage = 0;
    updates.email_sequence_started_at = now;
  }

  const { error } = await supabase
    .from("consumer_leads")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[contact] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
