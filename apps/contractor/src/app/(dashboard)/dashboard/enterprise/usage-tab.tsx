"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { exportUsageCsv } from "./actions";
import { toast } from "sonner";

interface UsageRecord {
  id: string;
  user_id: string;
  office_id: string | null;
  record_type: string;
  billing_period_start: string;
  is_overage: boolean;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  office_id: string | null;
}

interface Office {
  id: string;
  name: string;
}

interface Props {
  records: UsageRecord[];
  users: User[];
  offices: Office[];
  limits: {
    monthly_decode_limit: number | null;
    monthly_supplement_limit: number | null;
  };
}

export function UsageTab({ records, users, offices, limits }: Props) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterOffice, setFilterOffice] = useState<string>("all");

  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.full_name])),
    [users]
  );
  const officeMap = useMemo(
    () => new Map(offices.map((o) => [o.id, o.name])),
    [offices]
  );

  // Current billing period records
  const currentPeriodRecords = useMemo(() => {
    if (records.length === 0) return [];
    // Use the most recent billing_period_start
    const latestPeriod = records[0]?.billing_period_start;
    if (!latestPeriod) return records;
    return records.filter((r) => r.billing_period_start === latestPeriod);
  }, [records]);

  // Summary stats
  const stats = useMemo(() => {
    const decodes = currentPeriodRecords.filter(
      (r) => r.record_type === "decode"
    ).length;
    const supplements = currentPeriodRecords.filter(
      (r) => r.record_type === "supplement"
    ).length;
    const overages = currentPeriodRecords.filter((r) => r.is_overage).length;
    return { decodes, supplements, overages };
  }, [currentPeriodRecords]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterType !== "all" && r.record_type !== filterType) return false;
      if (filterOffice !== "all" && r.office_id !== filterOffice) return false;
      return true;
    });
  }, [records, filterType, filterOffice]);

  // Per-user breakdown
  const perUser = useMemo(() => {
    const map = new Map<string, { decodes: number; supplements: number }>();
    for (const r of currentPeriodRecords) {
      const entry = map.get(r.user_id) || { decodes: 0, supplements: 0 };
      if (r.record_type === "decode") entry.decodes++;
      if (r.record_type === "supplement") entry.supplements++;
      map.set(r.user_id, entry);
    }
    return Array.from(map.entries())
      .map(([userId, counts]) => ({
        userId,
        name: userMap.get(userId) || "Unknown",
        ...counts,
      }))
      .sort((a, b) => b.decodes + b.supplements - (a.decodes + a.supplements));
  }, [currentPeriodRecords, userMap]);

  const handleExport = async () => {
    try {
      const csv = await exportUsageCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `usage-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch {
      toast.error("Failed to export");
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Decodes This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.decodes}
              {limits.monthly_decode_limit && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}/ {limits.monthly_decode_limit}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Supplements This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.supplements}
              {limits.monthly_supplement_limit && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}/ {limits.monthly_supplement_limit}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overage Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overages}</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-User Breakdown */}
      {perUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Decodes</TableHead>
                  <TableHead className="text-right">Supplements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perUser.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-right">{u.decodes}</TableCell>
                    <TableCell className="text-right">
                      {u.supplements}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Activity Log</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="decode">Decodes</SelectItem>
                <SelectItem value="supplement">Supplements</SelectItem>
                <SelectItem value="policy_check">Policy Checks</SelectItem>
              </SelectContent>
            </Select>
            {offices.length > 0 && (
              <Select value={filterOffice} onValueChange={setFilterOffice}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All offices</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No usage records yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.record_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {userMap.get(r.user_id) || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.office_id ? officeMap.get(r.office_id) || "—" : "—"}
                    </TableCell>
                    <TableCell>
                      {r.is_overage ? (
                        <Badge variant="destructive">Overage</Badge>
                      ) : (
                        <Badge variant="secondary">Included</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
