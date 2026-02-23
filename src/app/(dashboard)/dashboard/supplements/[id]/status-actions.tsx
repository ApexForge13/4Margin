"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultDialog } from "@/components/supplements/result-dialog";
import { updateSupplementStatus } from "@/app/(dashboard)/dashboard/actions";
import { toast } from "sonner";
import type { SupplementStatus } from "@/lib/constants";

interface StatusActionsProps {
  supplementId: string;
  status: SupplementStatus;
  carrierName?: string;
}

export function StatusActions({
  supplementId,
  status,
  carrierName,
}: StatusActionsProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);

  const handleMarkSubmitted = async () => {
    setSubmitting(true);
    const result = await updateSupplementStatus(supplementId, "submitted", {
      submittedTo: carrierName || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Supplement marked as submitted.");
    }
  };

  if (status === "complete") {
    return (
      <Button onClick={handleMarkSubmitted} disabled={submitting}>
        {submitting ? "Submitting..." : "Mark as Submitted"}
      </Button>
    );
  }

  if (status === "submitted") {
    return (
      <>
        <Button onClick={() => setShowResultDialog(true)}>
          Record Result
        </Button>
        <ResultDialog
          open={showResultDialog}
          onOpenChange={setShowResultDialog}
          supplementId={supplementId}
        />
      </>
    );
  }

  return null;
}
