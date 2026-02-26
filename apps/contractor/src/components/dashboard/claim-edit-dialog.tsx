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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { updateClaim } from "@/app/(dashboard)/dashboard/actions";

interface ClaimData {
  id: string;
  notes: string | null;
  claim_number: string | null;
  policy_number: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  date_of_loss: string | null;
  adjuster_name: string | null;
  adjuster_email: string | null;
  adjuster_phone: string | null;
  carriers: { name: string } | null;
}

interface ClaimEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: ClaimData;
}

export function ClaimEditDialog({
  open,
  onOpenChange,
  claim,
}: ClaimEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(claim.notes || "");
  const [claimNumber, setClaimNumber] = useState(claim.claim_number || "");
  const [policyNumber, setPolicyNumber] = useState(claim.policy_number || "");
  const [carrierName, setCarrierName] = useState(claim.carriers?.name || "");
  const [propertyAddress, setPropertyAddress] = useState(claim.property_address || "");
  const [propertyCity, setPropertyCity] = useState(claim.property_city || "");
  const [propertyState, setPropertyState] = useState(claim.property_state || "");
  const [propertyZip, setPropertyZip] = useState(claim.property_zip || "");
  const [dateOfLoss, setDateOfLoss] = useState(claim.date_of_loss || "");
  const [adjusterName, setAdjusterName] = useState(claim.adjuster_name || "");
  const [adjusterEmail, setAdjusterEmail] = useState(claim.adjuster_email || "");
  const [adjusterPhone, setAdjusterPhone] = useState(claim.adjuster_phone || "");

  const handleSave = async () => {
    setSaving(true);
    const result = await updateClaim(claim.id, {
      notes,
      claimNumber,
      policyNumber,
      propertyAddress,
      propertyCity,
      propertyState,
      propertyZip,
      dateOfLoss,
      adjusterName,
      adjusterEmail,
      adjusterPhone,
      carrierName,
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Claim</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Claim name</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-claimNumber">Claim #</Label>
              <Input
                id="edit-claimNumber"
                value={claimNumber}
                onChange={(e) => setClaimNumber(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-policyNumber">Policy #</Label>
              <Input
                id="edit-policyNumber"
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

          <div className="space-y-2">
            <Label htmlFor="edit-address">Property address</Label>
            <Input
              id="edit-address"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
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
                onChange={(e) => setPropertyState(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zip">Zip</Label>
              <Input
                id="edit-zip"
                value={propertyZip}
                onChange={(e) => setPropertyZip(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="edit-adjuster">Adjuster name</Label>
            <Input
              id="edit-adjuster"
              value={adjusterName}
              onChange={(e) => setAdjusterName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-adjEmail">Adjuster email</Label>
              <Input
                id="edit-adjEmail"
                type="email"
                value={adjusterEmail}
                onChange={(e) => setAdjusterEmail(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-adjPhone">Adjuster phone</Label>
              <Input
                id="edit-adjPhone"
                type="tel"
                value={adjusterPhone}
                onChange={(e) => setAdjusterPhone(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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
