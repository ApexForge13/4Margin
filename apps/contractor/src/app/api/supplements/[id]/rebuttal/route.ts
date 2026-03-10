import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateRebuttalLetter,
  type RebuttalLetterData,
} from "@/lib/pdf/generate-rebuttal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deniedItemIds } = body as { deniedItemIds: string[] };

    if (!deniedItemIds || deniedItemIds.length === 0) {
      return NextResponse.json({ error: "No denied items selected" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch supplement + claim + company
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

    // Fetch denied items
    const { data: items } = await admin
      .from("supplement_items")
      .select("*")
      .in("id", deniedItemIds)
      .eq("supplement_id", supplementId);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No matching items found" }, { status: 404 });
    }

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", supplement.company_id)
      .single();

    const companyAddress = company
      ? [company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")
      : "";

    const letterData: RebuttalLetterData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      carrierName: (carrier?.name as string) || "",
      propertyAddress: [claim.property_address, claim.property_city, claim.property_state, claim.property_zip]
        .filter(Boolean).join(", "),
      propertyState: (claim.property_state as string) || "",
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      adjusterName: (claim.adjuster_name as string) || "",
      deniedItems: items.map((item) => ({
        xactimate_code: item.xactimate_code,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        total_price: Number(item.total_price),
        justification: item.justification || "",
        irc_reference: item.irc_reference || "",
      })),
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    // Generate PDF
    const pdfBuffer = generateRebuttalLetter(letterData);

    // Upload to storage
    const timestamp = Date.now();
    const pdfPath = `${supplement.company_id}/${supplementId}/rebuttal-${timestamp}.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      console.error("[rebuttal] Upload failed:", uploadErr);
      return NextResponse.json({ error: "Failed to upload rebuttal PDF" }, { status: 500 });
    }

    // Update supplement record
    await admin.from("supplements").update({ rebuttal_pdf_url: pdfPath }).eq("id", supplementId);

    // Generate signed URL for immediate download
    const { data: signedData } = await admin.storage
      .from("supplements")
      .createSignedUrl(pdfPath, 3600);

    return NextResponse.json({
      success: true,
      pdfPath,
      downloadUrl: signedData?.signedUrl || null,
      itemCount: items.length,
    });
  } catch (err) {
    console.error("[rebuttal] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate rebuttal" },
      { status: 500 }
    );
  }
}
