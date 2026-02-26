import { describe, it, expect } from "vitest";
import {
  validate,
  loginSchema,
  signupSchema,
  onboardingSchema,
  claimDetailsSchema,
  measurementDataSchema,
  stripeCheckoutSchema,
  resultSupplementSchema,
} from "./schemas";

describe("loginSchema", () => {
  it("accepts valid email", () => {
    const r = validate(loginSchema, { email: "test@example.com" });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("test@example.com");
  });

  it("lowercases email", () => {
    const r = validate(loginSchema, { email: "Test@Example.COM" });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("test@example.com");
  });

  it("rejects invalid email", () => {
    const r = validate(loginSchema, { email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects empty email", () => {
    const r = validate(loginSchema, { email: "" });
    expect(r.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid data", () => {
    const r = validate(signupSchema, {
      email: "user@test.com",
      fullName: "John Doe",
    });
    expect(r.success).toBe(true);
  });

  it("rejects missing fullName", () => {
    const r = validate(signupSchema, { email: "user@test.com", fullName: "" });
    expect(r.success).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("accepts valid onboarding data", () => {
    const r = validate(onboardingSchema, {
      companyName: "Acme Roofing",
      phone: "555-1234",
      state: "tx",
    });
    expect(r.success).toBe(true);
    expect(r.data?.state).toBe("TX"); // uppercased
  });

  it("rejects missing company name", () => {
    const r = validate(onboardingSchema, { companyName: "" });
    expect(r.success).toBe(false);
  });
});

describe("claimDetailsSchema", () => {
  const validClaim = {
    claimNumber: "CLM-2024-001",
    claimDescription: "Wind/hail damage to asphalt shingle roof",
    propertyAddress: "123 Main St",
  };

  it("accepts valid claim details", () => {
    const r = validate(claimDetailsSchema, validClaim);
    expect(r.success).toBe(true);
  });

  it("rejects missing claim number", () => {
    const r = validate(claimDetailsSchema, {
      ...validClaim,
      claimNumber: "",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing description", () => {
    const r = validate(claimDetailsSchema, {
      ...validClaim,
      claimDescription: "",
    });
    expect(r.success).toBe(false);
  });

  it("accepts optional fields as empty strings", () => {
    const r = validate(claimDetailsSchema, {
      ...validClaim,
      adjusterName: "",
      adjusterEmail: "",
      policyNumber: "",
    });
    expect(r.success).toBe(true);
    expect(r.data?.adjusterName).toBeUndefined();
  });

  it("validates adjuster email format", () => {
    const r = validate(claimDetailsSchema, {
      ...validClaim,
      adjusterEmail: "not-email",
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid adjuster email", () => {
    const r = validate(claimDetailsSchema, {
      ...validClaim,
      adjusterEmail: "adj@carrier.com",
    });
    expect(r.success).toBe(true);
  });
});

describe("measurementDataSchema", () => {
  it("accepts valid measurements", () => {
    const r = validate(measurementDataSchema, {
      measuredSquares: "32.5",
      wastePercent: "15",
      suggestedSquares: "37.4",
      predominantPitch: "6/12",
      ftRidges: "45",
      ftHips: "30",
      ftValleys: "20",
      ftRakes: "100",
      ftEaves: "120",
      damageTypes: ["wind_hail"],
      confirmed: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid waste percent over 100", () => {
    const r = validate(measurementDataSchema, {
      wastePercent: "150",
      damageTypes: [],
      confirmed: false,
    });
    expect(r.success).toBe(false);
  });

  it("allows empty numeric fields", () => {
    const r = validate(measurementDataSchema, {
      measuredSquares: "",
      damageTypes: [],
      confirmed: false,
    });
    expect(r.success).toBe(true);
  });

  it("rejects negative numbers", () => {
    const r = validate(measurementDataSchema, {
      measuredSquares: "-5",
      damageTypes: [],
      confirmed: false,
    });
    expect(r.success).toBe(false);
  });
});

describe("stripeCheckoutSchema", () => {
  it("accepts valid UUID", () => {
    const r = validate(stripeCheckoutSchema, {
      supplementId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const r = validate(stripeCheckoutSchema, { supplementId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });
});

describe("resultSupplementSchema", () => {
  it("accepts approved outcome", () => {
    const r = validate(resultSupplementSchema, {
      supplementId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      outcome: "approved",
    });
    expect(r.success).toBe(true);
  });

  it("accepts partially_approved with amount", () => {
    const r = validate(resultSupplementSchema, {
      supplementId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      outcome: "partially_approved",
      approvedAmount: 3500,
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid outcome", () => {
    const r = validate(resultSupplementSchema, {
      supplementId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      outcome: "invalid_status",
    });
    expect(r.success).toBe(false);
  });
});
