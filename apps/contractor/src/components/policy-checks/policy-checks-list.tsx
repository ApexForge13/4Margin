"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SendCheckDialog } from "./send-check-dialog";
import type { PolicyCheck } from "@/app/(dashboard)/dashboard/policy-checks/actions";

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Link Sent", variant: "secondary" },
  opened: { label: "Opened", variant: "outline" },
  processing: { label: "Analyzing", variant: "secondary" },
  complete: { label: "Complete", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
};

const PAYMENT_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  unpaid: { label: "Unpaid", variant: "destructive" },
  paid: { label: "Paid", variant: "default" },
  free: { label: "Free", variant: "outline" },
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  wind: "Wind",
  hail: "Hail",
  fire: "Fire",
  water_flood: "Water/Flood",
  impact: "Impact",
  theft: "Theft",
  other: "Other",
};

export function PolicyChecksList({
  initialChecks,
}: {
  initialChecks: PolicyCheck[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  if (initialChecks.length === 0 && !dialogOpen) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold">No policy checks yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Send a link to a homeowner so they can upload their policy for
            analysis. You&apos;ll see their coverage details, landmines, and a
            go/no-go recommendation — all before filing a claim.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={() => setDialogOpen(true)}>
              Send Policy Check Link
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            $29 per check &middot; First one free
          </p>
        </div>
        <SendCheckDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initialChecks.length} policy check
          {initialChecks.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          Send Policy Check
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Homeowner</th>
              <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                Claim Type
              </th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                Payment
              </th>
              <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">
                Date
              </th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {initialChecks.map((check) => {
              const status = STATUS_LABELS[check.status] || {
                label: check.status,
                variant: "secondary" as const,
              };
              const payment = PAYMENT_LABELS[check.payment_status] || {
                label: check.payment_status,
                variant: "secondary" as const,
              };
              const name = [
                check.homeowner_first_name,
                check.homeowner_last_name,
              ]
                .filter(Boolean)
                .join(" ") || check.homeowner_email;

              return (
                <tr
                  key={check.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {check.homeowner_email}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {check.claim_type
                      ? CLAIM_TYPE_LABELS[check.claim_type] || check.claim_type
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={payment.variant}>{payment.label}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {new Date(check.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/policy-checks/${check.id}`}>
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SendCheckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
