"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { updateUserRole, assignUserOffice } from "./actions";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  office_id: string | null;
}

interface Office {
  id: string;
  name: string;
}

interface Props {
  users: User[];
  offices: Office[];
}

export function UsersTab({ users, offices }: Props) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (newRole !== "user" && newRole !== "office_manager") return;
    setUpdating(userId);
    const result = await updateUserRole(userId, newRole);
    setUpdating(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role updated");
    }
  };

  const handleOfficeChange = async (userId: string, officeId: string) => {
    setUpdating(userId);
    const result = await assignUserOffice(
      userId,
      officeId === "none" ? null : officeId
    );
    setUpdating(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Office updated");
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Owner";
      case "office_manager":
        return "Manager";
      case "admin":
        return "Admin";
      default:
        return "Rep";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No team members.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Office</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {user.role === "owner" ? (
                      <Badge>Owner</Badge>
                    ) : (
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue>
                            {roleLabel(user.role)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Rep</SelectItem>
                          <SelectItem value="office_manager">
                            Manager
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === "owner" ? (
                      <span className="text-sm text-muted-foreground">
                        All offices
                      </span>
                    ) : (
                      <Select
                        value={user.office_id || "none"}
                        onValueChange={(v) => handleOfficeChange(user.id, v)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {offices.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
