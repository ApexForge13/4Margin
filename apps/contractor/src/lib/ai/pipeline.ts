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
import { detectMissingItems, type AnalysisInput, type DetectedItem } from "./analyze";
import { analyzePhotos, type PhotoAnalysisResult } from "./photos";
import { parsePolicyPdfV2 } from "@/lib/ai/policy-parser";
import { generateWeatherReportPdf } from "@/lib/pdf/generate-weather-report";
import { fetchWeatherData, shouldIncludeWeatherReport, type WeatherData } from "@/lib/weather/fetch-weather";
import { sendSupplementReadyEmail, sendPipelineErrorEmail } from "@/lib/email/send";
import {
  scoreConfidence,
  type ConfidenceInput,
  type ConfidenceResult,
} from "@/lib/scoring/confidence";
import { calculateWaste, type WasteResult } from "@/lib/calculators/waste";
import {
  calculateIwsSteepPitch,
  isSteepPitch,
  type IwsResult,
  type FacetInput,
} from "@/lib/calculators/iws-steep";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";
import { lookupCountyByZip, resolveCountyByName } from "@/data/county-jurisdictions";
import { geocodeAddress } from "@/lib/geocode";

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

    // ── 4. Parse policy PDF with full claim context (deferred from wizard) ──
    // Policy PDF is stored during wizard upload but parsed HERE so the AI
    // has access to claim description, damage types, etc. for better analysis.
    let policyContext: string | null = null;
    const policyPdfUrl = (supplement as Record<string, unknown>).policy_pdf_url as string | null;
    const existingPolicyAnalysis = supplement.policy_analysis as Record<string, unknown> | null;

    if (policyPdfUrl && !existingPolicyAnalysis) {
      // New flow: download PDF and parse with claim context
      try {
        console.log(`[pipeline] Downloading policy PDF: ${policyPdfUrl}`);
        const { data: policyBlob, error: policyDownloadError } = await supabase.storage
          .from("policies")
          .download(policyPdfUrl);

        if (policyDownloadError || !policyBlob) {
          console.error(`[pipeline] Failed to download policy PDF: ${policyDownloadError?.message}`);
        } else {
          const policyBuffer = await policyBlob.arrayBuffer();
          const policyPdfBase64 = Buffer.from(policyBuffer).toString("base64");
          console.log(`[pipeline] Policy PDF downloaded (${Math.round(policyBuffer.byteLength / 1024)}KB). Parsing with claim context...`);

          const claimType = (claim.damage_types as string[] | null)?.[0] || undefined;
          const claimDesc = (claim.description as string) || undefined;

          const policyAnalysis = await parsePolicyPdfV2(policyPdfBase64, claimType, claimDesc);
          console.log(`[pipeline] Policy analysis complete. Risk: ${policyAnalysis.riskLevel}, Landmines: ${policyAnalysis.landmines.length}`);

          // Save to supplement so it shows on detail page + won't re-parse on retry
          await supabase
            .from("supplements")
            .update({ policy_analysis: policyAnalysis })
            .eq("id", supplementId);

          policyContext = buildPolicyContextString(policyAnalysis as unknown as Record<string, unknown>);
        }
      } catch (policyErr) {
        console.error("[pipeline] Policy parse failed (non-blocking):", policyErr);
        // Continue — policy analysis never blocks the pipeline
      }
    } else if (existingPolicyAnalysis) {
      // Backward compatibility: use pre-existing policy_analysis (old supplements or retry)
      policyContext = buildPolicyContextString(existingPolicyAnalysis);
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
      propertyZip: claim.property_zip || null,
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

    // ── 4b. Backfill claim data from extracted estimate metadata ──
    // If the AI extracted claim/contractor fields from the PDF, update any
    // missing fields on the claims table. Only fills blanks — never overwrites
    // data the user manually entered.
    if (analysisResult.extractedClaimData) {
      try {
        const ex = analysisResult.extractedClaimData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const claimUpdate: Record<string, any> = {};

        if (ex.claim_number && !claim.claim_number) claimUpdate.claim_number = ex.claim_number;
        if (ex.policy_number && !claim.policy_number) claimUpdate.policy_number = ex.policy_number;
        if (ex.property_address && !claim.property_address) claimUpdate.property_address = ex.property_address;
        if (ex.property_city && !claim.property_city) claimUpdate.property_city = ex.property_city;
        if (ex.property_state && !claim.property_state) claimUpdate.property_state = ex.property_state;
        if (ex.property_zip && !claim.property_zip) claimUpdate.property_zip = ex.property_zip;
        if (ex.date_of_loss && !claim.date_of_loss) claimUpdate.date_of_loss = ex.date_of_loss;
        if (ex.adjuster_name && !claim.adjuster_name) claimUpdate.adjuster_name = ex.adjuster_name;
        if (ex.adjuster_email && !claim.adjuster_email) claimUpdate.adjuster_email = ex.adjuster_email;
        if (ex.adjuster_phone && !claim.adjuster_phone) claimUpdate.adjuster_phone = ex.adjuster_phone;

        // Handle carrier: upsert to carriers table and set carrier_id if missing
        if (ex.carrier_name && !claim.carrier_id) {
          const { data: carrier } = await supabase
            .from("carriers")
            .upsert({ name: ex.carrier_name.trim() }, { onConflict: "name" })
            .select("id")
            .single();
          if (carrier?.id) {
            claimUpdate.carrier_id = carrier.id;
          }
        }

        if (Object.keys(claimUpdate).length > 0) {
          await supabase.from("claims").update(claimUpdate).eq("id", claimId);
          console.log(`[pipeline] Backfilled claim fields: ${Object.keys(claimUpdate).join(", ")}`);
        }
      } catch (backfillErr) {
        console.error("[pipeline] Claim data backfill failed (non-blocking):", backfillErr);
        // Continue — backfill is best-effort, never blocks the pipeline
      }
    }

    // ── 4c. Confidence scoring — enrich each item with 4-dimension score ──
    // Replaces the AI's raw confidence (0-1 gut feeling) with a structured
    // score based on policy, code, manufacturer, and carrier data.

    // Resolve county: try Census geocoding first (accurate), fall back to ZIP lookup
    let countyInfo = claim.property_zip
      ? lookupCountyByZip(claim.property_zip)
      : null;

    if (claim.property_address && claim.property_city && claim.property_state) {
      try {
        const geocodeResult = await geocodeAddress(
          claim.property_address,
          claim.property_city,
          claim.property_state,
          claim.property_zip || undefined
        );
        if (geocodeResult.success) {
          const { county, state: geoState } = geocodeResult.data;
          // Try to match against our jurisdiction database
          if (geoState === "MD" || geoState === "PA" || geoState === "DE") {
            const geoCounty = resolveCountyByName(county, geoState);
            if (geoCounty) {
              countyInfo = geoCounty;
              console.log(`[pipeline] Geocoded county: ${county}, ${geoState} (FIPS: ${geocodeResult.data.fipsCode})`);
            }
          }
        }
      } catch (geoErr) {
        console.warn("[pipeline] Geocoding failed (using ZIP fallback):", geoErr);
        // Continue with ZIP-based lookup
      }
    }

    // Extract policy analysis for confidence scoring
    const policyAnalysisObj = (existingPolicyAnalysis ||
      (supplement.policy_analysis as Record<string, unknown> | null)) as Record<string, unknown> | null;

    const hasOrdinanceLaw = policyAnalysisObj
      ? Boolean(
          Array.isArray(policyAnalysisObj.favorableProvisions) &&
          (policyAnalysisObj.favorableProvisions as Array<{ name: string }>).some(
            (p) => p.name?.toLowerCase().includes("ordinance")
          )
        )
      : false;

    const coverageType = ((): "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN" => {
      if (!policyAnalysisObj) return "UNKNOWN";
      const dep = String(policyAnalysisObj.depreciationMethod || "").toUpperCase();
      if (dep.includes("RCV") || dep.includes("REPLACEMENT")) return "RCV";
      if (dep.includes("MODIFIED")) return "MODIFIED_ACV";
      if (dep.includes("ACV") || dep.includes("ACTUAL")) return "ACV";
      return "UNKNOWN";
    })();

    const confidenceDetails: Array<{ xactimateCode: string; result: ConfidenceResult }> = [];

    for (const item of analysisResult.items) {
      // Check manufacturer requirements for this Xactimate code
      const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
      const hasMfrReq = mfrMatches.length > 0;
      const firstMatch = mfrMatches[0];

      const confidenceInput: ConfidenceInput = {
        policy: {
          hasOrdinanceLaw,
          coverageType,
          relevantEndorsements: hasOrdinanceLaw ? ["Ordinance or Law"] : [],
          policyExcludesItem: false,
        },
        code: {
          isCodeRequired: item.irc_verified || false,
          r9052_1Confirmed: item.irc_verified || false,
          r9052_1Unverified: !item.irc_verified && !!item.irc_reference && item.irc_reference !== "N/A",
          ircReferenced: !!item.irc_reference && item.irc_reference !== "N/A",
          countyName: countyInfo?.county || null,
          ircVersion: countyInfo?.state === "DE" ? "2021 IRC" : countyInfo?.state ? "2018 IRC" : null,
          codeSection: item.irc_reference || null,
        },
        manufacturer: {
          isRequired: hasMfrReq,
          r9052_1Applies: hasMfrReq && item.irc_verified === true,
          isWarrantyBasisOnly: hasMfrReq && !item.irc_verified,
          isRecommendedNotRequired: false,
          manufacturerName: firstMatch?.manufacturer || null,
          productName: null,
          warrantyVoidLanguage: firstMatch?.requirement?.rebuttal || null,
        },
        carrier: {
          carrierName: null, // Carrier name not resolved in pipeline; historical data not populated yet
          countyName: countyInfo?.county || null,
          xactimateCode: item.xactimate_code,
          historicalApprovalRate: null, // No historical data yet
          sampleSize: 0,
        },
      };

      const scored = scoreConfidence(confidenceInput);
      // Replace AI's raw confidence with scored confidence (0-1 scale)
      item.confidence = scored.totalScore / 100;
      confidenceDetails.push({ xactimateCode: item.xactimate_code, result: scored });
    }

    console.log(`[pipeline] Confidence scoring complete: ${confidenceDetails.length} items scored`);

    // ── 4d. Waste calculator ──
    let wasteCalcResult: WasteResult | null = null;
    if (claim.roof_squares && claim.waste_percent) {
      wasteCalcResult = calculateWaste({
        measuredSquares: Number(claim.roof_squares),
        wastePercent: Number(claim.waste_percent),
        suggestedSquares: claim.suggested_squares ? Number(claim.suggested_squares) : null,
        structureComplexity: claim.structure_complexity || null,
        numHips: claim.num_hips ? Number(claim.num_hips) : null,
        numValleys: claim.num_valleys ? Number(claim.num_valleys) : null,
        numDormers: null, // Not tracked separately yet
        countyName: countyInfo?.county,
      });
      console.log(`[pipeline] Waste calculated: ${wasteCalcResult.adjustedSquares} SQ (${wasteCalcResult.wastePercent}% waste)`);
    }

    // ── 4e. IWS steep pitch calculator ──
    let iwsCalcResult: IwsResult | null = null;
    const pitchBreakdown = Array.isArray(claim.pitch_breakdown) ? claim.pitch_breakdown : [];
    const hasSteep = pitchBreakdown.some((pb: { pitch: string }) => isSteepPitch(pb.pitch));

    if (hasSteep && claim.ft_eaves) {
      const totalEaveLf = Number(claim.ft_eaves);
      const facets: FacetInput[] = pitchBreakdown.map((pb: { pitch: string; areaSqFt: number; percentOfRoof: number }, i: number) => ({
        facetId: `Facet ${i + 1} (${pb.pitch})`,
        pitchRatio: pb.pitch,
        // Distribute eave LF proportionally by area percentage
        eaveLf: Math.round(totalEaveLf * (Number(pb.percentOfRoof) / 100) * 100) / 100,
      }));

      iwsCalcResult = calculateIwsSteepPitch({
        facets,
        adjusterIwsSf: null, // Could be extracted from estimate in the future
        minimumHorizontalCoverage: 24,
      });
      console.log(`[pipeline] IWS steep pitch: ${iwsCalcResult.totalDeltaSf.toFixed(1)} SF additional needed`);
    }

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
        throw new Error(`Failed to insert ${itemRows.length} supplement items: ${itemsError.message}`);
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
          // Only generate the weather PDF if conditions meet severity thresholds.
          // Weather data is always saved to the supplement for reference regardless.
          if (shouldIncludeWeatherReport(weatherData)) {
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
          } else {
            console.log(
              `[pipeline] Weather below thresholds (${weatherData.verdict}), skipping PDF generation`
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
          // Intelligence engine outputs
          confidence_details: confidenceDetails.map((cd) => ({
            code: cd.xactimateCode,
            score: cd.result.totalScore,
            tier: cd.result.tier,
            summary: cd.result.summaryText,
          })),
          waste_calculation: wasteCalcResult
            ? {
                measuredSquares: wasteCalcResult.measuredSquares,
                wastePercent: wasteCalcResult.wastePercent,
                adjustedSquares: wasteCalcResult.adjustedSquares,
                complexity: wasteCalcResult.complexityCategory,
                formula: wasteCalcResult.formulaDisplay,
              }
            : null,
          iws_calculation: iwsCalcResult
            ? {
                totalRequiredSf: iwsCalcResult.totalRequiredSf,
                totalDeltaSf: iwsCalcResult.totalDeltaSf,
                hasSteepFacets: iwsCalcResult.hasSteepFacets,
                formula: iwsCalcResult.formulaDisplay,
              }
            : null,
          county_info: countyInfo
            ? { county: countyInfo.county, state: countyInfo.state }
            : null,
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

/* ─── Helper: build policy context string for the AI prompt ─── */

function buildPolicyContextString(pa: Record<string, unknown>): string {
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
  return parts.join("\n");
}
