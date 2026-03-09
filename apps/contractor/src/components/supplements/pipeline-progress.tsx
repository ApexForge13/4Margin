"use client";

import { useEffect, useState } from "react";
import { PIPELINE_STAGES } from "@/lib/constants";

interface PipelineProgressProps {
  currentStage: string | null;
  startedAt: string | null;
}

export function PipelineProgress({ currentStage, startedAt }: PipelineProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  // Tick the elapsed timer every second
  useEffect(() => {
    if (!startedAt) return;

    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const progressPercent =
    currentIndex >= 0 ? (currentIndex / (PIPELINE_STAGES.length - 1)) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg">Analyzing Your Supplement</h3>
        <span className="text-sm text-muted-foreground tabular-nums">
          {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
        </span>
      </div>

      {/* ── Desktop: horizontal stepper (hidden on small screens) ── */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Background track */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" />
          {/* Filled track */}
          <div
            className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
            style={{
              width: `calc(${progressPercent}% - ${progressPercent < 100 ? "32px" : "0px"})`,
            }}
          />

          {/* Steps */}
          <div className="relative flex justify-between">
            {PIPELINE_STAGES.map((stage, i) => {
              const isComplete = currentIndex > i;
              const isCurrent = currentIndex === i;

              return (
                <div
                  key={stage.key}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / PIPELINE_STAGES.length}%` }}
                >
                  {/* Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isComplete
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                          ? "bg-primary border-primary text-white animate-pulse"
                          : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {isComplete ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`mt-2 text-[11px] text-center leading-tight ${
                      isCurrent
                        ? "font-semibold text-foreground"
                        : isComplete
                          ? "text-green-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile: vertical stepper (shown only on small screens) ── */}
      <div className="sm:hidden space-y-3">
        {PIPELINE_STAGES.map((stage, i) => {
          const isComplete = currentIndex > i;
          const isCurrent = currentIndex === i;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              {/* Circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all ${
                  isComplete
                    ? "bg-green-500 border-green-500 text-white"
                    : isCurrent
                      ? "bg-primary border-primary text-white animate-pulse"
                      : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isComplete ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {/* Label */}
              <span
                className={`text-sm ${
                  isCurrent
                    ? "font-semibold text-foreground"
                    : isComplete
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current stage description with spinner */}
      {currentStage && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {PIPELINE_STAGES.find((s) => s.key === currentStage)?.label || "Processing..."}
        </div>
      )}
    </div>
  );
}
