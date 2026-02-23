"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createCode, updateCode } from "./actions";
import type { XactimateCode } from "./admin-tabs";

interface CodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: XactimateCode | null;
}

export function CodeFormDialog({
  open,
  onOpenChange,
  existing,
}: CodeFormDialogProps) {
  const isEdit = !!existing;
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState(existing?.code || "");
  const [category, setCategory] = useState(existing?.category || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [unit, setUnit] = useState(existing?.unit || "");
  const [defaultJustification, setDefaultJustification] = useState(
    existing?.default_justification || ""
  );
  const [ircReference, setIrcReference] = useState(
    existing?.irc_reference || ""
  );
  const [commonlyMissed, setCommonlyMissed] = useState(
    existing?.commonly_missed || false
  );
  const [notes, setNotes] = useState(existing?.notes || "");

  const handleSave = async () => {
    if (!code.trim() || !category.trim() || !description.trim() || !unit.trim()) {
      toast.error("Code, category, description, and unit are required.");
      return;
    }

    setSaving(true);
    const payload = {
      code,
      category,
      description,
      unit,
      defaultJustification,
      ircReference,
      commonlyMissed,
      notes,
    };

    const result = isEdit
      ? await updateCode(existing.id, payload)
      : await createCode(payload);

    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Code updated." : "Code created.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Code" : "Add Xactimate Code"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="xact-code">Code *</Label>
              <Input
                id="xact-code"
                placeholder="e.g. RFG 240"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xact-category">Category *</Label>
              <Input
                id="xact-category"
                placeholder="e.g. Roofing"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="xact-desc">Description *</Label>
            <Input
              id="xact-desc"
              placeholder="e.g. Remove & replace comp shingles"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="xact-unit">Unit *</Label>
              <Input
                id="xact-unit"
                placeholder="e.g. SQ, LF, EA"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xact-irc">IRC Reference</Label>
              <Input
                id="xact-irc"
                placeholder="e.g. R905.2"
                value={ircReference}
                onChange={(e) => setIrcReference(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="xact-just">Default Justification</Label>
            <Input
              id="xact-just"
              placeholder="Standard justification text"
              value={defaultJustification}
              onChange={(e) => setDefaultJustification(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="xact-notes">Notes</Label>
            <Input
              id="xact-notes"
              placeholder="Internal notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="xact-missed"
              checked={commonlyMissed}
              onCheckedChange={setCommonlyMissed}
              disabled={saving}
            />
            <Label htmlFor="xact-missed" className="cursor-pointer">
              Commonly Missed Item
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
