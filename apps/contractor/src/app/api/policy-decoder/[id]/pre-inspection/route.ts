import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildPreInspectionPrompt,
  type PreInspectionScript,
} from "@/lib/ai/pre-inspection-prompt";
import {
  generateAdvocacyPdf,
  type AdvocacyPdfData,
} from "@/lib/pdf/generate-advocacy-pdf";
import type { AdvocacyScript } from "@/lib/ai/advocacy-prompt";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: decodingId } = await params;

    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch the policy decoding
    const { data: decoding, error } = await supabase
      .from("policy_decodings")
      .select("*")
      .eq("id", decodingId)
      .single();

    if (error || !decoding) {
      return NextResponse.json(
        { error: "Policy decoding not found" },
        { status: 404 }
      );
    }

    if (decoding.status !== "complete" || !decoding.policy_analysis) {
      return NextResponse.json(
        { error: "Policy must be decoded before generating pre-inspection prep" },
        { status: 400 }
      );
    }

    const policyAnalysis = decoding.policy_analysis as Record<string, unknown>;

    // Fetch company info
    const { data: userProfile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    let companyName = "";
    let companyPhone = "";
    let companyId = "";

    if (userProfile?.company_id) {
      companyId = userProfile.company_id;
      const { data: company } = await admin
        .from("companies")
        .select("name, phone")
        .eq("id", userProfile.company_id)
        .single();

      companyName = company?.name || "";
      companyPhone = company?.phone || "";
    }

    // Extract context from policy analysis
    const carrierName = (policyAnalysis.carrier as string) || "";
    const propertyAddress = (policyAnalysis.propertyAddress as string) || "";
    const policyType = (policyAnalysis.policyType as string) || "";
    const depreciationMethod =
      (policyAnalysis.depreciationMethod as string) || "";

    // Try to extract state from property address
    let propertyState = "";
    let propertyZip = "";
    if (propertyAddress) {
      // Try to extract state code (2-letter) from address
      const stateMatch = propertyAddress.match(
        /\b(MD|PA|DE|DC|VA|WV|NJ|NY)\b/i
      );
      if (stateMatch) {
        propertyState = stateMatch[1].toUpperCase();
      }
      // Try to extract ZIP
      const zipMatch = propertyAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
      if (zipMatch) {
        propertyZip = zipMatch[1];
      }
    }

    // Check if claim_type was provided during upload
    const claimType = (decoding.claim_type as string) || "";

    // Build prompt
    const ctx = {
      carrierName,
      propertyState,
      propertyZip,
      policyType,
      depreciationMethod,
      policyAnalysis,
      claimType,
      companyName,
    };

    const { system, user: userPrompt } = buildPreInspectionPrompt(ctx);

    // Call Claude
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse response
    let script: PreInspectionScript;
    try {
      script = JSON.parse(
        responseText
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim()
      );
    } catch {
      console.error(
        "[pre-inspection] Failed to parse response:",
        responseText.slice(0, 500)
      );
      return NextResponse.json(
        { error: "Failed to generate pre-inspection script" },
        { status: 500 }
      );
    }

    // Generate PDF using the existing advocacy PDF generator
    // We adapt PreInspectionScript to AdvocacyScript format
    const advocacyScript: AdvocacyScript = {
      scenario: "pre_inspection",
      contractorSections: script.contractorSections,
      hoSections: script.hoSections,
    };

    const pdfData: AdvocacyPdfData = {
      script: advocacyScript,
      companyName,
      companyPhone,
      propertyAddress,
      carrierName,
      claimNumber: "",
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    const pdfBuffer = generateAdvocacyPdf(pdfData);

    // Upload PDF to storage
    const timestamp = Date.now();
    const pdfPath = companyId
      ? `${companyId}/decoder-${decodingId}/pre-inspection-${timestamp}.pdf`
      : `no-company/decoder-${decodingId}/pre-inspection-${timestamp}.pdf`;

    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("[pre-inspection] Upload failed:", uploadErr);
      // Don't fail the whole request — still return the script
    }

    // Get signed URL
    let signedUrl: string | null = null;
    if (!uploadErr) {
      const { data: signedData } = await admin.storage
        .from("supplements")
        .createSignedUrl(pdfPath, 3600);
      signedUrl = signedData?.signedUrl || null;
    }

    return NextResponse.json({
      success: true,
      script,
      pdfUrl: signedUrl,
    });
  } catch (err) {
    console.error("[pre-inspection] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate pre-inspection script",
      },
      { status: 500 }
    );
  }
}
