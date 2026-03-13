import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDecoderPdf } from "@/lib/pdf/generate-decoder-pdf";
import type { DecoderPdfData } from "@/lib/pdf/generate-decoder-pdf";
import {
  generateContractorDecodePdf,
  generateHomeownerDecodePdf,
} from "@4margin/pdf";
import type {
  ContractorDecodePdfData,
  HomeownerDecodePdfData,
} from "@4margin/pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportType = request.nextUrl.searchParams.get("type") || "contractor";

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's company
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 400 }
      );
    }

    // Get decoding (scoped to company)
    const { data: decoding, error } = await admin
      .from("policy_decodings")
      .select("*")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single();

    if (error || !decoding) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (decoding.status !== "complete" || !decoding.policy_analysis) {
      return NextResponse.json(
        { error: "Analysis not yet complete" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysis = decoding.policy_analysis as any;

    let pdfBuffer: ArrayBuffer;
    let filePrefix: string;

    if (reportType === "homeowner") {
      const hoData: HomeownerDecodePdfData = {
        analysis: {
          carrier: analysis.carrier || null,
          policyNumber: analysis.policyNumber || null,
          namedInsured: analysis.namedInsured || null,
          propertyAddress: analysis.propertyAddress || null,
          coverages: analysis.coverages || [],
          deductibles: analysis.deductibles || [],
          depreciationMethod: analysis.depreciationMethod || null,
          depreciationNotes: analysis.depreciationNotes || null,
          exclusions: analysis.exclusions || [],
          favorableProvisions: analysis.favorableProvisions || [],
          summaryForContractor: analysis.summaryForContractor || null,
          confidence: analysis.confidence || null,
        },
        generatedAt: new Date().toISOString(),
      };

      pdfBuffer = generateHomeownerDecodePdf(hoData);
      filePrefix = "Homeowner-Report";
    } else {
      // Default: contractor report
      const contractorData: ContractorDecodePdfData = {
        analysis: {
          policyType: analysis.policyType || "Unknown",
          carrier: analysis.carrier || "Unknown",
          policyNumber: analysis.policyNumber || "---",
          effectiveDate: analysis.effectiveDate || null,
          expirationDate: analysis.expirationDate || null,
          namedInsured: analysis.namedInsured || "---",
          propertyAddress: analysis.propertyAddress || "---",
          coverages: analysis.coverages || [],
          deductibles: analysis.deductibles || [],
          depreciationMethod: analysis.depreciationMethod || "UNKNOWN",
          depreciationNotes: analysis.depreciationNotes || "",
          exclusions: analysis.exclusions || [],
          endorsements: analysis.endorsements || [],
          landmines: analysis.landmines || [],
          favorableProvisions: analysis.favorableProvisions || [],
          summaryForContractor: analysis.summaryForContractor || "",
          riskLevel: analysis.riskLevel || "medium",
          confidence: analysis.confidence || 0,
          parseNotes: analysis.parseNotes || undefined,
        },
        generatedAt: new Date().toISOString(),
      };

      pdfBuffer = generateContractorDecodePdf(contractorData);
      filePrefix = "Contractor-Report";
    }

    const baseName = decoding.original_filename
      ? decoding.original_filename.replace(/\.pdf$/i, "")
      : id.slice(0, 8);

    const filename = `${filePrefix}-${baseName}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[policy-decoder/download] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
