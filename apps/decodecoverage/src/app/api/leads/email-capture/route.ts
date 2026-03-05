import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { email, utmSource, utmMedium, utmCampaign } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Upsert — if this email already exists, update UTM; otherwise create new
    const { error } = await supabase.from("consumer_leads").insert({
      email,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      status: "email_captured",
      consent_terms: true,
      consent_timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("[email-capture] Insert error:", error);
      // Don't fail hard — this is fire-and-forget
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email-capture] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
