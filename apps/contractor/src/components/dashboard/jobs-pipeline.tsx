"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  JOB_STATUS_LABELS,
  INSURANCE_PIPELINE,
} from "@/types/job";
import type { JobStatus, JobType } from "@/types/job";

interface PipelineJob {
  id: string;
  job_status: JobStatus;
  job_type: JobType;
  homeowner_name: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  financials: Record<string, unknown>;
  insurance_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface JobsPipelineProps {
  jobs: PipelineJob[];
}

const STATUS_COLORS: Partial<Record<JobStatus, string>> = {
  lead: "#94a3b8",
  inspected: "#8b5cf6",
  claim_filed: "#3b82f6",
  adjuster_scheduled: "#06b6d4",
  estimate_received: "#00BFFF",
  supplement_sent: "#f59e0b",
  revised_estimate: "#f97316",
  approved: "#10b981",
  sold: "#059669",
  materials_ordered: "#6366f1",
  work_scheduled: "#8b5cf6",
  in_progress: "#0ea5e9",
  install_complete: "#14b8a6",
  depreciation_collected: "#22c55e",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
};

function daysInStatus(updatedAt: string): number {
  const now = Date.now();
  const then = new Date(updatedAt).getTime();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function formatAddress(job: PipelineJob): string {
  if (job.property_address) {
    const parts = [job.property_address];
    if (job.property_city) parts.push(job.property_city);
    if (job.property_state) parts.push(job.property_state);
    return parts.join(", ");
  }
  return "No address";
}

function getCarrierName(insuranceData: Record<string, unknown>): string | null {
  if (insuranceData && typeof insuranceData === "object") {
    const name = (insuranceData as Record<string, string>).carrier_name
      ?? (insuranceData as Record<string, string>).carrier_id
      ?? null;
    return typeof name === "string" ? name : null;
  }
  return null;
}

export function JobsPipeline({ jobs }: JobsPipelineProps) {
  const [expandedStatuses, setExpandedStatuses] = useState<Set<JobStatus>>(
    () => {
      // Auto-expand statuses that have jobs
      const initial = new Set<JobStatus>();
      for (const job of jobs) {
        initial.add(job.job_status);
      }
      return initial;
    }
  );

  // Group jobs by status
  const jobsByStatus = new Map<JobStatus, PipelineJob[]>();
  for (const job of jobs) {
    const existing = jobsByStatus.get(job.job_status) ?? [];
    existing.push(job);
    jobsByStatus.set(job.job_status, existing);
  }

  // Use insurance pipeline order, skip statuses with 0 jobs
  const activeStatuses = INSURANCE_PIPELINE.filter(
    (status) => (jobsByStatus.get(status)?.length ?? 0) > 0
  );

  // Also include closed_lost if any
  if (jobsByStatus.has("closed_lost")) {
    activeStatuses.push("closed_lost");
  }

  const toggleStatus = (status: JobStatus) => {
    setExpandedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  if (jobs.length === 0) {
    return (
      <div
        className="bg-white rounded-2xl border border-gray-100 p-6"
        style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#344767]">Jobs Pipeline</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">Track jobs through each stage</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <svg className="h-5 w-5 text-[#94a3b8]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#344767]">No jobs yet</p>
          <p className="text-xs text-[#94a3b8]">Create your first job to see the pipeline</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-6"
      style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[#344767]">Jobs Pipeline</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {jobs.length} active job{jobs.length !== 1 ? "s" : ""} across {activeStatuses.length} stage{activeStatuses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/supplements"
          className="text-xs font-semibold text-[#00BFFF] hover:text-[#0090cc] transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="space-y-2">
        {activeStatuses.map((status) => {
          const statusJobs = jobsByStatus.get(status) ?? [];
          const isExpanded = expandedStatuses.has(status);
          const statusColor = STATUS_COLORS[status] ?? "#94a3b8";

          return (
            <div key={status} className="rounded-xl border border-gray-100 overflow-hidden">
              {/* Status header */}
              <button
                onClick={() => toggleStatus(status)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusColor }}
                  />
                  <span className="text-xs font-semibold text-[#344767]">
                    {JOB_STATUS_LABELS[status]}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[20px] rounded-full px-1.5 text-[10px] font-bold"
                  >
                    {statusJobs.length}
                  </Badge>
                </div>
                <svg
                  className={`h-4 w-4 text-[#94a3b8] transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded job list */}
              {isExpanded && (
                <div className="border-t border-gray-50 bg-gray-50/30">
                  {statusJobs.map((job) => {
                    const days = daysInStatus(job.updated_at);
                    const carrier = getCarrierName(job.insurance_data);

                    return (
                      <Link
                        key={job.id}
                        href="/dashboard/supplements"
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#344767] truncate">
                            {formatAddress(job)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {job.homeowner_name && (
                              <span className="text-[10px] text-[#94a3b8] truncate">
                                {job.homeowner_name}
                              </span>
                            )}
                            {carrier && (
                              <>
                                {job.homeowner_name && (
                                  <span className="text-[10px] text-[#94a3b8]">·</span>
                                )}
                                <span className="text-[10px] text-[#94a3b8] truncate">
                                  {carrier}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-3">
                          <span
                            className={`text-[10px] font-medium ${
                              days > 14
                                ? "text-red-500"
                                : days > 7
                                  ? "text-amber-500"
                                  : "text-[#94a3b8]"
                            }`}
                          >
                            {days === 0 ? "Today" : `${days}d`}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
