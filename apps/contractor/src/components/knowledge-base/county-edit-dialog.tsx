"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCounty } from "@/app/(dashboard)/dashboard/knowledge-base/actions";
import { toast } from "sonner";
import type { KbCounty } from "@/app/(dashboard)/dashboard/knowledge-base/types";

interface CountyEditDialogProps {
  county: KbCounty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CountyEditDialog({
  county,
  open,
  onOpenChange,
}: CountyEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [ahjName, setAhjName] = useState(county.ahj_name ?? "");
  const [ahjPhone, setAhjPhone] = useState(county.ahj_phone ?? "");
  const [ahjUrl, setAhjUrl] = useState(county.ahj_url ?? "");
  const [permitRequired, setPermitRequired] = useState(county.permit_required);
  const [permitFeeRange, setPermitFeeRange] = useState(
    county.permit_fee_range ?? ""
  );
  const [permitNotes, setPermitNotes] = useState(county.permit_notes ?? "");
  const [designWindSpeed, setDesignWindSpeed] = useState(
    county.design_wind_speed
  );
  const [climateZone, setClimateZone] = useState(county.climate_zone);
  const [highWindZone, setHighWindZone] = useState(county.high_wind_zone);
  const [iceBarrier, setIceBarrier] = useState(
    county.ice_barrier_requirement
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateCounty(county.id, {
      ahj_name: ahjName || undefined,
      ahj_phone: ahjPhone || undefined,
      ahj_url: ahjUrl || undefined,
      permit_required: permitRequired,
      permit_fee_range: permitFeeRange || undefined,
      permit_notes: permitNotes || undefined,
      design_wind_speed: designWindSpeed,
      climate_zone: climateZone,
      high_wind_zone: highWindZone,
      ice_barrier_requirement: iceBarrier,
    });

    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`Updated ${county.county}, ${county.state}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Edit {county.county}, {county.state}
            </DialogTitle>
            <DialogDescription>
              Update county jurisdiction data. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* AHJ Section */}
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-2">
              Authority Having Jurisdiction
            </div>

            <div className="space-y-2">
              <Label htmlFor="ahj-name">AHJ Name</Label>
              <Input
                id="ahj-name"
                value={ahjName}
                onChange={(e) => setAhjName(e.target.value)}
                placeholder="County Dept. of Permits"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ahj-phone">AHJ Phone</Label>
                <Input
                  id="ahj-phone"
                  value={ahjPhone}
                  onChange={(e) => setAhjPhone(e.target.value)}
                  placeholder="410-555-1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ahj-url">AHJ URL</Label>
                <Input
                  id="ahj-url"
                  type="url"
                  value={ahjUrl}
                  onChange={(e) => setAhjUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Permit Section */}
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-4">
              Permit Information
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="permit-required"
                checked={permitRequired}
                onCheckedChange={(checked) =>
                  setPermitRequired(checked === true)
                }
              />
              <Label htmlFor="permit-required">Permit Required</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permit-fee">Fee Range</Label>
                <Input
                  id="permit-fee"
                  value={permitFeeRange}
                  onChange={(e) => setPermitFeeRange(e.target.value)}
                  placeholder="$100-$250"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permit-notes">Notes</Label>
                <Input
                  id="permit-notes"
                  value={permitNotes}
                  onChange={(e) => setPermitNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            {/* Technical Section */}
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-4">
              Technical Requirements
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wind-speed">Design Wind Speed (mph)</Label>
                <Input
                  id="wind-speed"
                  type="number"
                  value={designWindSpeed}
                  onChange={(e) =>
                    setDesignWindSpeed(parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="climate-zone">Climate Zone</Label>
                <Select value={climateZone} onValueChange={setClimateZone}>
                  <SelectTrigger id="climate-zone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4A">4A</SelectItem>
                    <SelectItem value="5A">5A</SelectItem>
                    <SelectItem value="6A">6A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="high-wind"
                checked={highWindZone}
                onCheckedChange={(checked) =>
                  setHighWindZone(checked === true)
                }
              />
              <Label htmlFor="high-wind">High Wind Zone</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ice-barrier">Ice Barrier Requirement</Label>
              <Select value={iceBarrier} onValueChange={setIceBarrier}>
                <SelectTrigger id="ice-barrier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eaves_only">Eaves Only</SelectItem>
                  <SelectItem value="eaves_valleys_penetrations">
                    Eaves, Valleys & Penetrations
                  </SelectItem>
                  <SelectItem value="eaves_valleys_penetrations_extended">
                    Extended (Eaves, Valleys, Penetrations)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
