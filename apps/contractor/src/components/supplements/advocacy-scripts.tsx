"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdvocacyScriptsProps {
  supplementId: string;
  scenario: "pre_inspection" | "post_denial";
}

interface ScriptSection {
  title: string;
  bullets: string[];
}

export function AdvocacyScripts({ supplementId, scenario }: AdvocacyScriptsProps) {
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
      const res = await fetch(`/api/supplements/${supplementId}/advocacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      setSections(data.script.contractorSections);
      setPdfUrl(data.pdfUrl);
      // Auto-expand all sections
      setExpanded(new Set(data.script.contractorSections.map((_: unknown, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const isPreInspection = scenario === "pre_inspection";

  const config = isPreInspection
    ? {
        title: "Pre-Inspection Prep",
        badge: "PREP",
        badgeVariant: "default" as const,
        borderClass: "border-sky-200 bg-sky-50/30",
        icon: (
          <svg className="h-5 w-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        buttonText: "Generate Pre-Inspection Script",
        buttonVariant: "default" as const,
      }
    : {
        title: "Homeowner Advocacy",
        badge: "POST-DENIAL",
        badgeVariant: "destructive" as const,
        borderClass: "border-amber-200 bg-amber-50/30",
        icon: (
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        ),
        buttonText: "Generate Advocacy Script",
        buttonVariant: "default" as const,
      };

  return (
    <Card className={config.borderClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {config.icon}
          {config.title}
          <Badge variant={config.badgeVariant} className="ml-2 text-[10px]">
            {config.badge}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sections && (
          <>
            <p className="text-sm text-muted-foreground">
              {isPreInspection
                ? "Generate talking points and a homeowner guide for the upcoming adjuster inspection."
                : "Generate talking points and a homeowner rights guide to help navigate the denial."}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              variant={config.buttonVariant}
              className="w-full"
            >
              {generating ? "Generating script..." : config.buttonText}
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
              <div key={idx} className="rounded-md border bg-white overflow-hidden">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expanded.has(idx) && (
                  <div className="px-3 pb-3 space-y-1">
                    {section.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex gap-2 text-sm">
                        <span className="text-sky-500 shrink-0 mt-0.5">&#x25B8;</span>
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
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Homeowner Guide (PDF)
          </a>
        )}

        {/* Regenerate */}
        {sections && (
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating} className="w-full text-xs">
            {generating ? "Regenerating..." : "Regenerate Script"}
          </Button>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-100 rounded-md px-3 py-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
