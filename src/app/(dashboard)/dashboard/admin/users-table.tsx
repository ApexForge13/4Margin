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
import { AdminUserDialog } from "./admin-user-dialog";

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  companyName: string | null;
  companyId: string | null;
  claimsCount: number;
  supplementsCount: number;
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

type SortKey =
  | "name"
  | "email"
  | "company"
  | "role"
  | "claims"
  | "supplements"
  | "joined";

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortAsc, setSortAsc] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    let rows = users;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.companyName?.toLowerCase().includes(q)
      );
    }

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.full_name.localeCompare(b.full_name);
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "company":
          cmp = (a.companyName ?? "").localeCompare(b.companyName ?? "");
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "claims":
          cmp = a.claimsCount - b.claimsCount;
          break;
        case "supplements":
          cmp = a.supplementsCount - b.supplementsCount;
          break;
        case "joined":
        default:
          cmp =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return rows;
  }, [users, search, sortKey, sortAsc]);

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
      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search users by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader label="Name" sortKeyName="name" />
              <SortHeader label="Email" sortKeyName="email" />
              <SortHeader label="Company" sortKeyName="company" />
              <SortHeader label="Role" sortKeyName="role" />
              <SortHeader
                label="Claims"
                sortKeyName="claims"
                className="text-right"
              />
              <SortHeader
                label="Supplements"
                sortKeyName="supplements"
                className="text-right"
              />
              <SortHeader
                label="Joined"
                sortKeyName="joined"
                className="text-right"
              />
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">
                    {u.companyName || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[u.role] ?? "outline"}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {u.claimsCount}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {u.supplementsCount}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditUser(u)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      {editUser && (
        <AdminUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => {
            if (!open) setEditUser(null);
          }}
        />
      )}
    </div>
  );
}
