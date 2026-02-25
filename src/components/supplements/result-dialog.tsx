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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { resultSupplement } from "@/app/(dashboard)/dashboard/actions";

type Outcome = "approved" | "partially_approved" | "denied";

interface ResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplementId: string;
}

const outcomeOptions: {
  value: Outcome;
  label: string;
  description: string;
  activeClasses: string;
}[] = [
  {
    value: "approved",
    label: "Approved",
    description: "Carrier approved the full supplement",
    activeClasses: "border-green-500 bg-green-50",
  },
  {
    value: "partially_approved",
    label: "Partially Approved",
    description: "Carrier approved a portion of the supplement",
    activeClasses: "border-green-400 bg-green-50/50",
  },
  {
    value: "denied",
    label: "Denied",
    description: "Carrier denied the supplement",
    activeClasses: "border-red-500 bg-red-50",
  },
];

export function ResultDialog({
  open,
  onOpenChange,
  supplementId,
}: ResultDialogProps) {
  const [outcome, setOutcome] = useState<Outcome>("approved");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleResult = async () => {
    setSaving(true);

    const result = await resultSupplement(supplementId, outcome, {
      approvedAmount:
        outcome === "partially_approved" && approvedAmount
          ? parseFloat(approvedAmount)
          : undefined,
      denialReason: outcome === "denied" ? denialReason : undefined,
    });

    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      const messages: Record<Outcome, string> = {
        approved: "Supplement marked as approved!",
        partially_approved: "Supplement marked as partially approved.",
        denied: "Supplement marked as denied.",
      };
      toast.success(messages[outcome]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Result</DialogTitle>
          <DialogDescription>
            What was the insurance carrier&apos;s decision on this supplement?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Outcome selector */}
          <div className="grid gap-2">
            {outcomeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOutcome(opt.value)}
                disabled={saving}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  outcome === opt.value
                    ? opt.activeClasses
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">
                  {opt.description}
                </p>
              </button>
            ))}
          </div>

          {/* Partial: approved amount */}
          {outcome === "partially_approved" && (
            <div className="space-y-2">
              <Label htmlFor="approved-amount">Approved Amount ($)</Label>
              <Input
                id="approved-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                disabled={saving}
              />
            </div>
          )}

          {/* Denied: reason */}
          {outcome === "denied" && (
            <div className="space-y-2">
              <Label htmlFor="denial-reason">Denial Reason</Label>
              <Textarea
                id="denial-reason"
                placeholder="Why was the supplement denied?"
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                disabled={saving}
              />
            </div>
          )}

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleResult} disabled={saving}>
            {saving ? "Saving..." : "Save Result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
