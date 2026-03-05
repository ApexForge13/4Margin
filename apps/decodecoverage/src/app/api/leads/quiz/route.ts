import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();

    const {
      email,
      firstName,
      phone,
      zipCode,
      quizAnswers,
      estimatedScore,
      estimatedGrade,
      consentContact,
      consentTimestamp,
      consentPageUrl,
      consentText,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { data: lead, error: insertErr } = await supabase
      .from("consumer_leads")
      .insert({
        first_name: firstName || null,
        email,
        phone: phone || null,
        property_address: zipCode ? `ZIP: ${zipCode}` : null,
        carrier: quizAnswers?.carrier || null,
        consent_terms: true,
        consent_contact: consentContact ?? true,
        consent_timestamp: consentTimestamp || new Date().toISOString(),
        consent_certificate: {
          terms: {
            granted: true,
            text: "Agreed via quiz flow",
            timestamp: consentTimestamp || new Date().toISOString(),
          },
          contact: {
            granted: consentContact ?? true,
            text: consentText || "",
            timestamp: consentTimestamp || new Date().toISOString(),
          },
          ip_address: ipAddress,
          user_agent: userAgent,
          page_url: consentPageUrl || "unknown",
          collected_at: new Date().toISOString(),
        },
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        status: "quiz_lead",
        policy_score: estimatedScore || null,
        policy_grade: estimatedGrade || null,
        policy_analysis: {
          source: "quiz",
          quizAnswers,
          estimatedScore,
          estimatedGrade,
        },
      })
      .select("id")
      .single();

    if (insertErr || !lead) {
      console.error("[quiz] Insert error:", insertErr);
      return NextResponse.json(
        { error: "Failed to save quiz results" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: lead.id,
      score: estimatedScore,
      grade: estimatedGrade,
    });
  } catch (err) {
    console.error("[quiz] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
