"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DECODER_STATUS_LABELS } from "@/lib/constants";
import type { PolicyDecodingRow } from "@/app/(dashboard)/dashboard/policy-decoder/actions";

interface DecodingsListProps {
  decodings: PolicyDecodingRow[];
}

export function DecodingsList({ decodings }: DecodingsListProps) {
  if (decodings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">No policy decodes yet</h3>
          <p className="text-sm text-muted-foreground">
            Upload an insurance policy to decode coverages, deductibles,
            endorsements, and exclusions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
        <span>Policy</span>
        <span>Status</span>
        <span className="text-right">Date</span>
        <span></span>
      </div>

      {decodings.map((d) => {
        const statusInfo = DECODER_STATUS_LABELS[d.status] || {
          label: d.status,
          variant: "secondary" as const,
        };
        const createdDate = new Date(d.created_at).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        );
        const displayName = d.original_filename || "Untitled Policy";

        // Risk level from analysis if complete
        const riskLevel = d.policy_analysis?.riskLevel as string | undefined;

        // Badge color overrides for complete
        const completeBadgeClass =
          d.status === "complete"
            ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
            : d.status === "failed"
              ? "bg-red-500 text-white hover:bg-red-600 border-red-500"
              : "";

        return (
          <div
            key={d.id}
            className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0 ${
              d.status === "failed" ? "opacity-60" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{displayName}</p>
              {d.status === "complete" && riskLevel && (
                <p className="text-xs text-muted-foreground">
                  Risk:{" "}
                  <span
                    className={
                      riskLevel === "high"
                        ? "text-red-600 font-medium"
                        : riskLevel === "medium"
                          ? "text-amber-600 font-medium"
                          : "text-green-600 font-medium"
                    }
                  >
                    {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                  </span>
                </p>
              )}
              {d.status === "draft" && !d.paid_at && (
                <p className="text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              )}
              {d.status === "draft" && d.paid_at && !d.policy_pdf_url && (
                <p className="text-xs text-amber-600">Ready for upload</p>
              )}
            </div>
            <Badge
              variant={
                d.status === "complete" || d.status === "failed"
                  ? "default"
                  : statusInfo.variant
              }
              className={completeBadgeClass}
            >
              {statusInfo.label}
            </Badge>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {createdDate}
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/policy-decoder/${d.id}`}>View</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
