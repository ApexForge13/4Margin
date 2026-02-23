"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({
  hasCompany,
  hasSupplements,
  hasCarriers,
  hasCodes,
}: {
  hasCompany: boolean;
  hasSupplements: boolean;
  hasCarriers: boolean;
  hasCodes: boolean;
}) {
  const items: ChecklistItem[] = [
    {
      label: "Set up your company",
      description: "Add your business name, address, and license number",
      href: "/dashboard/settings",
      done: hasCompany,
    },
    {
      label: "Add insurance carriers",
      description: "Add the carriers you work with most (State Farm, Allstate, etc.)",
      href: "/dashboard/admin",
      done: hasCarriers,
    },
    {
      label: "Add Xactimate codes",
      description: "Build your code library for common roofing line items",
      href: "/dashboard/admin",
      done: hasCodes,
    },
    {
      label: "Create your first supplement",
      description: "Upload an adjuster estimate and inspection photos to generate a supplement",
      href: "/dashboard/upload",
      done: hasSupplements,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-lg border bg-white">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Welcome to 4Margin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete these steps to get the most out of your supplement engine.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {completedCount}/{items.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="divide-y">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50/50"
          >
            {/* Check circle */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                item.done
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300"
              }`}
            >
              {item.done ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "text-muted-foreground line-through" : ""}`}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>

            {/* Action */}
            {!item.done && (
              <Button asChild size="sm" variant="outline">
                <Link href={item.href}>Start</Link>
              </Button>
            )}
            {item.done && (
              <span className="text-xs font-medium text-primary">Done</span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      {completedCount < items.length && (
        <div className="border-t bg-gray-50/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Complete all steps to unlock the full power of 4Margin
          </p>
        </div>
      )}

      {completedCount === items.length && (
        <div className="border-t bg-green-50 p-4 text-center">
          <p className="text-sm font-medium text-green-700">
            You&apos;re all set! Create supplements from the dashboard anytime.
          </p>
        </div>
      )}
    </div>
  );
}
