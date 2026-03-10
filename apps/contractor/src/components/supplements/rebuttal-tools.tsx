"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RebuttalItem {
  id: string;
  xactimate_code: string;
  description: string;
  total_price: number;
}

interface RebuttalToolsProps {
  supplementId: string;
  items: RebuttalItem[];
  existingRebuttalUrl: string | null;
}

export function RebuttalTools({ supplementId, items, existingRebuttalUrl }: RebuttalToolsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [uploadingAi, setUploadingAi] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(existingRebuttalUrl);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleManualRebuttal = async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/supplements/${supplementId}/rebuttal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deniedItemIds: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate rebuttal");

      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleAiUpload = async (file: File) => {
    setUploadingAi(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("denialLetter", file);

      const res = await fetch(`/api/supplements/${supplementId}/rebuttal/ai`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process denial letter");

      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI processing failed");
    } finally {
      setUploadingAi(false);
    }
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Rebuttal Tools
          <Badge variant="destructive" className="ml-2 text-[10px]">DENIED</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Select denied items:</p>
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
              {selectedIds.size === items.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs font-mono text-sky-600 shrink-0">{item.xactimate_code}</span>
                <span className="text-xs truncate flex-1">{item.description}</span>
                <span className="text-xs font-medium text-gray-500 shrink-0">{fmt(item.total_price)}</span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleManualRebuttal}
            disabled={selectedIds.size === 0 || generating}
            className="w-full mt-3"
            variant="destructive"
          >
            {generating ? "Generating..." : `Generate Rebuttal Letter (${selectedIds.size} items)`}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-red-200" />
          <span className="text-[10px] font-medium text-red-400 uppercase">or</span>
          <div className="flex-1 h-px bg-red-200" />
        </div>

        {/* AI Upload */}
        <div>
          <p className="text-sm font-medium mb-2">Upload denial letter for AI analysis:</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAiUpload(file);
            }}
          />
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={uploadingAi}
            onClick={() => fileRef.current?.click()}
          >
            {uploadingAi ? "Analyzing denial letter..." : "Upload Denial Letter (PDF/Image)"}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1">
            AI will extract denied items and generate a point-by-point rebuttal.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-100 rounded-md px-3 py-2">{error}</p>
        )}

        {/* Download */}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Rebuttal Letter
          </a>
        )}
      </CardContent>
    </Card>
  );
}
