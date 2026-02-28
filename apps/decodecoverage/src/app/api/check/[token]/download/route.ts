import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { generateDecoderPdf } from "@4margin/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: check } = await supabase
    .from("policy_checks")
    .select(
      "id, status, homeowner_first_name, homeowner_last_name, policy_analysis"
    )
    .eq("token", token)
    .single();

  if (!check || check.status !== "complete" || !check.policy_analysis) {
    return NextResponse.json(
      { error: "Report not available" },
      { status: 404 }
    );
  }

  const pdfBuffer = await generateDecoderPdf({
    firstName: check.homeowner_first_name || "",
    lastName: check.homeowner_last_name || "",
    analysis: check.policy_analysis,
  });

  const filename = `DecodeCoverage-${check.homeowner_first_name || "Policy"}-${check.homeowner_last_name || "Report"}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
