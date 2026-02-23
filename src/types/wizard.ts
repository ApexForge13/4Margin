import type { UploadedFile } from "@/components/upload/file-list";

// --- Parsing status for auto-fill from PDFs ---
export type ParsingStatus = "idle" | "parsing" | "done" | "error";

// --- Photo with optional annotation ---
export interface PhotoFile {
  file: File;
  note: string;
  previewUrl: string; // URL.createObjectURL
}

// --- Claim details (Step 1) ---
export interface ClaimDetails {
  claimNumber: string;
  claimDescription: string;
  policyNumber: string;
  carrierName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  dateOfLoss: string;
  adjusterName: string;
  adjusterEmail: string;
  adjusterPhone: string;
}

// --- Measurement data (Step 3) — EagleView format ---
export interface MeasurementData {
  // Area
  measuredSquares: string;
  wastePercent: string;
  suggestedSquares: string;

  // Linear feet measurements
  ftRidges: string;
  ftHips: string;
  ftValleys: string;
  ftRakes: string;
  ftEaves: string;
  ftDripEdge: string;
  ftParapet: string;
  ftFlashing: string;
  ftStepFlashing: string;

  // Roof details
  predominantPitch: string;
  accessories: string;

  // Damage — multi-select
  damageTypes: string[];

  confirmed: boolean;
}

// --- Full wizard state ---
export interface WizardState {
  currentStep: number;

  // Step 1
  estimateFiles: UploadedFile[];
  policyFiles: UploadedFile[];
  claimDetails: ClaimDetails;
  estimateParsingStatus: ParsingStatus;

  // Step 2
  photos: PhotoFile[];

  // Step 3
  measurementFiles: UploadedFile[];
  measurementData: MeasurementData;
  measurementParsingStatus: ParsingStatus;

  // Step 4
  claimName: string;

  // Submission
  isSubmitting: boolean;
  uploadProgress: { current: number; total: number };
}

// --- Actions ---
export type WizardAction =
  | { type: "SET_STEP"; step: number }
  // Step 1 — files
  | { type: "ADD_ESTIMATE_FILES"; files: UploadedFile[] }
  | { type: "REMOVE_ESTIMATE_FILE"; index: number }
  | { type: "ADD_POLICY_FILES"; files: UploadedFile[] }
  | { type: "REMOVE_POLICY_FILE"; index: number }
  // Step 1 — claim details
  | { type: "UPDATE_CLAIM_DETAILS"; details: Partial<ClaimDetails> }
  | { type: "SET_ESTIMATE_PARSING"; status: ParsingStatus }
  // Step 2 — photos
  | { type: "ADD_PHOTOS"; photos: PhotoFile[] }
  | { type: "REMOVE_PHOTO"; index: number }
  | { type: "UPDATE_PHOTO_NOTE"; index: number; note: string }
  // Step 3 — measurements
  | { type: "ADD_MEASUREMENT_FILES"; files: UploadedFile[] }
  | { type: "REMOVE_MEASUREMENT_FILE"; index: number }
  | { type: "UPDATE_MEASUREMENT_DATA"; data: Partial<MeasurementData> }
  | { type: "TOGGLE_DAMAGE_TYPE"; damageType: string }
  | { type: "CONFIRM_MEASUREMENTS" }
  | { type: "UNCONFIRM_MEASUREMENTS" }
  | { type: "SET_MEASUREMENT_PARSING"; status: ParsingStatus }
  // Step 4
  | { type: "SET_CLAIM_NAME"; name: string }
  // Submission
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "SET_UPLOAD_PROGRESS"; current: number; total: number }
  | { type: "RESET" };
