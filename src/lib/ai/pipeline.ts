/**
 * AI Pipeline Orchestrator
 *
 * Runs the full supplement generation pipeline:
 * 1. Download estimate PDF from storage
 * 2. Run missing item detection (Claude analyzes estimate + measurements)
 * 3. Download and analyze photos (Claude Vision)
 * 4. Insert supplement_items into DB
 * 5. Generate professional supplement PDF
 * 6. Upload PDF to storage
 * 7. Update supplement record with totals + status
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { detectMissingItems, type AnalysisInput } from "./analyze";
import { analyzePhotos, type PhotoAnalysisResult } from "./photos";
import { generateSupplementPdf, type SupplementPdfData } from "@/lib/pdf/generate-supplement";
import { generateWeatherReportPdf } from "@/lib/pdf/generate-weather-report";
import { fetchWeatherData, type WeatherData } from "@/lib/weather/fetch-weather";
import { sendSupplementReadyEmail, sendPipelineErrorEmail } from "@/lib/email/send";

export interface PipelineInput {
  supplementId: string;
  claimId: string;
  companyId: string;
}

export interface PipelineResult {
  success: boolean;
  supplementId: string;
  itemCount: number;
  supplementTotal: number;
  error?: string;
}

export async function runSupplementPipeline(
  input: PipelineInput
): Promise<PipelineResult> {
  const supabase = createAdminClient();
  const { supplementId, claimId, companyId } = input;

  try {
    // ── Update status to analyzing ──
    await supabase
      .from("supplements")
      .update({ status: "analyzing" })
      .eq("id", supplementId);

    // ── 1. Fetch claim data ──
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      throw new Error(`Claim not found: ${claimError?.message}`);
    }

    // ── 2. Fetch supplement to get estimate URL ──
    const { data: supplement } = await supabase
      .from("supplements")
      .select("adjuster_estimate_url")
      .eq("id", supplementId)
      .single();

    if (!supplement?.adjuster_estimate_url) {
      throw new Error("No estimate PDF found for this supplement");
    }

    // ── 3. Download estimate PDF from storage ──
    const { data: estimateBlob, error: dlError } = await supabase.storage
      .from("estimates")
      .download(supplement.adjuster_estimate_url);

    if (dlError || !estimateBlob) {
      throw new Error(`Failed to download estimate: ${dlError?.message}`);
    }

    const estimateBuffer = await estimateBlob.arrayBuffer();
    const estimatePdfBase64 = Buffer.from(estimateBuffer).toString("base64");

    // ── 4. Run missing item detection ──
    const analysisInput: AnalysisInput = {
      supplementId,
      estimatePdfBase64,
      claimDescription: claim.description || "",
      adjusterScopeNotes: claim.adjuster_scope_notes || "",
      itemsBelievedMissing: claim.items_believed_missing || "",
      damageTypes: claim.damage_types || [],
      measurements: {
        measuredSquares: claim.roof_squares ? Number(claim.roof_squares) : null,
        wastePercent: claim.waste_percent ? Number(claim.waste_percent) : null,
        suggestedSquares: claim.suggested_squares ? Number(claim.suggested_squares) : null,
        pitch: claim.roof_pitch || null,
        ftRidges: claim.ft_ridges ? Number(claim.ft_ridges) : null,
        ftHips: claim.ft_hips ? Number(claim.ft_hips) : null,
        ftValleys: claim.ft_valleys ? Number(claim.ft_valleys) : null,
        ftRakes: claim.ft_rakes ? Number(claim.ft_rakes) : null,
        ftEaves: claim.ft_eaves ? Number(claim.ft_eaves) : null,
        ftDripEdge: claim.ft_drip_edge ? Number(claim.ft_drip_edge) : null,
        ftParapet: claim.ft_parapet ? Number(claim.ft_parapet) : null,
        ftFlashing: claim.ft_flashing ? Number(claim.ft_flashing) : null,
        ftStepFlashing: claim.ft_step_flashing ? Number(claim.ft_step_flashing) : null,
        accessories: claim.accessories || null,
      },
    };

    const analysisResult = await detectMissingItems(analysisInput);

    // ── 5. Analyze photos in parallel ──
    const { data: photos } = await supabase
      .from("photos")
      .select("id, storage_path, mime_type")
      .eq("claim_id", claimId);

    let photoAnalyses = new Map<string, PhotoAnalysisResult>();

    if (photos && photos.length > 0) {
      const photoData: Array<{ id: string; base64: string; mimeType: string }> = [];

      for (const photo of photos) {
        try {
          const { data: photoBlob } = await supabase.storage
            .from("photos")
            .download(photo.storage_path);
          if (photoBlob) {
            const buffer = await photoBlob.arrayBuffer();
            photoData.push({
              id: photo.id,
              base64: Buffer.from(buffer).toString("base64"),
              mimeType: photo.mime_type || "image/jpeg",
            });
          }
        } catch {
          // Skip photos that fail to download
        }
      }

      if (photoData.length > 0) {
        photoAnalyses = await analyzePhotos(photoData);
      }

      // Update photos with vision analysis results
      for (const [photoId, analysis] of photoAnalyses) {
        await supabase
          .from("photos")
          .update({
            vision_analysis: analysis,
            tags: analysis.damage_types,
          })
          .eq("id", photoId);
      }
    }

    // ── 6. Insert supplement_items ──
    if (analysisResult.items.length > 0) {
      const itemRows = analysisResult.items.map((item) => ({
        supplement_id: supplementId,
        xactimate_code: item.xactimate_code,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        justification: item.justification,
        irc_reference: item.irc_reference,
        confidence: item.confidence,
        detection_source: item.detection_source,
        status: "detected",
      }));

      const { error: itemsError } = await supabase
        .from("supplement_items")
        .insert(itemRows);

      if (itemsError) {
        console.error("Failed to insert supplement items:", itemsError);
      }
    }

    // ── 7. Fetch company info for PDF ──
    const { data: company } = await supabase
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", companyId)
      .single();

    const companyAddress = company
      ? [company.address, company.city, company.state, company.zip]
          .filter(Boolean)
          .join(", ")
      : "";

    // ── 8. Generate supplement PDF ──
    const pdfData: SupplementPdfData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
      claimName: claim.notes || `Claim #${claim.claim_number || ""}`,
      claimNumber: claim.claim_number || "",
      policyNumber: claim.policy_number || "",
      carrierName: "",
      propertyAddress: [
        claim.property_address,
        claim.property_city,
        claim.property_state,
        claim.property_zip,
      ]
        .filter(Boolean)
        .join(", "),
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss).toLocaleDateString("en-US")
        : "",
      adjusterName: claim.adjuster_name || "",
      adjusterTotal: analysisResult.adjuster_total,
      supplementTotal: analysisResult.supplement_total,
      measuredSquares: claim.roof_squares ? Number(claim.roof_squares) : null,
      wastePercent: claim.waste_percent ? Number(claim.waste_percent) : null,
      suggestedSquares: claim.suggested_squares ? Number(claim.suggested_squares) : null,
      pitch: claim.roof_pitch || null,
      items: analysisResult.items.map((item) => ({
        xactimate_code: item.xactimate_code,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        justification: item.justification,
        irc_reference: item.irc_reference,
      })),
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    // Get carrier name
    if (claim.carrier_id) {
      const { data: carrier } = await supabase
        .from("carriers")
        .select("name")
        .eq("id", claim.carrier_id)
        .single();
      if (carrier) pdfData.carrierName = carrier.name;
    }

    const pdfBuffer = generateSupplementPdf(pdfData);

    // ── 8b. Fetch weather data & generate weather report PDF (non-blocking) ──
    let weatherData: WeatherData | null = null;
    let weatherPdfPath: string | null = null;

    if (claim.date_of_loss && claim.property_address) {
      try {
        const fullAddress = [
          claim.property_address,
          claim.property_city,
          claim.property_state,
          claim.property_zip,
        ]
          .filter(Boolean)
          .join(", ");

        weatherData = await fetchWeatherData(fullAddress, claim.date_of_loss);

        if (weatherData) {
          const weatherPdfBuffer = generateWeatherReportPdf({
            propertyAddress: pdfData.propertyAddress,
            dateOfLoss: pdfData.dateOfLoss,
            claimNumber: pdfData.claimNumber,
            companyName: pdfData.companyName,
            weather: weatherData,
            generatedDate: pdfData.generatedDate,
          });

          weatherPdfPath = `${companyId}/${supplementId}/weather-report.pdf`;
          const weatherBlob = new Blob([weatherPdfBuffer], {
            type: "application/pdf",
          });

          const { error: weatherUploadError } = await supabase.storage
            .from("supplements")
            .upload(weatherPdfPath, weatherBlob, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (weatherUploadError) {
            console.error(
              "Failed to upload weather PDF:",
              weatherUploadError
            );
            weatherPdfPath = null;
          } else {
            console.log(
              `[pipeline] Weather report generated: ${weatherData.verdict}`
            );
          }
        }
      } catch (weatherError) {
        console.error(
          "[pipeline] Weather fetch failed (non-blocking):",
          weatherError
        );
        // Continue — weather is supplementary, never blocks the pipeline
      }
    }

    // ── 9. Upload PDF to storage ──
    const pdfPath = `${companyId}/${supplementId}/supplement.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadError } = await supabase.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload supplement PDF:", uploadError);
    }

    // ── 10. Check if first supplement (free tier) ──
    const { count: priorPaidCount } = await supabase
      .from("supplements")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .not("paid_at", "is", null);

    const isFirstSupplement = (priorPaidCount ?? 0) === 0;

    // Also check there are no other completed supplements with paid_at
    const { count: priorCompleteCount } = await supabase
      .from("supplements")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "complete")
      .neq("id", supplementId);

    const shouldAutoUnlock = isFirstSupplement && (priorCompleteCount ?? 0) === 0;

    // ── 11. Update supplement record ──
    await supabase
      .from("supplements")
      .update({
        status: "complete",
        adjuster_total: analysisResult.adjuster_total,
        supplement_total: analysisResult.supplement_total,
        recovery_estimate:
          analysisResult.adjuster_total != null
            ? analysisResult.supplement_total
            : null,
        waste_adjuster: analysisResult.waste_adjuster,
        generated_pdf_url: uploadError ? null : pdfPath,
        adjuster_estimate_parsed: {
          summary: analysisResult.summary,
          item_count: analysisResult.items.length,
          photo_analyses: Object.fromEntries(photoAnalyses),
        },
        // Weather verification data
        weather_data: weatherData,
        weather_pdf_url: weatherPdfPath,
        // Auto-unlock first supplement for free
        ...(shouldAutoUnlock ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq("id", supplementId);

    // ── 12. Send "supplement ready" email (fire-and-forget) ──
    sendSupplementReadyEmail(
      supplementId,
      analysisResult.items.length,
      shouldAutoUnlock
    ).catch(() => {});

    return {
      success: true,
      supplementId,
      itemCount: analysisResult.items.length,
      supplementTotal: analysisResult.supplement_total,
    };
  } catch (err) {
    console.error(`[pipeline] Error for supplement ${supplementId}:`, err);

    // Update status to show error (keep as "generating" so user knows something went wrong)
    await supabase
      .from("supplements")
      .update({
        status: "complete",
        adjuster_estimate_parsed: {
          error: err instanceof Error ? err.message : "Pipeline failed",
          failed_at: new Date().toISOString(),
        },
      })
      .eq("id", supplementId);

    // Send error notification (fire-and-forget)
    sendPipelineErrorEmail(supplementId).catch(() => {});

    return {
      success: false,
      supplementId,
      itemCount: 0,
      supplementTotal: 0,
      error: err instanceof Error ? err.message : "Pipeline failed",
    };
  }
}
