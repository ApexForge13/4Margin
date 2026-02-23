// --- Supplement status types ---

export type SupplementStatus =
  | "generating"
  | "complete"
  | "submitted"
  | "approved"
  | "partially_approved"
  | "denied";

// --- Supplement status display labels ---

export const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  generating: { label: "Generating", variant: "secondary" },
  complete: { label: "Supplement Complete", variant: "default" },
  submitted: { label: "Submitted to Insurance", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  partially_approved: { label: "Partially Approved", variant: "secondary" },
  denied: { label: "Denied", variant: "destructive" },
};

export const SUPPLEMENT_STATUS_ORDER: SupplementStatus[] = [
  "generating",
  "complete",
  "submitted",
  "approved",
  "partially_approved",
  "denied",
];

// --- Progress tracker step definitions ---

export interface StatusStep {
  key: string;
  label: string;
  statuses: SupplementStatus[];
}

export const STATUS_STEPS: StatusStep[] = [
  { key: "generating", label: "Generating", statuses: ["generating"] },
  { key: "complete", label: "Complete", statuses: ["complete"] },
  { key: "submitted", label: "Submitted", statuses: ["submitted"] },
  { key: "result", label: "Result", statuses: ["approved", "partially_approved", "denied"] },
];

export const RESULT_STATUSES: SupplementStatus[] = [
  "approved",
  "partially_approved",
  "denied",
];

// --- Damage type display helpers ---

export const DAMAGE_TYPE_LABELS: Record<string, string> = {
  wind: "Wind",
  hail: "Hail",
  wind_hail: "Wind/Hail",
  fire: "Fire",
  impact: "Impact",
  age_wear: "Age/Wear",
};

export function formatDamageTypes(types: string[]): string {
  return types.map((t) => DAMAGE_TYPE_LABELS[t] || t).join(", ");
}
