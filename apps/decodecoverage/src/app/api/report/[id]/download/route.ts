import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { generateDecoderPdf } from "@4margin/pdf";
import type { DecoderPdfData } from "@4margin/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("consumer_leads")
    .select("policy_analysis, first_name, last_name")
    .eq("id", id)
    .eq("status", "complete")
    .single();

  if (!lead?.policy_analysis) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const a = lead.policy_analysis;

  const pdfData: DecoderPdfData = {
    policyType: a.policyType || "",
    carrier: a.carrier || "",
    policyNumber: a.policyNumber || "",
    effectiveDate: a.effectiveDate || null,
    expirationDate: a.expirationDate || null,
    namedInsured: a.namedInsured || "",
    propertyAddress: a.propertyAddress || "",
    riskLevel: a.riskLevel || "medium",
    confidence: a.confidence || 0,
    summaryForContractor: a.summaryForContractor || "",
    documentType: a.documentType || "",
    scanQuality: a.scanQuality || "",
    coverages: a.coverages || [],
    deductibles: a.deductibles || [],
    depreciationMethod: a.depreciationMethod || "",
    depreciationNotes: a.depreciationNotes || "",
    exclusions: a.exclusions || [],
    endorsements: a.endorsements || [],
    landmines: a.landmines || [],
    favorableProvisions: a.favorableProvisions || [],
    generatedDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  const buffer = generateDecoderPdf(pdfData);

  const name = `${lead.first_name || "Policy"}-${lead.last_name || "Report"}`;
  const filename = `DecodeCoverage-${name}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
