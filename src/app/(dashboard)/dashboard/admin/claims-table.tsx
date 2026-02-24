"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, type SupplementStatus } from "@/lib/constants";
import { AdminClaimDialog } from "./admin-claim-dialog";

export interface AdminClaim {
  id: string;
  notes: string | null;
  claim_number: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  date_of_loss: string | null;
  description: string | null;
  adjuster_scope_notes: string | null;
  items_believed_missing: string | null;
  prior_supplement_history: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  policy_number: string | null;
  archived_at: string | null;
  created_at: string;
  // Joined data
  companyName: string | null;
  userName: string | null;
  carrierName: string | null;
  supplementStatus: string | null;
  supplementTotal: number | null;
}

type SortKey =
  | "claimName"
  | "claimNumber"
  | "company"
  | "carrier"
  | "status"
  | "property"
  | "created"
  | "amount";

export function ClaimsTable({ claims }: { claims: AdminClaim[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortAsc, setSortAsc] = useState(false);
  const [editClaim, setEditClaim] = useState<AdminClaim | null>(null);

  const filtered = useMemo(() => {
    let rows = claims;

    // Status filter
    if (statusFilter !== "all") {
      rows = rows.filter((c) => c.supplementStatus === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.notes?.toLowerCase().includes(q) ||
          c.claim_number?.toLowerCase().includes(q) ||
          c.property_address?.toLowerCase().includes(q) ||
          c.companyName?.toLowerCase().includes(q) ||
          c.userName?.toLowerCase().includes(q) ||
          c.carrierName?.toLowerCase().includes(q)
      );
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "claimName":
          cmp = (a.notes ?? "").localeCompare(b.notes ?? "");
          break;
        case "claimNumber":
          cmp = (a.claim_number ?? "").localeCompare(b.claim_number ?? "");
          break;
        case "company":
          cmp = (a.companyName ?? "").localeCompare(b.companyName ?? "");
          break;
        case "carrier":
          cmp = (a.carrierName ?? "").localeCompare(b.carrierName ?? "");
          break;
        case "status":
          cmp = (a.supplementStatus ?? "").localeCompare(
            b.supplementStatus ?? ""
          );
          break;
        case "property":
          cmp = (a.property_address ?? "").localeCompare(
            b.property_address ?? ""
          );
          break;
        case "amount":
          cmp = (a.supplementTotal ?? 0) - (b.supplementTotal ?? 0);
          break;
        case "created":
        default:
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return rows;
  }, [claims, search, statusFilter, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({
    label,
    sortKeyName,
    className,
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground ${className ?? ""}`}
      onClick={() => handleSort(sortKeyName)}
    >
      {label}
      {sortKey === sortKeyName && (
        <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>
      )}
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search claims, companies, carriers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} claim{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Claim" sortKeyName="claimName" />
              <SortHeader label="Claim #" sortKeyName="claimNumber" />
              <SortHeader label="Company" sortKeyName="company" />
              <SortHeader label="Carrier" sortKeyName="carrier" />
              <SortHeader label="Status" sortKeyName="status" />
              <SortHeader label="Property" sortKeyName="property" />
              <SortHeader
                label="Supplement $"
                sortKeyName="amount"
                className="text-right"
              />
              <SortHeader
                label="Created"
                sortKeyName="created"
                className="text-right"
              />
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  No claims found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const statusInfo = c.supplementStatus
                  ? STATUS_LABELS[c.supplementStatus as SupplementStatus]
                  : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {c.notes || "Untitled"}
                      {c.archived_at && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-xs text-muted-foreground"
                        >
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.claim_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.companyName || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.carrierName || "—"}
                    </TableCell>
                    <TableCell>
                      {statusInfo ? (
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {c.property_address
                        ? `${c.property_address}${c.property_city ? `, ${c.property_city}` : ""}${c.property_state ? ` ${c.property_state}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {c.supplementTotal != null
                        ? `$${c.supplementTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditClaim(c)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      {editClaim && (
        <AdminClaimDialog
          claim={editClaim}
          open={!!editClaim}
          onOpenChange={(open) => {
            if (!open) setEditClaim(null);
          }}
        />
      )}
    </div>
  );
}
