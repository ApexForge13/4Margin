"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteDialog } from "@/components/admin/invite-dialog";
import type { TeamMember } from "./admin-tabs";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  user: "outline",
};

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface TeamTableProps {
  team: TeamMember[];
  pendingInvites?: PendingInvite[];
}

export function TeamTable({ team, pendingInvites = [] }: TeamTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1" />
        <InviteDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              team.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name}</TableCell>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[m.role] ?? "outline"}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {team.length} team member{team.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
