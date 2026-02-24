import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeSupplementSchema, validate } from "@/lib/validations/schemas";
import {
  generateSupplementPdf,
  type SupplementPdfData,
} from "@/lib/pdf/generate-supplement";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate body
    const body = await request.json();
    const parsed = validate(finalizeSupplementSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { selectedItemIds } = parsed.data;

    // Fetch supplement with claim
    const { data: supplement, error: supError } = await supabase
      .from("supplements")
      .select("*, claims(*)")
      .eq("id", supplementId)
      .single();

    if (supError || !supplement) {
      return NextResponse.json(
        { error: "Supplement not found" },
        { status: 404 }
      );
    }

    // Must be status "complete" and no PDF yet
    if (supplement.status !== "complete") {
      return NextResponse.json(
        { error: "Supplement is not ready for finalization" },
        { status: 400 }
      );
    }

    if (supplement.generated_pdf_url) {
      return NextResponse.json(
        { error: "Supplement PDF has already been generated" },
        { status: 400 }
      );
    }

    const claim = supplement.claims as Record<string, unknown>;
    const admin = createAdminClient();

    // Update item statuses: selected → accepted, unselected → rejected
    const { data: allItems } = await admin
      .from("supplement_items")
      .select("id")
      .eq("supplement_id", supplementId);

    if (!allItems || allItems.length === 0) {
      return NextResponse.json(
        { error: "No line items found" },
        { status: 400 }
      );
    }

    const selectedSet = new Set(selectedItemIds);
    const acceptedIds = allItems
      .filter((i) => selectedSet.has(i.id))
      .map((i) => i.id);
    const rejectedIds = allItems
      .filter((i) => !selectedSet.has(i.id))
      .map((i) => i.id);

    if (acceptedIds.length > 0) {
      await admin
        .from("supplement_items")
        .update({ status: "accepted" })
        .in("id", acceptedIds);
    }
    if (rejectedIds.length > 0) {
      await admin
        .from("supplement_items")
        .update({ status: "rejected" })
        .in("id", rejectedIds);
    }

    // Fetch accepted items for PDF
    const { data: items } = await admin
      .from("supplement_items")
      .select("*")
      .eq("supplement_id", supplementId)
      .eq("status", "accepted")
      .order("category", { ascending: true })
      .order("xactimate_code", { ascending: true });

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items selected" },
        { status: 400 }
      );
    }

    // Fetch company info
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", supplement.company_id)
      .single();

    const companyAddress = company
      ? [company.address, company.city, company.state, company.zip]
          .filter(Boolean)
          .join(", ")
      : "";

    // Get carrier name
    let carrierName = "";
    if (claim.carrier_id) {
      const { data: carrier } = await admin
        .from("carriers")
        .select("name")
        .eq("id", claim.carrier_id as string)
        .single();
      if (carrier) carrierName = carrier.name;
    }

    // Calculate supplement total from accepted items
    const supplementTotal = items.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0
    );

    // Build PDF data
    const pdfData: SupplementPdfData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
      claimName:
        (claim.notes as string) || `Claim #${claim.claim_number || ""}`,
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      carrierName,
      propertyAddress: [
        claim.property_address,
        claim.property_city,
        claim.property_state,
        claim.property_zip,
      ]
        .filter(Boolean)
        .join(", "),
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      adjusterName: (claim.adjuster_name as string) || "",
      adjusterTotal: supplement.adjuster_total
        ? Number(supplement.adjuster_total)
        : null,
      supplementTotal,
      measuredSquares: claim.roof_squares ? Number(claim.roof_squares) : null,
      wastePercent: claim.waste_percent ? Number(claim.waste_percent) : null,
      suggestedSquares: claim.suggested_squares
        ? Number(claim.suggested_squares)
        : null,
      pitch: (claim.roof_pitch as string) || null,
      items: items.map((item) => ({
        xactimate_code: item.xactimate_code,
        description: item.description,
        category: item.category || "",
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.unit_price),
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
    const pdfBuffer = generateSupplementPdf(pdfData);

    // Upload to storage
    const pdfPath = `${supplement.company_id}/${supplementId}/supplement.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadError } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload supplement PDF:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 }
      );
    }

    // Update supplement record
    await admin
      .from("supplements")
      .update({
        generated_pdf_url: pdfPath,
        supplement_total: supplementTotal,
      })
      .eq("id", supplementId);

    return NextResponse.json({
      success: true,
      pdfPath,
      supplementTotal,
      itemCount: items.length,
    });
  } catch (err) {
    console.error("[finalize] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to finalize supplement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
