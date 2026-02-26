/**
 * AI Pipeline Orchestrator
 *
 * Runs the supplement analysis pipeline:
 * 1. Download estimate PDF from storage
 * 2. Run missing item detection (Claude analyzes estimate + measurements)
 * 3. Download and analyze photos (Claude Vision)
 * 4. Insert supplement_items into DB
 * 5. Fetch weather data + generate weather report PDF
 * 6. Update supplement record with totals + status
 *
 * NOTE: The supplement PDF is NOT generated here. Users review detected
 * items, select/deselect, then trigger PDF via /api/supplements/[id]/finalize.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { detectMissingItems, type AnalysisInput } from "./analyze";
import { analyzePhotos, type PhotoAnalysisResult } from "./photos";
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
    // Note: status stays as "generating" during pipeline execution
    // The "generating" status triggers AutoRefresh polling on the frontend
    const pipelineStartMs = Date.now();
    console.log(`[pipeline] Starting pipeline for supplement ${supplementId}`);

    // ── 1. Fetch claim data ──
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("*")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      throw new Error(`Claim not found: ${claimError?.message}`);
    }

    // ── 2. Fetch supplement to get estimate URL + policy analysis ──
    // Select all columns — avoids "column not found" error if migration 019
    // (policy_analysis) hasn't been applied yet. The column is optional.
    const { data: supplement } = await supabase
      .from("supplements")
      .select("*")
      .eq("id", supplementId)
      .single();

    if (!supplement?.adjuster_estimate_url) {
      throw new Error("No estimate PDF found for this supplement");
    }

    // ── 3. Download estimate PDF as base64 ──
    // We send the PDF inline (base64) to Claude instead of a signed URL
    // because Claude's servers may not be able to reach Supabase storage URLs.
    const { data: estimateBlob, error: estimateDownloadError } = await supabase.storage
      .from("estimates")
      .download(supplement.adjuster_estimate_url);

    if (estimateDownloadError || !estimateBlob) {
      throw new Error(`Failed to download estimate PDF: ${estimateDownloadError?.message}`);
    }

    const estimateBuffer = await estimateBlob.arrayBuffer();
    const estimatePdfBase64 = Buffer.from(estimateBuffer).toString("base64");

    console.log(`[pipeline] Estimate PDF downloaded: ${supplement.adjuster_estimate_url} (${Math.round(estimateBuffer.byteLength / 1024)}KB)`);

    // ── 4. Run missing item detection ──
    // Build policy context string for the AI if policy analysis exists
    const policyAnalysisData = supplement.policy_analysis as Record<string, unknown> | null;
    let policyContext: string | null = null;
    if (policyAnalysisData) {
      const pa = policyAnalysisData;
      const parts: string[] = [];
      parts.push(`Policy Type: ${pa.policyType || "Unknown"}`);
      parts.push(`Depreciation: ${pa.depreciationMethod || "Unknown"}`);
      if (Array.isArray(pa.deductibles) && pa.deductibles.length > 0) {
        parts.push(`Deductibles: ${(pa.deductibles as Array<{amount: string; appliesTo: string}>).map(d => `${d.amount} (${d.appliesTo})`).join("; ")}`);
      }
      if (Array.isArray(pa.landmines) && pa.landmines.length > 0) {
        parts.push(`\nWARNING — Policy Landmines (dangerous provisions that may limit coverage):`);
        (pa.landmines as Array<{name: string; impact: string; actionItem: string}>).forEach(l => {
          parts.push(`- ${l.name}: ${l.impact}. Action: ${l.actionItem}`);
        });
      }
      if (Array.isArray(pa.favorableProvisions) && pa.favorableProvisions.length > 0) {
        parts.push(`\nFAVORABLE — Provisions that support the supplement:`);
        (pa.favorableProvisions as Array<{name: string; impact: string; supplementRelevance: string}>).forEach(f => {
          parts.push(`- ${f.name}: ${f.impact}. Relevance: ${f.supplementRelevance}`);
        });
      }
      policyContext = parts.join("\n");
    }

    const analysisInput: AnalysisInput = {
      supplementId,
      estimatePdfBase64: estimatePdfBase64,
      claimDescription: claim.description || "",
      adjusterScopeNotes: claim.adjuster_scope_notes || "",
      itemsBelievedMissing: claim.items_believed_missing || "",
      damageTypes: claim.damage_types || [],
      policyContext,
      propertyState: claim.property_state || null,
      measurements: {
        measuredSquares: claim.roof_squares ? Number(claim.roof_squares) : null,
        wastePercent: claim.waste_percent ? Number(claim.waste_percent) : null,
        suggestedSquares: claim.suggested_squares ? Number(claim.suggested_squares) : null,
        totalRoofArea: claim.total_roof_area ? Number(claim.total_roof_area) : null,
        totalRoofAreaLessPenetrations: claim.total_roof_area_less_penetrations ? Number(claim.total_roof_area_less_penetrations) : null,
        pitch: claim.roof_pitch || null,
        pitchBreakdown: Array.isArray(claim.pitch_breakdown) ? claim.pitch_breakdown : [],
        structureComplexity: claim.structure_complexity || null,
        ftRidges: claim.ft_ridges ? Number(claim.ft_ridges) : null,
        ftHips: claim.ft_hips ? Number(claim.ft_hips) : null,
        ftValleys: claim.ft_valleys ? Number(claim.ft_valleys) : null,
        ftRakes: claim.ft_rakes ? Number(claim.ft_rakes) : null,
        ftEaves: claim.ft_eaves ? Number(claim.ft_eaves) : null,
        ftDripEdge: claim.ft_drip_edge ? Number(claim.ft_drip_edge) : null,
        ftParapet: claim.ft_parapet ? Number(claim.ft_parapet) : null,
        ftFlashing: claim.ft_flashing ? Number(claim.ft_flashing) : null,
        ftStepFlashing: claim.ft_step_flashing ? Number(claim.ft_step_flashing) : null,
        numRidges: claim.num_ridges ? Number(claim.num_ridges) : null,
        numHips: claim.num_hips ? Number(claim.num_hips) : null,
        numValleys: claim.num_valleys ? Number(claim.num_valleys) : null,
        numRakes: claim.num_rakes ? Number(claim.num_rakes) : null,
        numEaves: claim.num_eaves ? Number(claim.num_eaves) : null,
        totalPenetrationsArea: claim.total_penetrations_area ? Number(claim.total_penetrations_area) : null,
        totalPenetrationsPerimeter: claim.total_penetrations_perimeter ? Number(claim.total_penetrations_perimeter) : null,
        accessories: claim.accessories || null,
      },
    };

    const analysisResult = await detectMissingItems(analysisInput);

    // ── 5. Analyze photos (best-effort, non-blocking) ──
    // Photo analysis is supplementary — don't let it block or timeout the pipeline.
    // Skip if we've already used >90s to leave time for weather + DB writes.
    let photoAnalyses = new Map<string, PhotoAnalysisResult>();
    const elapsedMs = Date.now() - pipelineStartMs;

    if (elapsedMs > 90_000) {
      console.warn(`[pipeline] Skipping photo analysis — already ${Math.round(elapsedMs / 1000)}s elapsed`);
    } else {
      try {
        const { data: photos } = await supabase
          .from("photos")
          .select("id, storage_path, mime_type")
          .eq("claim_id", claimId);

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
      } catch (photoErr) {
        console.error("[pipeline] Photo analysis failed (non-blocking):", photoErr);
        // Continue — photo analysis never blocks the pipeline
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
        irc_verified: item.irc_verified || false,
        irc_source_ref: item.irc_source_ref || null,
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

    // ── 7. Fetch company info for weather report ──
    const { data: company } = await supabase
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", companyId)
      .single();

    const propertyAddress = [
      claim.property_address,
      claim.property_city,
      claim.property_state,
      claim.property_zip,
    ]
      .filter(Boolean)
      .join(", ");

    const dateOfLossFormatted = claim.date_of_loss
      ? new Date(claim.date_of_loss).toLocaleDateString("en-US")
      : "";

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // NOTE: Supplement PDF is NOT generated here. Users review and
    // select/deselect line items first, then trigger PDF generation
    // via the /api/supplements/[id]/finalize endpoint.

    // ── 8. Fetch weather data & generate weather report PDF (non-blocking) ──
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
            propertyAddress,
            dateOfLoss: dateOfLossFormatted,
            claimNumber: claim.claim_number || "",
            companyName: company?.name || "",
            weather: weatherData,
            generatedDate,
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

    // ── 9. Update supplement record ──
    // Note: paid_at is already set by checkout route (free) or Stripe webhook (paid)
    // before the pipeline runs — no auto-unlock logic needed here.
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
        generated_pdf_url: null, // PDF generated later after user reviews items
        adjuster_estimate_parsed: {
          summary: analysisResult.summary,
          item_count: analysisResult.items.length,
          photo_analyses: Object.fromEntries(photoAnalyses),
          debug_raw: analysisResult.debugRawResponse || null,
        },
        // Weather verification data
        weather_data: weatherData,
        weather_pdf_url: weatherPdfPath,
      })
      .eq("id", supplementId);

    // ── 10. Send "supplement ready" email (fire-and-forget) ──
    sendSupplementReadyEmail(
      supplementId,
      analysisResult.items.length,
      false
    ).catch(() => {});

    return {
      success: true,
      supplementId,
      itemCount: analysisResult.items.length,
      supplementTotal: analysisResult.supplement_total,
    };
  } catch (err) {
    console.error(`[pipeline] Error for supplement ${supplementId}:`, err);

    // Update supplement with error info but keep status as "complete" so the UI can display the error
    await supabase
      .from("supplements")
      .update({
        status: "complete",
        adjuster_estimate_parsed: {
          error: err instanceof Error ? err.message : "Pipeline failed",
          error_type: "pipeline_failure",
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
