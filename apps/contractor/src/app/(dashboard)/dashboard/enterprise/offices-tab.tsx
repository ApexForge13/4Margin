"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createOffice, updateOffice, deleteOffice } from "./actions";
import { toast } from "sonner";

interface Office {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  created_at: string;
}

interface Props {
  offices: Office[];
}

export function OfficesTab({ offices }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = await createOffice(formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Office created");
      setShowAdd(false);
    }
  };

  const handleUpdate = async (
    officeId: string,
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateOffice(officeId, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Office updated");
      setEditingId(null);
    }
  };

  const handleDelete = async (officeId: string, name: string) => {
    if (!confirm(`Delete office "${name}"? Users will be unassigned.`)) return;
    const result = await deleteOffice(officeId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Office deleted");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Offices</CardTitle>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm">Add Office</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Office</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Name *</Label>
                <Input id="new-name" name="name" required />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-city">City</Label>
                  <Input id="new-city" name="city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-state">State</Label>
                  <Input id="new-state" name="state" maxLength={2} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Office"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {offices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No offices yet. Add your first office to organize your team.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {offices.map((office) =>
                editingId === office.id ? (
                  <TableRow key={office.id}>
                    <TableCell colSpan={3}>
                      <form
                        onSubmit={(e) => handleUpdate(office.id, e)}
                        className="flex items-center gap-2"
                      >
                        <Input
                          name="name"
                          defaultValue={office.name}
                          className="w-40"
                          required
                        />
                        <Input
                          name="city"
                          defaultValue={office.city || ""}
                          className="w-28"
                          placeholder="City"
                        />
                        <Input
                          name="state"
                          defaultValue={office.state || ""}
                          className="w-16"
                          placeholder="ST"
                          maxLength={2}
                        />
                        <Button type="submit" size="sm" disabled={saving}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={office.id}>
                    <TableCell className="font-medium">{office.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[office.city, office.state].filter(Boolean).join(", ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(office.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(office.id, office.name)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
