"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteCode } from "./actions";
import { CodeFormDialog } from "./code-form-dialog";
import type { XactimateCode } from "./admin-tabs";

interface CodesTableProps {
  codes: XactimateCode[];
}

export function CodesTable({ codes }: CodesTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editCode, setEditCode] = useState<XactimateCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<XactimateCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Unique categories for filter
  const categories = useMemo(
    () => [...new Set(codes.map((c) => c.category))].sort(),
    [codes]
  );

  const filtered = useMemo(() => {
    let result = codes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((c) => c.category === categoryFilter);
    }
    if (onlyMissed) {
      result = result.filter((c) => c.commonly_missed);
    }
    return result;
  }, [codes, search, categoryFilter, onlyMissed]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCode(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Code deleted.");
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Switch
            id="only-missed"
            checked={onlyMissed}
            onCheckedChange={setOnlyMissed}
          />
          <Label htmlFor="only-missed" className="text-sm cursor-pointer">
            Commonly Missed
          </Label>
        </div>
        <div className="flex-1" />
        <Button onClick={() => { setEditCode(null); setFormOpen(true); }}>
          + Add Code
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[60px]">Unit</TableHead>
              <TableHead className="w-[80px]">Missed</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {codes.length === 0
                    ? "No codes yet. Add your first Xactimate code."
                    : "No codes match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.code}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {c.description}
                  </TableCell>
                  <TableCell>{c.unit}</TableCell>
                  <TableCell>
                    {c.commonly_missed && (
                      <Badge variant="default" className="text-xs">
                        Missed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                            />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditCode(c);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(c)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {codes.length} codes
      </p>

      {/* Create/Edit Dialog */}
      {formOpen && (
        <CodeFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditCode(null);
          }}
          existing={editCode}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this code?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.code} — {deleteTarget?.description}&quot; will
              be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
