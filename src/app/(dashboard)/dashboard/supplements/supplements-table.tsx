"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClaimEditDialog } from "@/components/dashboard/claim-edit-dialog";
import { ClaimDeleteDialog } from "@/components/dashboard/claim-delete-dialog";
import { DownloadButton } from "@/components/supplements/download-button";
import {
  STATUS_LABELS,
  SUPPLEMENT_STATUS_ORDER,
} from "@/lib/constants";
import type { SupplementStatus } from "@/lib/constants";
import { restoreClaim } from "@/app/(dashboard)/dashboard/actions";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────

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
  paid_at: string | null;
  created_at: string;
  claims: ClaimData;
}

type SortColumn =
  | "claim_name"
  | "claim_number"
  | "carrier"
  | "status"
  | "property"
  | "created_at"
  | "adjuster_total"
  | "supplement_total";

interface SupplementsTableProps {
  supplements: SupplementRow[];
}

// ── Helpers ─────────────────────────────────────────────────

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function claimName(claim: ClaimData | null): string {
  return claim?.notes || `Claim #${claim?.claim_number || "—"}`;
}

// ── Sortable Header ─────────────────────────────────────────

function SortableHeader({
  column,
  label,
  currentSort,
  currentDirection,
  onSort,
  className,
}: {
  column: SortColumn;
  label: string;
  currentSort: SortColumn;
  currentDirection: "asc" | "desc";
  onSort: (col: SortColumn) => void;
  className?: string;
}) {
  const isActive = column === currentSort;
  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded"
        onClick={() => onSort(column)}
      >
        {label}
        {isActive && (
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {currentDirection === "asc" ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            )}
          </svg>
        )}
      </button>
    </TableHead>
  );
}

// ── Main Component ──────────────────────────────────────────

export function SupplementsTable({ supplements }: SupplementsTableProps) {
  const router = useRouter();

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editClaim, setEditClaim] = useState<ClaimData | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Sort handler
  const handleSort = (col: SortColumn) => {
    if (col === sortColumn) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection(col === "created_at" ? "desc" : "asc");
    }
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let result = supplements;

    // Archive filter
    if (!showArchived) {
      result = result.filter((s) => !s.claims?.archived_at);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => {
        const c = s.claims;
        return (
          c?.notes?.toLowerCase().includes(q) ||
          c?.claim_number?.toLowerCase().includes(q) ||
          c?.property_address?.toLowerCase().includes(q) ||
          c?.property_city?.toLowerCase().includes(q) ||
          c?.property_state?.toLowerCase().includes(q) ||
          c?.carriers?.name.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      const ca = a.claims;
      const cb = b.claims;

      switch (sortColumn) {
        case "claim_name":
          cmp = (ca?.notes || ca?.claim_number || "").localeCompare(
            cb?.notes || cb?.claim_number || ""
          );
          break;
        case "claim_number":
          cmp = (ca?.claim_number || "").localeCompare(
            cb?.claim_number || ""
          );
          break;
        case "carrier":
          cmp = (ca?.carriers?.name || "").localeCompare(
            cb?.carriers?.name || ""
          );
          break;
        case "status": {
          const ia = SUPPLEMENT_STATUS_ORDER.indexOf(a.status as SupplementStatus);
          const ib = SUPPLEMENT_STATUS_ORDER.indexOf(b.status as SupplementStatus);
          cmp = ia - ib;
          break;
        }
        case "property":
          cmp = (ca?.property_address || "").localeCompare(
            cb?.property_address || ""
          );
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
        case "adjuster_total":
          cmp = (a.adjuster_total || 0) - (b.adjuster_total || 0);
          break;
        case "supplement_total":
          cmp = (a.supplement_total || 0) - (b.supplement_total || 0);
          break;
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [supplements, showArchived, statusFilter, search, sortColumn, sortDirection]);

  const hasArchived = supplements.some((s) => s.claims?.archived_at);

  // Restore handler
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

  // Empty state — no supplements at all
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
            <Link href="/dashboard/upload">+ New Supplement</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search supplements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Statuses</option>
          {SUPPLEMENT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]?.label || s}
            </option>
          ))}
        </select>
        {hasArchived && (
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived-table"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label
              htmlFor="show-archived-table"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Show Archived
            </Label>
          </div>
        )}
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                column="claim_name"
                label="Claim"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                column="claim_number"
                label="Claim #"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortableHeader
                column="carrier"
                label="Carrier"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="hidden lg:table-cell"
              />
              <SortableHeader
                column="status"
                label="Status"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                column="property"
                label="Property"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="hidden xl:table-cell"
              />
              <SortableHeader
                column="created_at"
                label="Created"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <SortableHeader
                column="adjuster_total"
                label="Adjuster $"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="hidden lg:table-cell text-right"
              />
              <SortableHeader
                column="supplement_total"
                label="Supplement $"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                className="hidden lg:table-cell text-right"
              />
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  No supplements match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const claim = s.claims;
                const isArchived = !!claim?.archived_at;
                const statusInfo = STATUS_LABELS[s.status] || {
                  label: s.status,
                  variant: "secondary" as const,
                };
                const name = claimName(claim);
                const createdDate = new Date(
                  s.created_at
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const address = [
                  claim?.property_address,
                  claim?.property_city,
                  claim?.property_state,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <TableRow
                    key={s.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      isArchived ? "opacity-50" : ""
                    }`}
                    onClick={() =>
                      router.push(`/dashboard/supplements/${s.id}`)
                    }
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {claim?.claim_number ? `#${claim.claim_number}` : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {claim?.carriers?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {address || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {createdDate}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-right tabular-nums">
                      {formatCurrency(s.adjuster_total)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-right tabular-nums font-medium">
                      {formatCurrency(s.supplement_total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                      {["complete", "submitted", "approved", "partially_approved", "denied"].includes(s.status) && s.paid_at && (
                        <DownloadButton supplementId={s.id} variant="icon" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
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
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/supplements/${s.id}`);
                            }}
                          >
                            View
                          </DropdownMenuItem>
                          {!isArchived && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                claim && setEditClaim(claim);
                              }}
                            >
                              Edit Claim
                            </DropdownMenuItem>
                          )}
                          {isArchived ? (
                            <DropdownMenuItem
                              disabled={restoringId === claim?.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                claim?.id && handleRestore(claim.id);
                              }}
                            >
                              {restoringId === claim?.id
                                ? "Restoring..."
                                : "Restore"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                claim &&
                                  setArchiveTarget({
                                    id: claim.id,
                                    name,
                                  });
                              }}
                            >
                              Archive
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {supplements.length} supplement
        {supplements.length !== 1 ? "s" : ""}
      </p>

      {/* Edit Dialog */}
      {editClaim && (
        <ClaimEditDialog
          open={!!editClaim}
          onOpenChange={(open) => !open && setEditClaim(null)}
          claim={editClaim}
        />
      )}

      {/* Archive Dialog */}
      {archiveTarget && (
        <ClaimDeleteDialog
          open={!!archiveTarget}
          onOpenChange={(open) => !open && setArchiveTarget(null)}
          claimId={archiveTarget.id}
          claimName={archiveTarget.name}
        />
      )}
    </div>
  );
}
