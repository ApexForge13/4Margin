"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPolicyCheck } from "@/app/(dashboard)/dashboard/policy-checks/actions";
import { POLICY_CHECK_PRICE_DISPLAY } from "@/lib/stripe/constants";

const CLAIM_TYPES = [
  { value: "wind", label: "Wind" },
  { value: "hail", label: "Hail" },
  { value: "fire", label: "Fire" },
  { value: "water_flood", label: "Water / Flood" },
  { value: "impact", label: "Impact (tree, debris)" },
  { value: "theft", label: "Theft" },
  { value: "other", label: "Other" },
];

interface SendCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SendCheckDialog({
  open,
  onOpenChange,
  onSuccess,
}: SendCheckDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [claimType, setClaimType] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create the policy check record
      const result = await createPolicyCheck({
        homeownerEmail: email,
        homeownerFirstName: firstName || undefined,
        homeownerLastName: lastName || undefined,
        claimType: claimType || undefined,
      });

      if (result.error || !result.id) {
        setError(result.error || "Failed to create policy check");
        setLoading(false);
        return;
      }

      // 2. Redirect to Stripe checkout
      const checkoutRes = await fetch("/api/stripe/policy-check-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyCheckId: result.id }),
      });

      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({}));
        setError(err.error || "Payment setup failed");
        setLoading(false);
        return;
      }

      const { url } = await checkoutRes.json();

      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setClaimType("");
      onOpenChange(false);
      onSuccess();

      // Navigate to checkout (or success URL if free)
      if (url) {
        router.push(url);
      }
    } catch (err) {
      console.error("Send check error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Policy Check Link</DialogTitle>
          <DialogDescription>
            Send a link to a homeowner to upload their policy. You&apos;ll
            receive a full analysis when they submit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ho-email">Homeowner email *</Label>
            <Input
              id="ho-email"
              type="email"
              placeholder="homeowner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ho-first">First name</Label>
              <Input
                id="ho-first"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ho-last">Last name</Label>
              <Input
                id="ho-last"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-type">Claim type</Label>
            <Select value={claimType} onValueChange={setClaimType}>
              <SelectTrigger>
                <SelectValue placeholder="Select damage type" />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {POLICY_CHECK_PRICE_DISPLAY} per check &middot; First one free
            </p>
            <Button type="submit" disabled={loading || !email}>
              {loading ? "Processing..." : "Continue to Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
