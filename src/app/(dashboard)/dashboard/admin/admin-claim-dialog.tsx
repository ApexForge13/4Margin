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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { adminUpdateClaim } from "./actions";
import type { AdminClaim } from "./claims-table";

interface AdminClaimDialogProps {
  claim: AdminClaim;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminClaimDialog({
  claim,
  open,
  onOpenChange,
}: AdminClaimDialogProps) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(claim.notes || "");
  const [claimNumber, setClaimNumber] = useState(claim.claim_number || "");
  const [policyNumber, setPolicyNumber] = useState(claim.policy_number || "");
  const [propertyAddress, setPropertyAddress] = useState(
    claim.property_address || ""
  );
  const [propertyCity, setPropertyCity] = useState(claim.property_city || "");
  const [propertyState, setPropertyState] = useState(
    claim.property_state || ""
  );
  const [dateOfLoss, setDateOfLoss] = useState(claim.date_of_loss || "");
  const [adjusterName, setAdjusterName] = useState(claim.adjuster_name || "");
  const [adjusterEmail, setAdjusterEmail] = useState(
    claim.adjuster_email || ""
  );
  const [adjusterPhone, setAdjusterPhone] = useState(
    claim.adjuster_phone || ""
  );
  const [carrierName, setCarrierName] = useState(claim.carrierName || "");
  const [description, setDescription] = useState(claim.description || "");
  const [adjusterScopeNotes, setAdjusterScopeNotes] = useState(
    claim.adjuster_scope_notes || ""
  );
  const [itemsBelievedMissing, setItemsBelievedMissing] = useState(
    claim.items_believed_missing || ""
  );
  const [priorSupplementHistory, setPriorSupplementHistory] = useState(
    claim.prior_supplement_history || ""
  );

  const handleSave = async () => {
    setSaving(true);
    const result = await adminUpdateClaim(claim.id, {
      notes,
      claimNumber,
      policyNumber,
      propertyAddress,
      propertyCity,
      propertyState,
      dateOfLoss,
      adjusterName,
      adjusterEmail,
      adjusterPhone,
      carrierName,
      description,
      adjusterScopeNotes,
      itemsBelievedMissing,
      priorSupplementHistory,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Claim updated.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Claim</DialogTitle>
          {claim.companyName && (
            <p className="text-sm text-muted-foreground">
              {claim.companyName} &middot; {claim.userName}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Claim Name</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-claim-number">Claim #</Label>
              <Input
                id="edit-claim-number"
                value={claimNumber}
                onChange={(e) => setClaimNumber(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-policy-number">Policy #</Label>
              <Input
                id="edit-policy-number"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-carrier">Carrier</Label>
              <Input
                id="edit-carrier"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dol">Date of Loss</Label>
              <Input
                id="edit-dol"
                type="date"
                value={dateOfLoss}
                onChange={(e) => setDateOfLoss(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Property */}
          <div className="space-y-2">
            <Label htmlFor="edit-address">Property Address</Label>
            <Input
              id="edit-address"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={propertyCity}
                onChange={(e) => setPropertyCity(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State</Label>
              <Input
                id="edit-state"
                value={propertyState}
                onChange={(e) => setPropertyState(e.target.value.toUpperCase())}
                maxLength={2}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Adjuster */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-adj-name">Adjuster</Label>
              <Input
                id="edit-adj-name"
                value={adjusterName}
                onChange={(e) => setAdjusterName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-adj-email">Adjuster Email</Label>
              <Input
                id="edit-adj-email"
                type="email"
                value={adjusterEmail}
                onChange={(e) => setAdjusterEmail(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-adj-phone">Adjuster Phone</Label>
              <Input
                id="edit-adj-phone"
                type="tel"
                value={adjusterPhone}
                onChange={(e) => setAdjusterPhone(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Claim Overview */}
          <p className="text-sm font-semibold">Claim Overview</p>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-scope">Adjuster Scope Notes</Label>
            <Textarea
              id="edit-scope"
              rows={3}
              value={adjusterScopeNotes}
              onChange={(e) => setAdjusterScopeNotes(e.target.value)}
              disabled={saving}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-missing">Items Believed Missing</Label>
            <Textarea
              id="edit-missing"
              rows={3}
              value={itemsBelievedMissing}
              onChange={(e) => setItemsBelievedMissing(e.target.value)}
              disabled={saving}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-history">Prior Supplement History</Label>
            <Textarea
              id="edit-history"
              rows={3}
              value={priorSupplementHistory}
              onChange={(e) => setPriorSupplementHistory(e.target.value)}
              disabled={saving}
              className="resize-y"
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
