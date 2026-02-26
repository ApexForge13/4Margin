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
import { toast } from "sonner";
import { createCarrier, updateCarrier } from "./actions";
import type { Carrier } from "./admin-tabs";

interface CarrierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: Carrier | null;
}

export function CarrierFormDialog({
  open,
  onOpenChange,
  existing,
}: CarrierFormDialogProps) {
  const isEdit = !!existing;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(existing?.name || "");
  const [claimsEmail, setClaimsEmail] = useState(existing?.claims_email || "");
  const [claimsPhone, setClaimsPhone] = useState(existing?.claims_phone || "");
  const [claimsPortalUrl, setClaimsPortalUrl] = useState(
    existing?.claims_portal_url || ""
  );
  const [notes, setNotes] = useState(existing?.notes || "");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Carrier name is required.");
      return;
    }

    setSaving(true);
    const payload = { name, claimsEmail, claimsPhone, claimsPortalUrl, notes };

    const result = isEdit
      ? await updateCarrier(existing.id, payload)
      : await createCarrier(payload);

    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEdit ? "Carrier updated." : "Carrier added.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Carrier" : "Add Carrier"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="carrier-name">Name *</Label>
            <Input
              id="carrier-name"
              placeholder="e.g. State Farm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="carrier-email">Claims Email</Label>
              <Input
                id="carrier-email"
                type="email"
                placeholder="claims@carrier.com"
                value={claimsEmail}
                onChange={(e) => setClaimsEmail(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier-phone">Claims Phone</Label>
              <Input
                id="carrier-phone"
                type="tel"
                placeholder="(800) 555-0100"
                value={claimsPhone}
                onChange={(e) => setClaimsPhone(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carrier-portal">Portal URL</Label>
            <Input
              id="carrier-portal"
              type="url"
              placeholder="https://portal.carrier.com"
              value={claimsPortalUrl}
              onChange={(e) => setClaimsPortalUrl(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="carrier-notes">Notes</Label>
            <Input
              id="carrier-notes"
              placeholder="Internal notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
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
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Carrier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
