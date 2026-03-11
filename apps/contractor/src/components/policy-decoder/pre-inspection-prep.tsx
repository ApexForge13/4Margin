"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScriptSection {
  title: string;
  bullets: string[];
}

interface PreInspectionPrepProps {
  decodingId: string;
}

export function PreInspectionPrep({ decodingId }: PreInspectionPrepProps) {
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<ScriptSection[] | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleSection = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/policy-decoder/${decodingId}/pre-inspection`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      setSections(data.script.contractorSections);
      setPdfUrl(data.pdfUrl);
      // Auto-expand all sections
      setExpanded(
        new Set(
          data.script.contractorSections.map((_: unknown, i: number) => i)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-sky-200 bg-sky-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-sky-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Pre-Inspection Prep
          <Badge variant="default" className="ml-2 text-[10px]">
            PREP
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sections && (
          <>
            <p className="text-sm text-muted-foreground">
              Generate talking points and a homeowner guide based on the decoded
              policy. Helps prepare for the upcoming adjuster inspection.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              variant="default"
              className="w-full"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating pre-inspection script...
                </span>
              ) : (
                "Generate Pre-Inspection Script"
              )}
            </Button>
          </>
        )}

        {/* Contractor Talking Points */}
        {sections && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contractor Talking Points
            </p>
            {sections.map((section, idx) => (
              <div
                key={idx}
                className="rounded-md border bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(idx)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">{section.title}</span>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${expanded.has(idx) ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expanded.has(idx) && (
                  <div className="px-3 pb-3 space-y-1">
                    {section.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex gap-2 text-sm">
                        <span className="text-sky-500 shrink-0 mt-0.5">
                          &#x25B8;
                        </span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PDF Download */}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Homeowner Guide (PDF)
          </a>
        )}

        {/* Regenerate */}
        {sections && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full text-xs"
          >
            {generating ? "Regenerating..." : "Regenerate Script"}
          </Button>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
