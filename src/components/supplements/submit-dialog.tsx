"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateSupplementStatus } from "@/app/(dashboard)/dashboard/actions";

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplementId: string;
  carrierName?: string;
}

export function SubmitDialog({
  open,
  onOpenChange,
  supplementId,
  carrierName,
}: SubmitDialogProps) {
  const [saving, setSaving] = useState(false);
  const [submittedTo, setSubmittedTo] = useState(carrierName || "");

  const handleSubmit = async () => {
    setSaving(true);
    const result = await updateSupplementStatus(supplementId, "submitted", {
      submittedTo: submittedTo || undefined,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Supplement marked as submitted.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Submitted</DialogTitle>
          <DialogDescription>
            Confirm that this supplement has been sent to the insurance carrier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="submitted-to">Submitted to</Label>
            <Input
              id="submitted-to"
              placeholder="Carrier name or portal"
              value={submittedTo}
              onChange={(e) => setSubmittedTo(e.target.value)}
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
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Submitting..." : "Confirm Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
