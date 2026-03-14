"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface QuoteRow {
  id: string;
  status: string;
  homeowner_name: string | null;
  total_squares: number | null;
  good_tier: { label: string; total: number } | null;
  better_tier: { label: string; total: number } | null;
  best_tier: { label: string; total: number } | null;
  created_at: string;
  job_id: string | null;
  jobs: {
    id: string;
    property_address: string;
    property_city: string | null;
    property_state: string | null;
  } | null;
}

interface QuotesTableProps {
  quotes: QuoteRow[];
}

// ── Constants ────────────────────────────────────────────────

type TabFilter = "all" | "draft" | "sent" | "accepted";

const TABS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

// ── Helpers ──────────────────────────────────────────────────

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCurrency(n: number): string {
  return usd.format(n);
}

// ── Main Component ───────────────────────────────────────────

export function QuotesTable({ quotes }: QuotesTableProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = quotes;

    if (activeTab !== "all") {
      result = result.filter((q) => q.status === activeTab);
    }

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.jobs?.property_address.toLowerCase().includes(query) ||
          q.jobs?.property_city?.toLowerCase().includes(query) ||
          q.jobs?.property_state?.toLowerCase().includes(query) ||
          q.homeowner_name?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [quotes, activeTab, search]);

  // Empty state — no quotes at all
  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No quotes yet</h3>
          <p className="text-sm text-muted-foreground">
            Quotes created from jobs will appear here once generated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors relative",
                activeTab === tab.value
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by address or homeowner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead className="hidden sm:table-cell">Homeowner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Best Tier Total
              </TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  No quotes found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((quote) => {
                const address = [
                  quote.jobs?.property_address,
                  quote.jobs?.property_city,
                  quote.jobs?.property_state,
                ]
                  .filter(Boolean)
                  .join(", ");

                const statusLabel =
                  STATUS_LABELS[quote.status] ?? quote.status;

                const bestTotal = quote.best_tier?.total ?? null;

                return (
                  <TableRow
                    key={quote.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium max-w-[240px]">
                      <Link
                        href={`/dashboard/quotes/${quote.id}`}
                        className="hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {address || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {quote.homeowner_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          STATUS_COLORS[quote.status] ?? "",
                          "border-transparent"
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-right font-medium tabular-nums">
                      {bestTotal !== null ? formatCurrency(bestTotal) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground text-right whitespace-nowrap">
                      {timeAgo(quote.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {quotes.length} quote
        {quotes.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
