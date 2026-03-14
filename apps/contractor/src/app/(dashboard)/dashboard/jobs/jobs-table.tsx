"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Briefcase } from "lucide-react";
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
import { JOB_STATUS_LABELS } from "@/types/job";
import type { JobStatus, JobType } from "@/types/job";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface JobRow {
  id: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  homeowner_name: string | null;
  job_type: string;
  job_status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface JobsTableProps {
  jobs: JobRow[];
}

// ── Constants ────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  insurance: "bg-blue-100 text-blue-800",
  retail: "bg-green-100 text-green-800",
  hybrid: "bg-purple-100 text-purple-800",
  repair: "bg-orange-100 text-orange-800",
};

const TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  retail: "Retail",
  hybrid: "Hybrid",
  repair: "Repair",
};

type TabFilter = "all" | JobType;

const TABS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "insurance", label: "Insurance" },
  { value: "retail", label: "Retail" },
  { value: "repair", label: "Repair" },
];

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

function statusBadgeClass(status: string): string {
  if (status === "closed_won") return "bg-green-100 text-green-800";
  if (status === "closed_lost") return "bg-red-100 text-red-800";
  if (
    [
      "in_progress",
      "work_scheduled",
      "materials_ordered",
      "install_complete",
      "depreciation_collected",
    ].includes(status)
  )
    return "bg-yellow-100 text-yellow-800";
  return "bg-secondary text-secondary-foreground";
}

// ── Main Component ───────────────────────────────────────────

export function JobsTable({ jobs }: JobsTableProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = jobs;

    if (activeTab !== "all") {
      result = result.filter((j) => j.job_type === activeTab);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.property_address.toLowerCase().includes(q) ||
          j.property_city?.toLowerCase().includes(q) ||
          j.property_state?.toLowerCase().includes(q) ||
          j.homeowner_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [jobs, activeTab, search]);

  // Empty state — no jobs at all
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No jobs yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first job to start tracking leads, inspections, and
            supplements in one place.
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
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobs.length} active job{jobs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter tabs */}
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
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Updated
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
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((job) => {
                const address = [
                  job.property_address,
                  job.property_city,
                  job.property_state,
                ]
                  .filter(Boolean)
                  .join(", ");

                const statusLabel =
                  JOB_STATUS_LABELS[job.job_status as JobStatus] ??
                  job.job_status;

                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium max-w-[240px]">
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {address || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {job.homeowner_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          TYPE_COLORS[job.job_type] ?? "",
                          "border-transparent"
                        )}
                      >
                        {TYPE_LABELS[job.job_type] ?? job.job_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          statusBadgeClass(job.job_status),
                          "border-transparent"
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground text-right whitespace-nowrap">
                      {timeAgo(job.updated_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {jobs.length} job{jobs.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
