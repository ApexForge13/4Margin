"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultDialog } from "@/components/supplements/result-dialog";
import type { SupplementStatus } from "@/lib/constants";

interface StatusActionsProps {
  supplementId: string;
  status: SupplementStatus;
}

export function StatusActions({
  supplementId,
  status,
}: StatusActionsProps) {
  const [showResultDialog, setShowResultDialog] = useState(false);

  if (status === "complete") {
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
