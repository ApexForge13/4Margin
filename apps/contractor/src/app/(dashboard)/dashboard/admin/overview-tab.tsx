"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STATUS_LABELS, type SupplementStatus } from "@/lib/constants";

export interface PlatformStats {
  totalSupplements: number;
  totalClaims: number;
  totalUsers: number;
  totalCompanies: number;
  totalRecovery: number;
  totalApproved: number;
  statusCounts: Record<string, number>;
  recentSupplements: {
    id: string;
    status: string;
    supplement_total: number | null;
    approved_amount: number | null;
    created_at: string;
    claimName: string | null;
    companyName: string | null;
    userName: string | null;
  }[];
}

function formatCurrency(cents: number): string {
  return `$${cents.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function OverviewTab({ stats }: { stats: PlatformStats }) {
  // Avg recovery only counts resolved supplements (approved + partially_approved)
  const resolvedCount =
    (stats.statusCounts["approved"] || 0) +
    (stats.statusCounts["partially_approved"] || 0);
  const avgRecovery =
    resolvedCount > 0
      ? stats.totalRecovery / resolvedCount
      : 0;

  return (
    <div className="space-y-6">
      {/* Top-level stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Supplements"
          value={String(stats.totalSupplements)}
          description="Across all companies"
        />
        <StatCard
          title="Total Claims"
          value={String(stats.totalClaims)}
          description="Across all companies"
        />
        <StatCard
          title="Active Users"
          value={String(stats.totalUsers)}
          description={`${stats.totalCompanies} ${stats.totalCompanies === 1 ? "company" : "companies"}`}
        />
        <StatCard
          title="Avg Recovery"
          value={formatCurrency(avgRecovery)}
          description="Per supplement"
        />
      </div>

      {/* Financial + Status breakdown row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Financial summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Recovery Requested
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(stats.totalRecovery)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Approved
              </span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(stats.totalApproved)}
              </span>
            </div>
            {stats.totalRecovery > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Approval Rate
                </span>
                <span className="text-lg font-bold">
                  {Math.round(
                    (stats.totalApproved / stats.totalRecovery) * 100
                  )}
                  %
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Supplements by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.statusCounts).map(([status, count]) => {
                const info = STATUS_LABELS[status as SupplementStatus];
                const pct =
                  stats.totalSupplements > 0
                    ? Math.round((count / stats.totalSupplements) * 100)
                    : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={info?.variant ?? "secondary"}>
                          {info?.label ?? status}
                        </Badge>
                      </div>
                      <span className="font-medium">
                        {count}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.statusCounts).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No supplements yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent supplements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Supplements</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSupplements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No supplements yet
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentSupplements.map((s) => {
                const info =
                  STATUS_LABELS[s.status as SupplementStatus] ??
                  ({ label: s.status, variant: "secondary" as const });
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {s.claimName || "Untitled Claim"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.companyName} &middot; {s.userName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.supplement_total != null && (
                        <span className="text-xs font-medium">
                          {formatCurrency(s.supplement_total)}
                        </span>
                      )}
                      <Badge variant={info.variant}>{info.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
