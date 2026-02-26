"use client";

import { useState } from "react";
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
import { archiveClaim } from "@/app/(dashboard)/dashboard/actions";

interface ClaimDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  claimName: string;
}

export function ClaimDeleteDialog({
  open,
  onOpenChange,
  claimId,
  claimName,
}: ClaimDeleteDialogProps) {
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    const result = await archiveClaim(claimId);
    setArchiving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Claim archived.");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this claim?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{claimName}&quot; will be hidden from your dashboard. You can
            restore it later using the &quot;Show Archived&quot; toggle.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={archiving}>
            {archiving ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
