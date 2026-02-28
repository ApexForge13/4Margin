"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setCheckOutcome } from "@/app/(dashboard)/dashboard/policy-checks/actions";

export function OutcomeActions({ checkId }: { checkId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleOutcome = async (outcome: "claim_filed" | "no_claim") => {
    setLoading(outcome);
    const result = await setCheckOutcome(checkId, outcome);
    if (result.error) {
      alert(result.error);
    }
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="rounded-lg border p-4">
      <h4 className="text-sm font-semibold mb-2">What happened with this claim?</h4>
      <p className="text-xs text-muted-foreground mb-3">
        This helps us improve our analysis and determines follow-up actions.
      </p>
      <div className="flex gap-3">
        <Button
          variant="default"
          size="sm"
          disabled={loading !== null}
          onClick={() => handleOutcome("claim_filed")}
        >
          {loading === "claim_filed" ? "Saving..." : "Claim Filed"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => handleOutcome("no_claim")}
        >
          {loading === "no_claim" ? "Saving..." : "No Claim Filed"}
        </Button>
      </div>
    </div>
  );
}
