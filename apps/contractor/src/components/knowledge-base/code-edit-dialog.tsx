"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  updateBuildingCode,
  updateCodeJurisdiction,
} from "@/app/(dashboard)/dashboard/knowledge-base/actions";
import { toast } from "sonner";
import type {
  KbBuildingCode,
  KbCodeJurisdiction,
} from "@/app/(dashboard)/dashboard/knowledge-base/types";

interface CodeEditDialogProps {
  code: KbBuildingCode;
  /** The currently selected state, used to filter which jurisdiction to edit */
  selectedState: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CodeEditDialog({
  code,
  selectedState,
  open,
  onOpenChange,
}: CodeEditDialogProps) {
  const jurisdiction = code.kb_code_jurisdictions.find(
    (j) => j.state === selectedState
  );

  const [loading, setLoading] = useState(false);

  // Code-level fields
  const [requirement, setRequirement] = useState(code.requirement);
  const [justification, setJustification] = useState(code.justification_text);
  const [typicalObjection, setTypicalObjection] = useState(
    code.typical_objection ?? ""
  );
  const [rebuttal, setRebuttal] = useState(code.rebuttal ?? "");
  const [objectionRate, setObjectionRate] = useState(
    code.carrier_objection_rate
  );

  // Jurisdiction-level fields
  const [sourceRef, setSourceRef] = useState(jurisdiction?.source_ref ?? "");
  const [sourceUrls, setSourceUrls] = useState<string[]>(
    jurisdiction?.source_urls ?? []
  );
  const [ircEdition, setIrcEdition] = useState(
    jurisdiction?.irc_edition ?? "2018 IRC"
  );

  const addSourceUrl = () => setSourceUrls([...sourceUrls, ""]);
  const removeSourceUrl = (idx: number) =>
    setSourceUrls(sourceUrls.filter((_, i) => i !== idx));
  const updateSourceUrl = (idx: number, value: string) =>
    setSourceUrls(sourceUrls.map((u, i) => (i === idx ? value : u)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Update building code
    const codeResult = await updateBuildingCode(code.id, {
      requirement,
      justification_text: justification,
      typical_objection: typicalObjection || undefined,
      rebuttal: rebuttal || undefined,
      carrier_objection_rate: objectionRate,
    });

    if (codeResult.error) {
      toast.error(`Code update failed: ${codeResult.error}`);
      setLoading(false);
      return;
    }

    // Update jurisdiction if we have one
    if (jurisdiction) {
      const filteredUrls = sourceUrls.filter((u) => u.trim() !== "");
      const jResult = await updateCodeJurisdiction(jurisdiction.id, {
        source_ref: sourceRef || undefined,
        source_urls: filteredUrls,
        irc_edition: ircEdition,
      });

      if (jResult.error) {
        toast.error(`Jurisdiction update failed: ${jResult.error}`);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    toast.success(`Updated ${code.section} - ${code.title}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Edit {code.section} &mdash; {code.title}
            </DialogTitle>
            <DialogDescription>
              Update building code data and {selectedState} jurisdiction
              details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Requirement */}
            <div className="space-y-2">
              <Label htmlFor="requirement">Requirement</Label>
              <Textarea
                id="requirement"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Justification Text */}
            <div className="space-y-2">
              <Label htmlFor="justification">Justification Text</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Typical Objection */}
              <div className="space-y-2">
                <Label htmlFor="objection">Typical Objection</Label>
                <Textarea
                  id="objection"
                  value={typicalObjection}
                  onChange={(e) => setTypicalObjection(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>

              {/* Rebuttal */}
              <div className="space-y-2">
                <Label htmlFor="rebuttal">Rebuttal</Label>
                <Textarea
                  id="rebuttal"
                  value={rebuttal}
                  onChange={(e) => setRebuttal(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Objection Rate */}
            <div className="space-y-2">
              <Label htmlFor="objection-rate">Carrier Objection Rate</Label>
              <Select value={objectionRate} onValueChange={setObjectionRate}>
                <SelectTrigger id="objection-rate" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jurisdiction Section */}
            {jurisdiction && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-4">
                  {selectedState} Jurisdiction Details
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="irc-edition">IRC Edition</Label>
                    <Input
                      id="irc-edition"
                      value={ircEdition}
                      onChange={(e) => setIrcEdition(e.target.value)}
                      placeholder="2018 IRC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-ref">Source Reference</Label>
                    <Input
                      id="source-ref"
                      value={sourceRef}
                      onChange={(e) => setSourceRef(e.target.value)}
                      placeholder="COMAR 09.12.01; 2018 IRC R905.2.1"
                    />
                  </div>
                </div>

                {/* Source URLs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Source URLs</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSourceUrl}
                      className="h-7 text-xs"
                    >
                      + Add URL
                    </Button>
                  </div>
                  {sourceUrls.length === 0 && (
                    <p className="text-xs text-gray-400">
                      No source URLs. Click &quot;+ Add URL&quot; to add one.
                    </p>
                  )}
                  {sourceUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="url"
                        value={url}
                        onChange={(e) => updateSourceUrl(idx, e.target.value)}
                        placeholder="https://..."
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSourceUrl(idx)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
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
