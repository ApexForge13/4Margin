import { z } from "zod";

// ── Reusable field helpers ──────────────────────────────────

/** Non-empty trimmed string */
const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

/** Optional string that normalises "" to undefined */
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** Positive numeric string (measurements) — allows empty */
const numericString = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0),
    "Must be a valid number"
  )
  .optional();

/** Email that allows empty string */
const optionalEmail = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "Invalid email address"
  )
  .optional();

/** URL that allows empty string */
const optionalUrl = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || z.string().url().safeParse(v).success,
    "Invalid URL"
  )
  .optional();

/** UUID string */
const uuid = z.string().uuid("Invalid ID format");

// ── Auth schemas ────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  fullName: requiredString("Full name").max(255),
});

// ── Onboarding ──────────────────────────────────────────────

export const onboardingSchema = z.object({
  companyName: requiredString("Company name").max(255),
  phone: optionalString,
  address: optionalString,
  city: optionalString,
  state: z
    .string()
    .trim()
    .max(2, "State must be 2 characters")
    .transform((v) => (v === "" ? undefined : v.toUpperCase()))
    .optional(),
  zip: z
    .string()
    .trim()
    .max(10, "ZIP too long")
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  licenseNumber: optionalString,
});

// ── Company / Settings ──────────────────────────────────────

export const updateCompanySchema = z.object({
  name: requiredString("Company name").max(255),
  phone: optionalString,
  email: optionalEmail,
  address: optionalString,
  city: optionalString,
  state: z
    .string()
    .trim()
    .max(2)
    .transform((v) => (v === "" ? undefined : v.toUpperCase()))
    .optional(),
  zip: z
    .string()
    .trim()
    .max(10)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  licenseNumber: optionalString,
});

export const updateProfileSchema = z.object({
  fullName: requiredString("Full name").max(255),
});

// ── Admin — Carriers ────────────────────────────────────────

export const carrierSchema = z.object({
  name: requiredString("Carrier name").max(255),
  claimsEmail: optionalEmail,
  claimsPhone: optionalString,
  claimsPortalUrl: optionalUrl,
  notes: optionalString,
});

// ── Admin — Xactimate Codes ────────────────────────────────

export const xactimateCodeSchema = z.object({
  code: requiredString("Xactimate code").max(50),
  category: requiredString("Category").max(100),
  description: requiredString("Description").max(500),
  unit: requiredString("Unit").max(50),
  defaultJustification: optionalString,
  ircReference: optionalString,
  commonlyMissed: z.boolean(),
  notes: optionalString,
});

// ── Wizard — Claim Details (Step 1) ─────────────────────────

export const claimDetailsSchema = z.object({
  claimNumber: requiredString("Claim number").max(100),
  claimDescription: requiredString("Claim description").max(5000),
  policyNumber: optionalString,
  carrierName: optionalString,
  propertyAddress: requiredString("Property address").max(255),
  propertyCity: optionalString,
  propertyState: z
    .string()
    .trim()
    .max(2)
    .transform((v) => (v === "" ? undefined : v.toUpperCase()))
    .optional(),
  propertyZip: z
    .string()
    .trim()
    .max(10)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  dateOfLoss: optionalString,
  adjusterName: optionalString,
  adjusterEmail: optionalEmail,
  adjusterPhone: optionalString,
  // Claim overview — narrative context
  adjusterScopeNotes: optionalString,
  itemsBelievedMissing: optionalString,
  priorSupplementHistory: optionalString,
});

// ── Wizard — Measurements (Step 3) ──────────────────────────

const pitchBreakdownSchema = z.object({
  pitch: z.string(),
  areaSqFt: z.string(),
  percentOfRoof: z.string(),
});

export const measurementDataSchema = z.object({
  measuredSquares: numericString,
  wastePercent: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        (!isNaN(parseFloat(v)) &&
          parseFloat(v) >= 0 &&
          parseFloat(v) <= 100),
      "Must be 0-100"
    )
    .optional(),
  suggestedSquares: numericString,
  steepSquares: numericString,
  highStorySquares: numericString,
  totalRoofArea: numericString,
  totalRoofAreaLessPenetrations: numericString,
  ftRidges: numericString,
  ftHips: numericString,
  ftValleys: numericString,
  ftRakes: numericString,
  ftEaves: numericString,
  ftDripEdge: numericString,
  ftParapet: numericString,
  ftFlashing: numericString,
  ftStepFlashing: numericString,
  numRidges: numericString,
  numHips: numericString,
  numValleys: numericString,
  numRakes: numericString,
  numEaves: numericString,
  numFlashingLengths: numericString,
  numStepFlashingLengths: numericString,
  totalPenetrationsArea: numericString,
  totalPenetrationsPerimeter: numericString,
  predominantPitch: optionalString,
  pitchBreakdown: z.array(pitchBreakdownSchema).default([]),
  structureComplexity: optionalString,
  accessories: optionalString,
  damageTypes: z.array(z.string()).default([]),
  confirmed: z.boolean(),
});

// ── Wizard — Full submission (Step 4 → server action) ───────

export const photoMetaSchema = z.object({
  fileName: z.string().max(255),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  note: z.string().optional().default(""),
  storagePath: z.string().min(1),
});

export const createClaimInputSchema = z.object({
  claimName: requiredString("Claim name").max(255),
  claimDetails: claimDetailsSchema,
  measurementData: measurementDataSchema,
  photoMeta: z.array(photoMetaSchema),
  estimateStoragePath: z.string().min(1, "Estimate file is required"),
  policyPdfUrl: z.string().nullable().optional(),
});

// ── Dashboard — Claim update ────────────────────────────────

export const updateClaimSchema = z.object({
  notes: optionalString,
  claimNumber: optionalString,
  policyNumber: optionalString,
  propertyAddress: optionalString,
  propertyCity: optionalString,
  propertyState: optionalString,
  propertyZip: optionalString,
  dateOfLoss: optionalString,
  adjusterName: optionalString,
  adjusterEmail: optionalEmail,
  adjusterPhone: optionalString,
  carrierName: optionalString,
  // Claim overview
  description: optionalString,
  adjusterScopeNotes: optionalString,
  itemsBelievedMissing: optionalString,
  priorSupplementHistory: optionalString,
});

// ── Dashboard — Supplement result ────────────────────────────

export const resultSupplementSchema = z.object({
  supplementId: uuid,
  outcome: z.enum(["approved", "partially_approved", "denied"]),
  approvedAmount: z.number().positive().optional(),
  denialReason: optionalString,
});

// ── API — Stripe checkout ───────────────────────────────────

export const stripeCheckoutSchema = z.object({
  supplementId: uuid,
});

export const policyDecoderCheckoutSchema = z.object({
  policyDecodingId: uuid,
});

export const createPolicyDecodingSchema = z.object({
  storagePath: requiredString("Storage path"),
  originalFilename: requiredString("Filename"),
  notes: optionalString,
});

// ── Shared UUID param ───────────────────────────────────────

export const uuidParamSchema = z.object({
  id: uuid,
});

// ── Admin — User management ─────────────────────────────────

export const adminUpdateUserSchema = z.object({
  fullName: requiredString("Full name").max(255),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  role: z.enum(["owner", "admin", "user"]),
});

// ── Admin — Claim management (cross-company) ────────────────

export const adminUpdateClaimSchema = z.object({
  notes: optionalString,
  claimNumber: optionalString,
  policyNumber: optionalString,
  propertyAddress: optionalString,
  propertyCity: optionalString,
  propertyState: optionalString,
  propertyZip: optionalString,
  dateOfLoss: optionalString,
  adjusterName: optionalString,
  adjusterEmail: optionalEmail,
  adjusterPhone: optionalString,
  carrierName: optionalString,
  description: optionalString,
  adjusterScopeNotes: optionalString,
  itemsBelievedMissing: optionalString,
  priorSupplementHistory: optionalString,
});

// ── API — Finalize supplement (generate PDF from selected items) ──

export const finalizeSupplementSchema = z.object({
  selectedItemIds: z
    .array(uuid)
    .min(1, "At least one line item must be selected"),
});

// ── Admin — Team invites ────────────────────────────────────

export const inviteTeamMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  role: z.enum(["user", "admin"]),
});

// ── Helper: safely parse & return typed errors ──────────────

type ValidationSuccess<T> = { success: true; data: T; error?: undefined };
type ValidationFailure = { success: false; data?: undefined; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const messages = result.error.issues.map((i) => i.message).join(", ");
  return { success: false, error: messages };
}
