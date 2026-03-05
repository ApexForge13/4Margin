import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { email, noPdf, utmSource, utmMedium, utmCampaign } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Upsert: if email already exists, update; otherwise insert
    const { error: upsertErr } = await supabase
      .from("consumer_leads")
      .insert({
        email,
        status: noPdf ? "no_pdf" : "pre_upload",
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      });

    if (upsertErr) {
      console.error("[pre-upload] Upsert error:", upsertErr);
      // Don't fail — email might already exist
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pre-upload] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
