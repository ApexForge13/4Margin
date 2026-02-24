import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, formatDamageTypes } from "@/lib/constants";
import type { SupplementStatus } from "@/lib/constants";
import { getSignedUrl } from "@/lib/supabase/storage-server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusTracker } from "@/components/supplements/status-tracker";
import { StatusActions } from "./status-actions";
import { CarrierUploadCard } from "@/components/supplements/carrier-upload-card";
import { PaymentToast } from "@/components/supplements/payment-toast";
import { AutoRefresh } from "@/components/supplements/auto-refresh";
import { LineItemsReview } from "@/components/supplements/line-items-review";

export default async function SupplementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch supplement with full claim + carrier data
  const { data: supplement, error } = await supabase
    .from("supplements")
    .select(
      `
      *,
      claims (
        *,
        carriers ( * )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !supplement) return notFound();

  const claim = supplement.claims as Record<string, unknown>;
  const carrier = (claim?.carriers as Record<string, unknown>) || null;

  // Check if first supplement (for free tier display)
  const { count: paidCount } = await supabase
    .from("supplements")
    .select("id", { count: "exact", head: true })
    .eq("company_id", supplement.company_id)
    .not("paid_at", "is", null);
  const isFirstSupplement = (paidCount ?? 0) === 0;

  // Fetch supplement line items
  const { data: lineItems } = await supabase
    .from("supplement_items")
    .select("*")
    .eq("supplement_id", id)
    .order("category", { ascending: true })
    .order("xactimate_code", { ascending: true });

  // Fetch photos for this claim
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("claim_id", claim.id as string)
    .order("created_at", { ascending: true });

  // Generate signed URLs for photos
  const photoUrls: Record<string, string | null> = {};
  if (photos && photos.length > 0) {
    for (const photo of photos) {
      photoUrls[photo.id] = await getSignedUrl("photos", photo.storage_path);
    }
  }

  // Generate signed URL for estimate
  let estimateUrl: string | null = null;
  if (supplement.adjuster_estimate_url) {
    estimateUrl = await getSignedUrl("estimates", supplement.adjuster_estimate_url);
  }

  // Generate signed URL for carrier response
  let carrierResponseUrl: string | null = null;
  if (supplement.carrier_response_url) {
    carrierResponseUrl = await getSignedUrl(
      "carrier-responses",
      supplement.carrier_response_url
    );
  }

  const status = supplement.status as SupplementStatus;

  const statusInfo = STATUS_LABELS[status] || {
    label: status,
    variant: "secondary" as const,
  };

  const createdDate = new Date(supplement.created_at).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  const hasPdf = !!supplement.generated_pdf_url;

  return (
    <div className="space-y-6">
      <PaymentToast />

      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/supplements">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Supplements
        </Link>
      </Button>

      {/* Status Tracker + Auto-refresh while generating */}
      <StatusTracker
        status={status}
        approvedAmount={supplement.approved_amount ?? null}
        supplementTotal={supplement.supplement_total ?? null}
      />
      <AutoRefresh status={status} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {(claim.notes as string) || `Claim #${claim.claim_number || "\u2014"}`}
          </h1>
          <p className="text-muted-foreground">
            Created {createdDate}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={statusInfo.variant} className="text-sm">
            {statusInfo.label}
          </Badge>
          <StatusActions
            supplementId={id}
            status={status}
            carrierName={carrier?.name as string | undefined}
          />
        </div>
      </div>

      {/* Generating indicator */}
      {status === ("generating" as SupplementStatus) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <div>
              <p className="font-medium text-blue-900">Analyzing your estimate...</p>
              <p className="text-sm text-blue-700">Our AI is reviewing the adjuster&apos;s scope, identifying missing items, and generating your supplement. This usually takes 1-2 minutes.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── GENERATED CONTENT ───────────────────────────────────── */}

      {/* Supplement Line Items — interactive review with checkboxes */}
      {lineItems && lineItems.length > 0 && (
        <LineItemsReview
          supplementId={id}
          items={lineItems}
          supplementStatus={status}
          hasPdf={hasPdf}
          paid={!!supplement.paid_at}
          isFirstSupplement={isFirstSupplement}
          supplementTotal={supplement.supplement_total ?? null}
        />
      )}

      {/* Weather Verification Report */}
      {supplement.weather_data && (
        <WeatherCard weather={supplement.weather_data as Record<string, unknown>} />
      )}

      {/* ── UPLOADED CONTENT ────────────────────────────────────── */}

      {/* Section divider */}
      {(status === "complete" ||
        status === "submitted" ||
        status === "approved" ||
        status === "partially_approved" ||
        status === "denied") && (
        <div className="flex items-center gap-3 pt-2">
          <Separator className="flex-1" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Uploaded Claim Information
          </span>
          <Separator className="flex-1" />
        </div>
      )}

      {/* Claim Overview — full-width narrative card */}
      {((claim.description as string) ||
        (claim.adjuster_scope_notes as string) ||
        (claim.items_believed_missing as string) ||
        (claim.prior_supplement_history as string)) && (
        <Card>
          <CardHeader>
            <CardTitle>Claim Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {(claim.description as string) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Claim Description
                </p>
                <p className="whitespace-pre-wrap">{claim.description as string}</p>
              </div>
            )}
            {(claim.adjuster_scope_notes as string) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Adjuster&apos;s Estimate Included
                </p>
                <p className="whitespace-pre-wrap">{claim.adjuster_scope_notes as string}</p>
              </div>
            )}
            {(claim.items_believed_missing as string) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Items Believed Missing / Underpaid
                </p>
                <p className="whitespace-pre-wrap">{claim.items_believed_missing as string}</p>
              </div>
            )}
            {(claim.prior_supplement_history as string) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Previous Supplement History
                </p>
                <p className="whitespace-pre-wrap">{claim.prior_supplement_history as string}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main content cards — Claim details + Measurements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Claim Details */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Claim #" value={claim.claim_number as string} />
            <Row label="Policy #" value={claim.policy_number as string} />
            <Row label="Carrier" value={carrier?.name as string} />
            <Row
              label="Property"
              value={[
                claim.property_address,
                [claim.property_city, claim.property_state, claim.property_zip]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <Row
              label="Date of Loss"
              value={
                claim.date_of_loss
                  ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
                  : ""
              }
            />
            <Separator className="my-2" />
            <Row label="Adjuster" value={claim.adjuster_name as string} />
            <Row label="Adjuster Email" value={claim.adjuster_email as string} />
            <Row label="Adjuster Phone" value={claim.adjuster_phone as string} />
          </CardContent>
        </Card>

        {/* Measurements */}
        <Card>
          <CardHeader>
            <CardTitle>Measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {!claim.roof_squares && !claim.roof_pitch ? (
              <p className="text-muted-foreground">No measurements recorded</p>
            ) : (
              <>
                <Row label="Measured Sq" value={claim.roof_squares ? String(claim.roof_squares) : ""} />
                <Row label="Waste %" value={claim.waste_percent ? String(claim.waste_percent) : ""} />
                <Row label="Suggested Sq" value={claim.suggested_squares ? String(claim.suggested_squares) : ""} />
                <Row label="Pitch" value={claim.roof_pitch as string} />
                <Separator className="my-2" />
                <Row label="Ridges (ft)" value={claim.ft_ridges ? String(claim.ft_ridges) : ""} />
                <Row label="Hips (ft)" value={claim.ft_hips ? String(claim.ft_hips) : ""} />
                <Row label="Valleys (ft)" value={claim.ft_valleys ? String(claim.ft_valleys) : ""} />
                <Row label="Rakes (ft)" value={claim.ft_rakes ? String(claim.ft_rakes) : ""} />
                <Row label="Eaves (ft)" value={claim.ft_eaves ? String(claim.ft_eaves) : ""} />
                <Row label="Drip Edge (ft)" value={claim.ft_drip_edge ? String(claim.ft_drip_edge) : ""} />
                <Row label="Parapet (ft)" value={claim.ft_parapet ? String(claim.ft_parapet) : ""} />
                <Row label="Flashing (ft)" value={claim.ft_flashing ? String(claim.ft_flashing) : ""} />
                <Row label="Step Flash (ft)" value={claim.ft_step_flashing ? String(claim.ft_step_flashing) : ""} />
                {claim.accessories && (
                  <>
                    <Separator className="my-2" />
                    <Row label="Accessories" value={claim.accessories as string} />
                  </>
                )}
              </>
            )}
            {Array.isArray(claim.damage_types) && (claim.damage_types as string[]).length > 0 && (
              <>
                <Separator className="my-2" />
                <Row label="Damage Types" value={formatDamageTypes(claim.damage_types as string[])} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Files */}
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {estimateUrl ? (
              <a
                href={estimateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border p-3 hover:bg-gray-50 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-red-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">Adjuster Estimate</p>
                  <p className="text-xs text-muted-foreground">PDF document</p>
                </div>
                <Badge variant="secondary">Estimate</Badge>
              </a>
            ) : (
              <p className="text-muted-foreground">No estimate uploaded</p>
            )}

            {/* Carrier Response Document */}
            {carrierResponseUrl && (
              <a
                href={carrierResponseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50/50 p-3 hover:bg-green-50 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-green-600 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">Carrier Response</p>
                  <p className="text-xs text-muted-foreground">Uploaded document</p>
                </div>
                <Badge variant="outline" className="border-green-300 text-green-700">
                  Response
                </Badge>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>
              Photos
              {photos && photos.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({photos.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!photos || photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos uploaded</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="rounded-lg border overflow-hidden"
                  >
                    {photoUrls[photo.id] ? (
                      <a
                        href={photoUrls[photo.id]!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrls[photo.id]!}
                          alt={photo.file_name || "Photo"}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="aspect-[4/3] w-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          Unable to load
                        </span>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">
                        {photo.file_name}
                      </p>
                      {photo.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {photo.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carrier upload prompt (shown when submitted — at very bottom) */}
      {status === "submitted" && (
        <CarrierUploadCard supplementId={id} />
      )}
    </div>
  );
}

// --- Helper ---
function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  );
}

// --- Weather Verification Card ---
function WeatherCard({ weather: w }: { weather: Record<string, unknown> }) {
  const verdict = w.verdict as string;
  const hailDetected = w.hailDetected as boolean;
  const maxWindGust = w.maxWindGust as number;
  const hailSizeMax = w.hailSizeMax as number | null;
  const conditions = w.conditions as string;
  const severerisk = w.severerisk as number;
  const verdictText = w.verdictText as string;
  const windspeed = w.windspeed as number;
  const precip = w.precip as number;
  const tempmax = w.tempmax as number;
  const tempmin = w.tempmin as number;

  const verdictConfig = {
    severe_confirmed: {
      label: "SEVERE WEATHER CONFIRMED",
      badgeClass: "bg-red-600 text-white hover:bg-red-600",
    },
    moderate_weather: {
      label: "MODERATE WEATHER",
      badgeClass: "bg-amber-500 text-white hover:bg-amber-500",
    },
    no_significant_weather: {
      label: "NO SIGNIFICANT WEATHER",
      badgeClass: "bg-gray-200 text-gray-700 hover:bg-gray-200",
    },
  }[verdict] || {
    label: String(verdict),
    badgeClass: "bg-gray-200 text-gray-700 hover:bg-gray-200",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-cyan-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            Weather Verification
          </CardTitle>
          <Badge className={verdictConfig.badgeClass}>
            {verdictConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <WeatherStat
            label="Max Wind Gust"
            value={`${Math.round(maxWindGust)} mph`}
            highlight={maxWindGust >= 58}
          />
          <WeatherStat
            label="Hail"
            value={
              hailDetected
                ? hailSizeMax
                  ? `Detected — ${hailSizeMax}" diameter`
                  : "Detected"
                : "Not reported"
            }
            highlight={hailDetected}
          />
          <WeatherStat label="Conditions" value={conditions} />
          <WeatherStat
            label="Severe Risk"
            value={`${Math.round(severerisk)} / 100`}
            highlight={severerisk > 50}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <WeatherStat
            label="Avg Wind Speed"
            value={`${Math.round(windspeed)} mph`}
          />
          <WeatherStat
            label="Precipitation"
            value={`${precip?.toFixed(2) || "0.00"} in`}
          />
          <WeatherStat
            label="High / Low"
            value={`${Math.round(tempmax)}°F / ${Math.round(tempmin)}°F`}
          />
          <WeatherStat
            label="Location"
            value={(w.resolvedAddress as string) || "—"}
          />
        </div>
        <Separator className="my-4" />
        <p className="text-sm text-muted-foreground">{verdictText}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Source: Visual Crossing Historical Weather Data
        </p>
      </CardContent>
    </Card>
  );
}

function WeatherStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-sm font-semibold ${highlight ? "text-red-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
