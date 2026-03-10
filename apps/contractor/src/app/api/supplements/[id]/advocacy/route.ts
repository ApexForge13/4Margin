import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildAdvocacyPrompt,
  type AdvocacyScenario,
  type AdvocacyScript,
} from "@/lib/ai/advocacy-prompt";
import {
  generateAdvocacyPdf,
  type AdvocacyPdfData,
} from "@/lib/pdf/generate-advocacy-pdf";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const scenario = body.scenario as AdvocacyScenario;
    if (scenario !== "pre_inspection" && scenario !== "post_denial") {
      return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch supplement + claim + carrier
    const { data: supplement, error } = await supabase
      .from("supplements")
      .select("*, claims(*, carriers(*))")
      .eq("id", supplementId)
      .single();

    if (error || !supplement) {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }

    const claim = supplement.claims as Record<string, unknown>;
    const carrier = (claim?.carriers as Record<string, unknown>) || null;

    // Fetch items
    const { data: items } = await admin
      .from("supplement_items")
      .select("*")
      .eq("supplement_id", supplementId)
      .in("status", ["accepted", "detected"])
      .order("category");

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip")
      .eq("id", supplement.company_id)
      .single();

    // Determine claim type from damage_types
    const damageTypes = (claim.damage_types as string[]) || [];
    const claimType = damageTypes.includes("hail") && damageTypes.includes("wind")
      ? "wind_hail"
      : damageTypes[0] || "wind_hail";

    // Build prompt
    const advocacyContext = {
      scenario,
      carrierName: (carrier?.name as string) || "",
      propertyState: (claim.property_state as string) || "",
      propertyZip: (claim.property_zip as string) || "",
      claimType,
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      policyAnalysis: supplement.policy_analysis as Record<string, unknown> | null,
      items: (items || []).map((i) => ({
        xactimate_code: i.xactimate_code,
        description: i.description,
        total_price: Number(i.total_price),
        justification: i.justification || "",
        status: i.status,
      })),
      supplementTotal: Number(supplement.supplement_total || 0),
      companyName: company?.name || "",
    };

    const { system, user: userPrompt } = buildAdvocacyPrompt(advocacyContext);

    // Call Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse response
    let script: AdvocacyScript;
    try {
      script = JSON.parse(responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      console.error("[advocacy] Failed to parse response:", responseText.slice(0, 500));
      return NextResponse.json({ error: "Failed to generate advocacy script" }, { status: 500 });
    }

    // Generate PDF
    const propertyAddress = [claim.property_address, claim.property_city, claim.property_state, claim.property_zip]
      .filter(Boolean).join(", ");

    const pdfData: AdvocacyPdfData = {
      script,
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      propertyAddress,
      carrierName: (carrier?.name as string) || "",
      claimNumber: (claim.claim_number as string) || "",
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    const pdfBuffer = generateAdvocacyPdf(pdfData);

    // Upload PDF
    const timestamp = Date.now();
    const pdfPath = `${supplement.company_id}/${supplementId}/advocacy-${scenario}-${timestamp}.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("[advocacy] Upload failed:", uploadErr);
      return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
    }

    // Get signed URL
    const { data: signedData } = await admin.storage
      .from("supplements")
      .createSignedUrl(pdfPath, 3600);

    return NextResponse.json({
      success: true,
      script,
      pdfUrl: signedData?.signedUrl || null,
    });
  } catch (err) {
    console.error("[advocacy] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate advocacy script" },
      { status: 500 }
    );
  }
}
