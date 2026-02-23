import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import JSZip from "jszip";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Auth check ───────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Fetch supplement + claim + carrier ────────────────────
  const { data: supplement, error } = await supabase
    .from("supplements")
    .select(
      `*, claims ( *, carriers ( * ) )`
    )
    .eq("id", id)
    .single();

  if (error || !supplement) {
    return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
  }

  const claim = supplement.claims as Record<string, unknown>;
  const carrier = (claim?.carriers as Record<string, unknown>) || null;

  // ── Fetch supplement items ────────────────────────────────
  const { data: items } = await supabase
    .from("supplement_items")
    .select("*")
    .eq("supplement_id", id)
    .order("category", { ascending: true })
    .order("xactimate_code", { ascending: true });

  // ── Fetch photos ──────────────────────────────────────────
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("claim_id", claim.id as string)
    .order("created_at", { ascending: true });

  // ── Create ZIP ────────────────────────────────────────────
  const zip = new JSZip();

  const claimName =
    (claim.notes as string) ||
    `Claim ${claim.claim_number || id.slice(0, 8)}`;
  const safeName = claimName.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 60);

  // ── 1. Adjuster Estimate PDF ──────────────────────────────
  if (supplement.adjuster_estimate_url) {
    try {
      const { data: estimateBlob } = await supabase.storage
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

  // ── 2. Carrier Response (if exists) ───────────────────────
  if (supplement.carrier_response_url) {
    try {
      const { data: responseBlob } = await supabase.storage
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

  // ── 3. Photos folder ──────────────────────────────────────
  if (photos && photos.length > 0) {
    const photosFolder = zip.folder("Photos");
    if (photosFolder) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        try {
          const { data: photoBlob } = await supabase.storage
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

  // ── 4. Supplement Summary (line items) ────────────────────
  const summaryLines: string[] = [];
  summaryLines.push("=".repeat(70));
  summaryLines.push("SUPPLEMENT SUMMARY");
  summaryLines.push("=".repeat(70));
  summaryLines.push("");
  summaryLines.push(`Claim:              ${claimName}`);
  summaryLines.push(`Claim #:            ${claim.claim_number || "—"}`);
  summaryLines.push(`Policy #:           ${claim.policy_number || "—"}`);
  summaryLines.push(`Carrier:            ${(carrier?.name as string) || "—"}`);
  summaryLines.push(
    `Property:           ${[
      claim.property_address,
      claim.property_city,
      claim.property_state,
      claim.property_zip,
    ]
      .filter(Boolean)
      .join(", ") || "—"}`
  );
  summaryLines.push(
    `Date of Loss:       ${
      claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "—"
    }`
  );
  summaryLines.push("");
  summaryLines.push("-".repeat(70));
  summaryLines.push("FINANCIAL SUMMARY");
  summaryLines.push("-".repeat(70));
  summaryLines.push(
    `Adjuster Total:     ${
      supplement.adjuster_total
        ? `$${Number(supplement.adjuster_total).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`
        : "—"
    }`
  );
  summaryLines.push(
    `Supplement Total:   ${
      supplement.supplement_total
        ? `$${Number(supplement.supplement_total).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`
        : "—"
    }`
  );
  const recovery =
    supplement.supplement_total && supplement.adjuster_total
      ? Number(supplement.supplement_total) - Number(supplement.adjuster_total)
      : null;
  summaryLines.push(
    `Recovery Amount:    ${
      recovery != null
        ? `$${recovery.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}`
        : "—"
    }`
  );

  // Measurements
  if (claim.roof_squares || claim.roof_pitch) {
    summaryLines.push("");
    summaryLines.push("-".repeat(70));
    summaryLines.push("MEASUREMENTS");
    summaryLines.push("-".repeat(70));
    if (claim.roof_squares)
      summaryLines.push(`Measured Squares:   ${claim.roof_squares}`);
    if (claim.waste_percent)
      summaryLines.push(`Waste %:            ${claim.waste_percent}%`);
    if (claim.suggested_squares)
      summaryLines.push(`Suggested Squares:  ${claim.suggested_squares}`);
    if (claim.roof_pitch)
      summaryLines.push(`Pitch:              ${claim.roof_pitch}`);
    if (claim.ft_ridges)
      summaryLines.push(`Ridges:             ${claim.ft_ridges} ft`);
    if (claim.ft_hips)
      summaryLines.push(`Hips:               ${claim.ft_hips} ft`);
    if (claim.ft_valleys)
      summaryLines.push(`Valleys:            ${claim.ft_valleys} ft`);
    if (claim.ft_rakes)
      summaryLines.push(`Rakes:              ${claim.ft_rakes} ft`);
    if (claim.ft_eaves)
      summaryLines.push(`Eaves:              ${claim.ft_eaves} ft`);
    if (claim.ft_drip_edge)
      summaryLines.push(`Drip Edge:          ${claim.ft_drip_edge} ft`);
    if (claim.ft_flashing)
      summaryLines.push(`Flashing:           ${claim.ft_flashing} ft`);
    if (claim.ft_step_flashing)
      summaryLines.push(`Step Flashing:      ${claim.ft_step_flashing} ft`);
  }

  // Line items
  if (items && items.length > 0) {
    summaryLines.push("");
    summaryLines.push("-".repeat(70));
    summaryLines.push("SUPPLEMENT LINE ITEMS");
    summaryLines.push("-".repeat(70));
    summaryLines.push("");

    items.forEach((item, i) => {
      summaryLines.push(`${i + 1}. ${item.xactimate_code} — ${item.description}`);
      summaryLines.push(`   Category:  ${item.category || "—"}`);
      summaryLines.push(
        `   Quantity:  ${item.quantity ?? "—"} ${item.unit || ""}`
      );
      if (item.unit_price)
        summaryLines.push(`   Unit Price: $${Number(item.unit_price).toFixed(2)}`);
      if (item.total_price)
        summaryLines.push(`   Total:      $${Number(item.total_price).toFixed(2)}`);
      summaryLines.push("");
    });
  }

  summaryLines.push("");
  summaryLines.push("=".repeat(70));
  summaryLines.push(
    `Generated by 4Margin on ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`
  );

  zip.file("Supplement_Summary.txt", summaryLines.join("\n"));

  // ── 5. Justification / Support Document ───────────────────
  const justLines: string[] = [];
  justLines.push("=".repeat(70));
  justLines.push("SUPPLEMENT JUSTIFICATION — SUPPORTING POINTS");
  justLines.push("=".repeat(70));
  justLines.push("");
  justLines.push(
    "Use the following points to support your supplement when"
  );
  justLines.push(
    "communicating with the carrier. Personalize the language before"
  );
  justLines.push("including in your email or written correspondence.");
  justLines.push("");
  justLines.push(`Claim #:   ${claim.claim_number || "—"}`);
  justLines.push(`Carrier:   ${(carrier?.name as string) || "—"}`);
  justLines.push(`Property:  ${claim.property_address || "—"}`);
  justLines.push("");

  if (items && items.length > 0) {
    justLines.push("-".repeat(70));
    justLines.push("");

    items.forEach((item, i) => {
      justLines.push(
        `${i + 1}. ${item.xactimate_code} — ${item.description}`
      );
      justLines.push("");
      if (item.justification) {
        justLines.push(`   JUSTIFICATION:`);
        justLines.push(`   ${item.justification}`);
        justLines.push("");
      }
      if (item.irc_reference) {
        justLines.push(`   CODE REFERENCE: ${item.irc_reference}`);
        justLines.push("");
      }
      if (
        item.photo_references &&
        (item.photo_references as string[]).length > 0
      ) {
        justLines.push(
          `   PHOTO EVIDENCE: See ${(item.photo_references as string[]).join(", ")}`
        );
        justLines.push("");
      }
      justLines.push("-".repeat(70));
      justLines.push("");
    });
  } else {
    justLines.push(
      "[No line items have been added to this supplement yet.]"
    );
    justLines.push("");
    justLines.push(
      "Once the AI pipeline processes the estimate, justifications"
    );
    justLines.push("for each missing or underpaid item will appear here.");
    justLines.push("");
  }

  // Waste justification (always useful)
  if (claim.waste_percent && claim.roof_squares) {
    justLines.push("=".repeat(70));
    justLines.push("WASTE PERCENTAGE JUSTIFICATION");
    justLines.push("=".repeat(70));
    justLines.push("");
    justLines.push(
      `The roof measures ${claim.roof_squares} squares with a calculated waste`
    );
    justLines.push(
      `factor of ${claim.waste_percent}%. This accounts for cuts required by`
    );
    justLines.push(
      `the roof geometry (hips, valleys, dormers) and manufacturer`
    );
    justLines.push(`specifications for the installed product.`);
    justLines.push("");
    if (claim.suggested_squares) {
      justLines.push(
        `Adjusted total: ${claim.suggested_squares} squares including waste.`
      );
    }
    justLines.push("");
  }

  justLines.push("─".repeat(70));
  justLines.push(
    `Generated by 4Margin on ${new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`
  );

  zip.file("Justification_Support_Points.txt", justLines.join("\n"));

  // ── Generate ZIP and respond ──────────────────────────────
  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}_Supplement.zip"`,
    },
  });
}
