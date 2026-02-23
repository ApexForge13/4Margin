"use client";

const WIZARD_STEPS = [
  { label: "Estimate & Policy", description: "Upload documents & claim info" },
  { label: "Photos & Notes", description: "Inspection photos with annotations" },
  { label: "Measurements", description: "Roof specs & measurement data" },
  { label: "Review & Generate", description: "Confirm & create supplement" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Wizard progress" className="w-full">
      <ol className="flex items-center">
        {WIZARD_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === WIZARD_STEPS.length - 1;

          return (
            <li
              key={step.label}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              {/* Step circle + text */}
              <div className="flex flex-col items-center text-center min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "border-2 border-gray-300 text-gray-400"
                  }`}
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
                    stepNumber
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-medium hidden sm:block ${
                    isCurrent
                      ? "text-primary font-semibold"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground hidden md:block max-w-[120px]">
                  {step.description}
                </p>
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
