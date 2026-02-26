// --- Supplement status types ---

export type SupplementStatus =
  | "draft"
  | "generating"
  | "complete"
  | "approved"
  | "partially_approved"
  | "denied";

// --- Supplement status display labels ---

export const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Awaiting Payment", variant: "secondary" },
  generating: { label: "Generating", variant: "secondary" },
  complete: { label: "Supplement Complete", variant: "default" },

  approved: { label: "Approved", variant: "default" },
  partially_approved: { label: "Partially Approved", variant: "secondary" },
  denied: { label: "Denied", variant: "destructive" },
};

export const SUPPLEMENT_STATUS_ORDER: SupplementStatus[] = [
  "draft",
  "generating",
  "complete",
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
  { key: "payment", label: "Payment", statuses: ["draft"] },
  { key: "generating", label: "Generating", statuses: ["generating"] },
  { key: "complete", label: "Complete", statuses: ["complete"] },
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

// --- Policy Decoder status types ---

export type DecoderStatus = "draft" | "processing" | "complete" | "failed";

export const DECODER_STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Awaiting Upload", variant: "secondary" },
  processing: { label: "Decoding", variant: "secondary" },
  complete: { label: "Complete", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};
