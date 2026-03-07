"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { addDomain, removeDomain } from "./actions";
import { toast } from "sonner";

interface Domain {
  id: string;
  domain: string;
  created_at: string;
}

interface Props {
  domains: Domain[];
}

export function DomainsTab({ domains }: Props) {
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setSaving(true);
    const formData = new FormData();
    formData.set("domain", newDomain.trim());
    const result = await addDomain(formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Domain added");
      setNewDomain("");
    }
  };

  const handleRemove = async (domainId: string, domain: string) => {
    if (!confirm(`Remove "${domain}"? New signups with this domain will no longer auto-join.`))
      return;
    const result = await removeDomain(domainId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Domain removed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email Domains</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          New users who sign up with an email matching these domains will
          automatically join your company.
        </p>

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="max-w-xs"
          />
          <Button type="submit" size="sm" disabled={saving || !newDomain.trim()}>
            {saving ? "Adding..." : "Add Domain"}
          </Button>
        </form>

        {domains.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.domain}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRemove(d.id, d.domain)}
                    >
                      Remove
                    </Button>
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
