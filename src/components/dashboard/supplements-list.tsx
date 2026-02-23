"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { STATUS_LABELS } from "@/lib/constants";
import { ClaimEditDialog } from "./claim-edit-dialog";
import { ClaimDeleteDialog } from "./claim-delete-dialog";
import { restoreClaim } from "@/app/(dashboard)/dashboard/actions";
import { toast } from "sonner";

interface ClaimData {
  id: string;
  notes: string | null;
  claim_number: string | null;
  policy_number: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  date_of_loss: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  archived_at: string | null;
  carriers: { name: string } | null;
}

interface SupplementRow {
  id: string;
  status: string;
  adjuster_total: number | null;
  supplement_total: number | null;
  created_at: string;
  claims: ClaimData;
}

interface SupplementsListProps {
  supplements: SupplementRow[];
}

export function SupplementsList({ supplements }: SupplementsListProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [editClaim, setEditClaim] = useState<ClaimData | null>(null);
  const [archiveClaim, setArchiveClaim] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const filtered = showArchived
    ? supplements
    : supplements.filter((s) => !s.claims?.archived_at);

  const handleRestore = async (claimId: string) => {
    setRestoringId(claimId);
    const result = await restoreClaim(claimId);
    setRestoringId(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Claim restored.");
    }
  };

  if (supplements.length === 0) {
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">No supplements yet</h3>
          <p className="text-sm text-muted-foreground">
            Upload an adjuster&apos;s Xactimate estimate to generate your first
            supplement.
          </p>
          <Button asChild className="mt-2">
            <Link href="/dashboard/upload">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Supplement
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasArchived = supplements.some((s) => s.claims?.archived_at);

  return (
    <div className="space-y-3">
      {/* Show Archived toggle */}
      {hasArchived && (
        <div className="flex items-center gap-2 justify-end">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
            Show Archived
          </Label>
        </div>
      )}

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Claim</span>
          <span>Status</span>
          <span className="text-right">Created</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No active supplements. Toggle &quot;Show Archived&quot; to see
            archived claims.
          </div>
        ) : (
          filtered.map((s) => {
            const claim = s.claims;
            const isArchived = !!claim?.archived_at;
            const statusInfo = STATUS_LABELS[s.status] || {
              label: s.status,
              variant: "secondary" as const,
            };
            const createdDate = new Date(s.created_at).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            );
            const claimName =
              claim?.notes || `Claim #${claim?.claim_number || "—"}`;

            return (
              <div
                key={s.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0 ${
                  isArchived ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{claimName}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {[
                      claim?.claim_number && `#${claim.claim_number}`,
                      claim?.property_address,
                      claim?.property_city,
                      claim?.property_state,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {claim?.carriers?.name && (
                    <p className="text-xs text-muted-foreground">
                      {claim.carriers.name}
                    </p>
                  )}
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {createdDate}
                </span>
                <div className="flex items-center gap-1">
                  {isArchived ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={restoringId === claim?.id}
                      onClick={() => claim?.id && handleRestore(claim.id)}
                    >
                      {restoringId === claim?.id ? "Restoring..." : "Restore"}
                    </Button>
                  ) : (
                    <>
                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Edit claim"
                        onClick={() => claim && setEditClaim(claim)}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Button>
                      {/* Archive button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Archive claim"
                        onClick={() =>
                          claim &&
                          setArchiveClaim({ id: claim.id, name: claimName })
                        }
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                          />
                        </svg>
                      </Button>
                      {/* View button */}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/supplements/${s.id}`}>
                          View
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Dialog */}
      {editClaim && (
        <ClaimEditDialog
          open={!!editClaim}
          onOpenChange={(open) => !open && setEditClaim(null)}
          claim={editClaim}
        />
      )}

      {/* Archive Dialog */}
      {archiveClaim && (
        <ClaimDeleteDialog
          open={!!archiveClaim}
          onOpenChange={(open) => !open && setArchiveClaim(null)}
          claimId={archiveClaim.id}
          claimName={archiveClaim.name}
        />
      )}
    </div>
  );
}
