import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeSupplementSchema, validate } from "@/lib/validations/schemas";
import {
  generateSupplementPdf,
  type SupplementPdfData,
} from "@/lib/pdf/generate-supplement";
import {
  generateCoverLetter,
  type CoverLetterData,
} from "@/lib/pdf/generate-cover-letter";
import { calculateOhp, type OhpResult } from "@/lib/calculators/ohp";
import { ircSectionToUrl } from "@/data/building-codes";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";
import { lookupCountyByZip } from "@/data/county-jurisdictions";
import type { ReferenceLink } from "@/lib/pdf/generate-supplement";

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
      .select("*, jobs(*)")
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

    console.log(`[finalize] Starting finalization for supplement ${supplementId}`);

    const claim = supplement.jobs as Record<string, unknown>;
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

    console.log(`[finalize] Marking ${acceptedIds.length} items accepted, ${rejectedIds.length} rejected`);

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

    // Calculate supplement total from accepted items (before O&P)
    let supplementTotal = items.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0
    );

    // ── O&P Calculation ──
    // Calculate on FULL scope (adjuster base + supplement), credit what's already paid
    const adjusterBase = supplement.adjuster_total
      ? Number(supplement.adjuster_total)
      : 0;

    const tradeCategories = [...new Set(
      items.map((i) => (i.category || "ROOFING").toUpperCase())
    )];

    console.log(`[finalize] O&P inputs: adjusterBase=$${adjusterBase}, supplementBase=$${supplementTotal}, trades=[${tradeCategories.join(",")}]`);

    let ohpResult: OhpResult;
    try {
      ohpResult = calculateOhp({
        adjusterEstimateBase: adjusterBase,
        supplementBase: supplementTotal,
        ohpAlreadyPaid: 0, // TODO: extract from adjuster estimate if available
        tradeCategories,
        competitiveMarket: false,
      });
      console.log(
        `[finalize] O&P calculated: ${ohpResult.tradeCount} trades, ` +
        `supplemental O&P = $${ohpResult.supplementalOhp.toFixed(2)}`
      );
    } catch (ohpErr) {
      console.warn("[finalize] O&P calculation failed (non-fatal):", ohpErr);
      // Fall back to zero O&P so finalization can still complete
      ohpResult = calculateOhp({
        adjusterEstimateBase: 0,
        supplementBase: 0,
        ohpAlreadyPaid: 0,
        tradeCategories: ["ROOFING"],
        competitiveMarket: false,
      });
    }

    // ── Insert O&P as a line item ──
    if (ohpResult.supplementalOhp > 0) {
      const ohpItem = {
        supplement_id: supplementId,
        xactimate_code: "GEN OHP",
        description: `Overhead & Profit — ${ohpResult.tradeCount} trades (${ohpResult.tradeNames.join(", ")})`,
        category: "General",
        quantity: 1,
        unit: "LS",
        unit_price: ohpResult.supplementalOhp,
        total_price: ohpResult.supplementalOhp,
        justification: ohpResult.multiTradeJustification,
        irc_reference: "N/A",
        confidence: ohpResult.tradeCount >= 3 ? 0.9 : 0.7,
        detection_source: "calculator_ohp",
        status: "accepted",
      };
      try {
        const { error: ohpInsertErr } = await admin.from("supplement_items").insert(ohpItem);
        if (ohpInsertErr) {
          console.error("[finalize] O&P DB insert error:", ohpInsertErr.message, ohpInsertErr.details);
        }
      } catch (insertErr) {
        console.error("[finalize] O&P insert threw:", insertErr);
      }
      // Always add to items array for PDF regardless of DB result
      items.push(ohpItem as typeof items[number]);
      supplementTotal += ohpResult.supplementalOhp;
      console.log(`[finalize] O&P line item: $${ohpResult.supplementalOhp.toFixed(2)} (${ohpResult.tradeCount} trades: ${ohpResult.tradeNames.join(", ")})`);
    }

    // Resolve county from claim ZIP for permit links
    const propertyZip = (claim.property_zip as string) || "";
    const countyData = propertyZip ? lookupCountyByZip(propertyZip) : undefined;

    // Helper: build reference links for a given item
    function buildReferenceLinks(item: {
      xactimate_code: string;
      irc_reference?: string | null;
    }): ReferenceLink[] {
      const links: ReferenceLink[] = [];

      // 1. IRC code link
      const ircRef = item.irc_reference || "";
      const ircUrl = ircSectionToUrl(ircRef);
      if (ircUrl) {
        links.push({
          type: "code",
          label: `IRC ${ircRef} — ICC Digital Codes`,
          url: ircUrl,
        });
      }

      // 2. Manufacturer install guide link
      const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
      if (mfrMatches.length > 0) {
        const first = mfrMatches[0];
        if (first.requirement.sourceUrl) {
          links.push({
            type: "manufacturer",
            label: `${first.manufacturer} Installation Instructions`,
            url: first.requirement.sourceUrl,
          });
        }
      }

      // 3. County permits / code office link
      if (countyData?.permit.ahjUrl) {
        links.push({
          type: "county",
          label: `${countyData.county} County, ${countyData.state} — Permits & Inspections`,
          url: countyData.permit.ahjUrl,
        });
      }

      return links;
    }

    // Build PDF data
    console.log("[finalize] Building PDF data...");
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
        confidence_score: item.confidence_score || Math.round((Number(item.confidence) || 0) * 100),
        confidence_tier: item.confidence_tier || "moderate",
        referenceLinks: buildReferenceLinks(item),
      })),
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    // Generate PDF
    let pdfBuffer: ArrayBuffer;
    try {
      pdfBuffer = generateSupplementPdf(pdfData);
      console.log(`[finalize] Supplement PDF generated: ${pdfBuffer.byteLength} bytes`);
    } catch (pdfErr) {
      console.error("[finalize] PDF generation failed:", pdfErr);
      return NextResponse.json(
        { error: "PDF generation failed: " + (pdfErr instanceof Error ? pdfErr.message : String(pdfErr)) },
        { status: 500 }
      );
    }

    // Upload to storage
    const pdfPath = `${supplement.company_id}/${supplementId}/supplement.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    try {
      const { error: uploadError } = await admin.storage
        .from("supplements")
        .upload(pdfPath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }
      console.log(`[finalize] PDF uploaded to: ${pdfPath}`);
    } catch (uploadErr) {
      console.error("[finalize] Storage upload failed:", uploadErr);
      return NextResponse.json(
        { error: "Failed to upload PDF to storage: " + (uploadErr instanceof Error ? uploadErr.message : String(uploadErr)) },
        { status: 500 }
      );
    }

    // Generate cover letter PDF
    const coverLetterData: CoverLetterData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
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
      itemCount: items.length,
      generatedDate: pdfData.generatedDate,
    };

    let coverLetterBuffer: ArrayBuffer | null = null;
    try {
      coverLetterBuffer = generateCoverLetter(coverLetterData);
      console.log(`[finalize] Cover letter generated: ${coverLetterBuffer.byteLength} bytes`);
    } catch (clErr) {
      console.error("[finalize] Cover letter generation failed:", clErr);
      console.error("[finalize] Cover letter data:", JSON.stringify({
        companyName: coverLetterData.companyName,
        carrierName: coverLetterData.carrierName,
        itemCount: coverLetterData.itemCount,
        supplementTotal: coverLetterData.supplementTotal,
        adjusterName: coverLetterData.adjusterName,
      }));
    }

    const coverLetterPath = `${supplement.company_id}/${supplementId}/cover-letter.pdf`;
    let coverLetterUploadError = true; // default to failed unless upload succeeds

    if (coverLetterBuffer) {
      const coverLetterBlob = new Blob([coverLetterBuffer], { type: "application/pdf" });
      try {
        const { error: clUploadErr } = await admin.storage
          .from("supplements")
          .upload(coverLetterPath, coverLetterBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (clUploadErr) {
          throw clUploadErr;
        }
        coverLetterUploadError = false;
        console.log(`[finalize] Cover letter uploaded to: ${coverLetterPath}`);
      } catch (clUploadErr) {
        console.error("[finalize] Cover letter upload failed (non-fatal):", clUploadErr);
      }
    }

    // Merge O&P calculation into existing adjuster_estimate_parsed JSONB
    const existingParsed = (supplement.adjuster_estimate_parsed || {}) as Record<string, unknown>;
    const updatedParsed = {
      ...existingParsed,
      ohp_calculation: {
        overheadRate: ohpResult.overheadRate,
        profitRate: ohpResult.profitRate,
        effectiveRate: ohpResult.effectiveRate,
        combinedScopeBase: ohpResult.combinedScopeBase,
        fullOhp: ohpResult.fullOhp,
        ohpAlreadyPaid: ohpResult.ohpAlreadyPaid,
        supplementalOhp: ohpResult.supplementalOhp,
        tradeCount: ohpResult.tradeCount,
        tradeNames: ohpResult.tradeNames,
        justification: ohpResult.multiTradeJustification,
        formula: ohpResult.formulaDisplay,
      },
    };

    // Update supplement record with PDF paths and O&P data
    try {
      const { error: dbUpdateError } = await admin
        .from("supplements")
        .update({
          generated_pdf_url: pdfPath,
          supplement_total: supplementTotal,
          adjuster_estimate_parsed: updatedParsed,
        })
        .eq("id", supplementId);

      if (dbUpdateError) {
        throw dbUpdateError;
      }
      console.log("[finalize] DB updated successfully");
    } catch (dbErr: unknown) {
      console.error("[finalize] DB update failed:", dbErr);
      const errMsg = dbErr instanceof Error
        ? dbErr.message
        : typeof dbErr === "object" && dbErr !== null && "message" in dbErr
          ? String((dbErr as Record<string, unknown>).message)
          : JSON.stringify(dbErr);
      return NextResponse.json(
        { error: "Failed to update supplement record: " + errMsg },
        { status: 500 }
      );
    }

    console.log(`[finalize] Complete — ${items.length} items, $${supplementTotal.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      pdfPath,
      coverLetterPath: coverLetterUploadError ? null : coverLetterPath,
      supplementTotal,
      itemCount: items.length,
      ohp: {
        supplementalOhp: ohpResult.supplementalOhp,
        tradeCount: ohpResult.tradeCount,
        effectiveRate: ohpResult.effectiveRate,
      },
    });
  } catch (err) {
    console.error("[finalize] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to finalize supplement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
