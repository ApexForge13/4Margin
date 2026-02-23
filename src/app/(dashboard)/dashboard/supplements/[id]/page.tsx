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
import { DownloadButton } from "@/components/supplements/download-button";
import { PaymentGate } from "@/components/supplements/payment-gate";
import { PaymentToast } from "@/components/supplements/payment-toast";

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

      {/* Status Tracker */}
      <StatusTracker
        status={status}
        approvedAmount={supplement.approved_amount ?? null}
        supplementTotal={supplement.supplement_total ?? null}
      />

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
          {(status === "complete" ||
            status === "submitted" ||
            status === "approved" ||
            status === "partially_approved" ||
            status === "denied") && (
            <PaymentGate
              supplementId={id}
              paid={!!supplement.paid_at}
            >
              <DownloadButton supplementId={id} variant="button" />
            </PaymentGate>
          )}
          <StatusActions
            supplementId={id}
            status={status}
            carrierName={carrier?.name as string | undefined}
          />
        </div>
      </div>

      {/* Carrier upload prompt (shown when submitted) */}
      {status === "submitted" && (
        <CarrierUploadCard supplementId={id} />
      )}

      {/* Main content cards */}
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
