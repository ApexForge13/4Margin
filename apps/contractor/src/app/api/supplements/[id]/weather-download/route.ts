import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uuidParamSchema, validate } from "@/lib/validations/schemas";

/**
 * GET /api/supplements/[id]/weather-download
 *
 * Downloads the weather verification report PDF for a supplement.
 * Returns the PDF directly as a file download.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rawParams = await params;
  const parsed = validate(uuidParamSchema, rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid supplement ID" }, { status: 400 });
  }
  const { id } = parsed.data;

  const supabase = await createClient();
  const admin = createAdminClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch supplement
  const { data: supplement, error } = await admin
    .from("supplements")
    .select("weather_pdf_url, paid_at, claims(claim_number)")
    .eq("id", id)
    .single();

  if (error || !supplement) {
    return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
  }

  if (!supplement.paid_at) {
    return NextResponse.json(
      { error: "Payment required" },
      { status: 402 }
    );
  }

  if (!supplement.weather_pdf_url) {
    return NextResponse.json(
      { error: "No weather report available for this supplement" },
      { status: 404 }
    );
  }

  // Download from storage
  const { data: pdfBlob, error: downloadErr } = await admin.storage
    .from("supplements")
    .download(supplement.weather_pdf_url);

  if (downloadErr || !pdfBlob) {
    return NextResponse.json(
      { error: "Failed to download weather report" },
      { status: 500 }
    );
  }

  const buffer = await pdfBlob.arrayBuffer();
  const claim = supplement.claims as unknown as Record<string, unknown> | null;
  const claimNum = (claim?.claim_number as string) || id.slice(0, 8);
  const filename = `Weather_Report_${claimNum}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
