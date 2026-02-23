"use client";

import { STATUS_STEPS, RESULT_STATUSES } from "@/lib/constants";
import type { SupplementStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface StatusTrackerProps {
  status: SupplementStatus;
  approvedAmount?: number | null;
  supplementTotal?: number | null;
}

export function StatusTracker({
  status,
  approvedAmount,
}: StatusTrackerProps) {
  const currentStepIndex = STATUS_STEPS.findIndex((step) =>
    step.statuses.includes(status)
  );
  const isResult = RESULT_STATUSES.includes(status);

  return (
    <nav aria-label="Supplement status" className="w-full">
      <ol className="flex items-center">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isLast = index === STATUS_STEPS.length - 1;

          // Determine colors for the result step
          let circleClasses: string;
          let labelClasses: string;

          if (isLast && isCurrent && isResult) {
            if (status === "approved") {
              circleClasses = "bg-green-600 text-white";
              labelClasses = "text-green-700 font-semibold";
            } else if (status === "partially_approved") {
              circleClasses = "bg-green-400 text-white";
              labelClasses = "text-green-600 font-semibold";
            } else {
              circleClasses = "bg-red-500 text-white";
              labelClasses = "text-red-600 font-semibold";
            }
          } else if (isCompleted) {
            circleClasses = "bg-primary text-primary-foreground";
            labelClasses = "text-foreground";
          } else if (isCurrent) {
            circleClasses =
              "bg-primary text-primary-foreground ring-4 ring-primary/20";
            labelClasses = "text-primary font-semibold";
          } else {
            circleClasses = "border-2 border-gray-300 text-gray-400";
            labelClasses = "text-muted-foreground";
          }

          // Dynamic label for the result step
          let displayLabel = step.label;
          if (isLast && isCurrent && isResult) {
            if (status === "approved") displayLabel = "Approved";
            else if (status === "partially_approved")
              displayLabel = "Partially Approved";
            else displayLabel = "Denied";
          }

          return (
            <li
              key={step.key}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              <div className="flex flex-col items-center text-center min-w-0">
                {/* Step circle */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${circleClasses}`}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step label */}
                <p
                  className={`mt-2 text-xs font-medium hidden sm:block ${labelClasses}`}
                >
                  {displayLabel}
                </p>

                {/* Partial approval amount badge */}
                {isLast &&
                  isCurrent &&
                  status === "partially_approved" &&
                  approvedAmount != null && (
                    <Badge
                      variant="outline"
                      className="mt-1 bg-green-50 text-green-700 border-green-200 text-xs"
                    >
                      ${approvedAmount.toLocaleString()} approved
                    </Badge>
                  )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition-colors ${
                    isCompleted ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
