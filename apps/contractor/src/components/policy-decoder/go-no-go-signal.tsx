"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface GoNoGoSignalProps {
  riskLevel: "low" | "medium" | "high";
  depreciationMethod: string;
  criticalExclusionCount: number;
  favorableProvisionCount: number;
  deductibleAmount?: number | null;
}

type Signal = "go" | "caution" | "no-go";

function computeSignal(props: GoNoGoSignalProps): Signal {
  const { riskLevel, depreciationMethod, criticalExclusionCount } = props;
  const isRCV = (depreciationMethod || "").toUpperCase().includes("RCV");

  if (riskLevel === "low" && isRCV && criticalExclusionCount === 0) {
    return "go";
  }
  if (riskLevel === "high" && criticalExclusionCount > 0) {
    return "no-go";
  }
  return "caution";
}

function buildReasoning(props: GoNoGoSignalProps, signal: Signal): string {
  const { depreciationMethod, criticalExclusionCount, favorableProvisionCount } =
    props;

  if (signal === "go") {
    const parts = [`${depreciationMethod} coverage`, "no critical exclusions"];
    if (favorableProvisionCount > 0) {
      parts.push(
        `${favorableProvisionCount} favorable provision${favorableProvisionCount > 1 ? "s" : ""}`
      );
    }
    return parts.join(", ");
  }

  if (signal === "no-go") {
    return `High risk with ${criticalExclusionCount} critical exclusion${criticalExclusionCount > 1 ? "s" : ""} — review carefully before proceeding`;
  }

  // caution
  const parts: string[] = [];
  if ((depreciationMethod || "").toUpperCase().includes("ACV")) {
    parts.push("ACV depreciation limits recovery");
  }
  if (criticalExclusionCount > 0) {
    parts.push(
      `${criticalExclusionCount} critical exclusion${criticalExclusionCount > 1 ? "s" : ""}`
    );
  }
  if (favorableProvisionCount > 0) {
    parts.push(
      `${favorableProvisionCount} favorable provision${favorableProvisionCount > 1 ? "s" : ""}`
    );
  }
  if (parts.length === 0) parts.push("Mixed signals — review details below");
  return parts.join(", ");
}

const CONFIG: Record<
  Signal,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    Icon: typeof CheckCircle2;
  }
> = {
  go: {
    label: "GO",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    Icon: CheckCircle2,
  },
  caution: {
    label: "CAUTION",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    Icon: AlertTriangle,
  },
  "no-go": {
    label: "NO-GO",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    Icon: XCircle,
  },
};

export function GoNoGoSignal(props: GoNoGoSignalProps) {
  const signal = computeSignal(props);
  const reasoning = buildReasoning(props, signal);
  const { label, bg, text, border, Icon } = CONFIG[signal];

  return (
    <div
      className={`rounded-xl border-2 ${border} ${bg} p-5 flex items-center gap-4`}
    >
      <div className={`shrink-0 ${text}`}>
        <Icon className="h-10 w-10" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-extrabold tracking-tight ${text}`}>
          {label}
        </p>
        <p className={`text-sm ${text} opacity-80 mt-0.5`}>{reasoning}</p>
      </div>
    </div>
  );
}
