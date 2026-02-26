import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import JSZip from "jszip";
import { uuidParamSchema, validate } from "@/lib/validations/schemas";
import {
  generateSupplementPdf,
  type SupplementPdfData,
} from "@/lib/pdf/generate-supplement";
import {
  generateJustificationPdf,
  type JustificationPdfData,
} from "@/lib/pdf/generate-justification";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rawParams = await params;

  // ── Validate route param ─────────────────────────────────
  const parsed = validate(uuidParamSchema, rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid supplement ID" }, { status: 400 });
  }
  const { id } = parsed.data;

  const supabase = await createClient();
  const admin = createAdminClient();

  // ── Auth check ───────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch supplement + claim + carrier ────────────────────
  const { data: supplement, error } = await admin
    .from("supplements")
    .select(
      `*, claims ( *, carriers ( * ) )`
    )
    .eq("id", id)
    .single();

  if (error || !supplement) {
    return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
  }

  // ── Payment check ─────────────────────────────────────────
  if (!supplement.paid_at) {
    return NextResponse.json(
      { error: "Payment required. Please purchase this supplement report first." },
      { status: 402 }
    );
  }

  const claim = supplement.claims as Record<string, unknown>;
  const carrier = (claim?.carriers as Record<string, unknown>) || null;

  // ── Fetch supplement items (only accepted / detected) ─────
  const { data: items } = await admin
    .from("supplement_items")
    .select("*")
    .eq("supplement_id", id)
    .in("status", ["detected", "accepted"])
    .order("category", { ascending: true })
    .order("xactimate_code", { ascending: true });

  // ── Fetch photos ──────────────────────────────────────────
  const { data: photos } = await admin
    .from("photos")
    .select("*")
    .eq("claim_id", claim.id as string)
    .order("created_at", { ascending: true });

  // ── Fetch company info ────────────────────────────────────
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

  const carrierName = (carrier?.name as string) || "";
  const propertyAddress = [
    claim.property_address,
    claim.property_city,
    claim.property_state,
    claim.property_zip,
  ]
    .filter(Boolean)
    .join(", ");

  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // ── Create ZIP ────────────────────────────────────────────
  const zip = new JSZip();

  const claimName =
    (claim.notes as string) ||
    `Claim ${claim.claim_number || id.slice(0, 8)}`;
  const safeName = claimName.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 60);

  // ── 1. Adjuster Estimate PDF ──────────────────────────────
  if (supplement.adjuster_estimate_url) {
    try {
      const { data: estimateBlob } = await admin.storage
        .from("estimates")
        .download(supplement.adjuster_estimate_url);
      if (estimateBlob) {
        const buffer = await estimateBlob.arrayBuffer();
        zip.file("Adjuster_Estimate.pdf", buffer);
      }
    } catch {
      // Skip if file can't be downloaded
    }
  }

  // ── 2. Supplement Report PDF (generate fresh with latest branding) ──
  if (items && items.length > 0) {
    try {
      const pdfData: SupplementPdfData = {
        companyName: company?.name || "",
        companyPhone: company?.phone || "",
        companyAddress,
        companyLicense: company?.license_number || "",
        claimName,
        claimNumber: (claim.claim_number as string) || "",
        policyNumber: (claim.policy_number as string) || "",
        carrierName,
        propertyAddress,
        dateOfLoss: claim.date_of_loss
          ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
          : "",
        adjusterName: (claim.adjuster_name as string) || "",
        adjusterTotal: supplement.adjuster_total
          ? Number(supplement.adjuster_total)
          : null,
        supplementTotal: Number(supplement.supplement_total || 0),
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
        generatedDate,
      };

      const supplementPdfBuffer = generateSupplementPdf(pdfData);
      zip.file("Supplement_Report.pdf", supplementPdfBuffer);
    } catch (pdfErr) {
      console.error("[download] Failed to generate supplement PDF:", pdfErr);
      // Fallback: try to download the stored PDF
      if (supplement.generated_pdf_url) {
        try {
          const { data: pdfBlob } = await admin.storage
            .from("supplements")
            .download(supplement.generated_pdf_url);
          if (pdfBlob) {
            const buffer = await pdfBlob.arrayBuffer();
            zip.file("Supplement_Report.pdf", buffer);
          }
        } catch {
          // Skip
        }
      }
    }
  } else if (supplement.generated_pdf_url) {
    // No items but PDF exists — use stored version
    try {
      const { data: pdfBlob } = await admin.storage
        .from("supplements")
        .download(supplement.generated_pdf_url);
      if (pdfBlob) {
        const buffer = await pdfBlob.arrayBuffer();
        zip.file("Supplement_Report.pdf", buffer);
      }
    } catch {
      // Skip
    }
  }

  // ── 3. Weather Verification Report PDF ──────────────────
  if (supplement.weather_pdf_url) {
    try {
      const { data: weatherBlob } = await admin.storage
        .from("supplements")
        .download(supplement.weather_pdf_url);
      if (weatherBlob) {
        const buffer = await weatherBlob.arrayBuffer();
        zip.file("Weather_Verification_Report.pdf", buffer);
      }
    } catch {
      // Skip if file can't be downloaded
    }
  }

  // ── 4. Justification & Support Points PDF ──────────────
  if (items && items.length > 0) {
    try {
      const justData: JustificationPdfData = {
        claimNumber: (claim.claim_number as string) || "",
        carrierName,
        propertyAddress,
        companyName: company?.name || "",
        generatedDate,
        items: items.map((item) => ({
          xactimate_code: item.xactimate_code,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          total_price: Number(item.total_price),
          justification: item.justification || "",
          irc_reference: item.irc_reference || "",
          photo_references: item.photo_references as string[] | undefined,
        })),
        wastePercent: claim.waste_percent ? Number(claim.waste_percent) : null,
        roofSquares: claim.roof_squares ? Number(claim.roof_squares) : null,
        suggestedSquares: claim.suggested_squares
          ? Number(claim.suggested_squares)
          : null,
      };

      const justPdfBuffer = generateJustificationPdf(justData);
      zip.file("Justification_Support_Points.pdf", justPdfBuffer);
    } catch (justErr) {
      console.error("[download] Failed to generate justification PDF:", justErr);
    }
  }

  // ── 5. Carrier Response (if exists) ───────────────────────
  if (supplement.carrier_response_url) {
    try {
      const { data: responseBlob } = await admin.storage
        .from("carrier-responses")
        .download(supplement.carrier_response_url);
      if (responseBlob) {
        const ext = supplement.carrier_response_url.split(".").pop() || "pdf";
        const buffer = await responseBlob.arrayBuffer();
        zip.file(`Carrier_Response.${ext}`, buffer);
      }
    } catch {
      // Skip
    }
  }

  // ── 6. Photos folder ──────────────────────────────────────
  if (photos && photos.length > 0) {
    const photosFolder = zip.folder("Photos");
    if (photosFolder) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const { data: photoBlob } = await admin.storage
            .from("photos")
            .download(photo.storage_path);
          if (photoBlob) {
            const ext =
              photo.file_name?.split(".").pop() ||
              photo.storage_path.split(".").pop() ||
              "jpg";
            const name = photo.file_name || `Photo_${i + 1}.${ext}`;
            const buffer = await photoBlob.arrayBuffer();
            photosFolder.file(name, buffer);
          }
        } catch {
          // Skip individual photo failures
        }
      }
    }
  }

  // ── Generate ZIP and respond ──────────────────────────────
  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}_Supplement.zip"`,
    },
  });
}
