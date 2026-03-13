"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, Loader2, Check } from "lucide-react";

interface CarrierBattleCardProps {
  carrierName: string;
  riskLevel: string;
  decodingId: string;
  initialNotes?: string;
}

type SaveState = "idle" | "saving" | "saved";

export function CarrierBattleCard({
  carrierName,
  riskLevel,
  decodingId,
  initialNotes,
}: CarrierBattleCardProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const saveNotes = useCallback(
    async (text: string) => {
      // Abort any in-flight request
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setSaveState("saving");

      try {
        const res = await fetch(`/api/policy-decoder/${decodingId}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: text }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Save failed");

        setSaveState("saved");
        // Reset to idle after 2s
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSaveState("idle");
        }
      }
    },
    [decodingId]
  );

  // Debounced save — 1 second after typing stops
  useEffect(() => {
    // Don't save on initial mount or if notes haven't changed from initial
    if (notes === (initialNotes || "")) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNotes(notes), 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, initialNotes, saveNotes]);

  const riskBadge = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  }[riskLevel] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4 text-[#344767]" />
            Carrier Battle Card
          </CardTitle>
          <div className="flex items-center gap-2">
            {saveState === "saving" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{carrierName || "Unknown Carrier"}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${riskBadge}`}>
            {(riskLevel || "unknown").toUpperCase()} RISK
          </Badge>
        </div>

        <textarea
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#00BFFF] focus:outline-none focus:ring-1 focus:ring-[#00BFFF] resize-y min-h-[80px]"
          rows={3}
          placeholder="Add your notes about this carrier — negotiation tactics, claim patterns, adjuster contacts..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <p className="text-[11px] text-muted-foreground">
          Your notes are saved to this decoding and persist for future reference.
        </p>
      </CardContent>
    </Card>
  );
}
