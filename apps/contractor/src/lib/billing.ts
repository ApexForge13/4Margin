"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { reportOverageUsage } from "@/lib/stripe/enterprise";
import { sendUsageLimitApproachingEmail } from "@/lib/email/send";

// ── Types ────────────────────────────────────────────────────

type RecordType = "decode" | "supplement" | "policy_check";

interface UsageResult {
  isOverage: boolean;
  error: string | null;
}

interface CompanyBilling {
  account_type: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  monthly_decode_limit: number | null;
  monthly_supplement_limit: number | null;
  billing_cycle_anchor: string | null;
}

// ── shouldBypassPayment ──────────────────────────────────────

export async function shouldBypassPayment(
  companyId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("account_type, subscription_status")
    .eq("id", companyId)
    .single();

  if (!data) return false;

  return (
    data.account_type === "enterprise" &&
    data.subscription_status === "active"
  );
}

// ── recordUsage ──────────────────────────────────────────────

export async function recordUsage(
  companyId: string,
  userId: string,
  officeId: string | null,
  recordType: RecordType,
  referenceId: string
): Promise<UsageResult> {
  const admin = createAdminClient();

  // Fetch company billing config
  const { data: company } = await admin
    .from("companies")
    .select(
      "account_type, subscription_status, stripe_customer_id, monthly_decode_limit, monthly_supplement_limit, billing_cycle_anchor"
    )
    .eq("id", companyId)
    .single();

  if (!company || company.account_type !== "enterprise") {
    return { isOverage: false, error: null };
  }

  // Determine billing period start (based on billing_cycle_anchor)
  const periodStart = getBillingPeriodStart(company.billing_cycle_anchor);

  // Count usage so far this period for this record type
  const { count } = await admin
    .from("usage_records")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("record_type", recordType)
    .gte("billing_period_start", periodStart);

  const currentCount = count ?? 0;
  const limit = getLimitForType(company, recordType);
  const isOverage = limit !== null && currentCount >= limit;

  // Insert usage record
  const { error: insertError } = await admin.from("usage_records").insert({
    company_id: companyId,
    user_id: userId,
    office_id: officeId,
    record_type: recordType,
    reference_id: referenceId,
    billing_period_start: periodStart,
    is_overage: isOverage,
  });

  if (insertError) {
    console.error("[billing] Failed to insert usage record:", insertError);
    return { isOverage: false, error: insertError.message };
  }

  // Send usage approaching limit email at 80% threshold
  if (limit !== null && !isOverage) {
    const usageAfter = currentCount + 1;
    const threshold80 = Math.floor(limit * 0.8);
    if (usageAfter === threshold80) {
      sendUsageLimitApproachingEmail(
        companyId,
        recordType,
        usageAfter,
        limit
      ).catch(() => {});
    }
  }

  // Report overage to Stripe via Billing Meter Events
  if (isOverage && company.stripe_customer_id) {
    const eventName = getMeterEventName(recordType);
    if (eventName) {
      try {
        await reportOverageUsage(company.stripe_customer_id, eventName);
      } catch (err) {
        console.error("[billing] Failed to report overage to Stripe:", err);
        // Non-blocking — usage is recorded, Stripe report can be retried
      }
    }
  }

  return { isOverage, error: null };
}

// ── checkEnterpriseAccess ────────────────────────────────────
// Returns null if access is granted, or an error message if blocked.

export async function checkEnterpriseAccess(
  companyId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("account_type, subscription_status")
    .eq("id", companyId)
    .single();

  if (!data || data.account_type !== "enterprise") {
    return null; // not enterprise — no restrictions from this check
  }

  if (data.subscription_status === "canceled") {
    return "Your enterprise subscription has been canceled. Please contact your account owner.";
  }

  if (data.subscription_status === "past_due") {
    return "Your enterprise subscription payment is past due. Please update your payment method.";
  }

  if (data.subscription_status === "unpaid") {
    return "Your enterprise subscription is unpaid. Please contact your account owner.";
  }

  return null; // active or trialing — access granted
}

// ── Helpers ──────────────────────────────────────────────────

function getBillingPeriodStart(anchorIso: string | null): string {
  const now = new Date();
  const anchorDay = anchorIso ? new Date(anchorIso).getUTCDate() : 1;

  // If today is before the anchor day, period started last month
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed

  if (now.getUTCDate() < anchorDay) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  // Clamp anchor day to max days in that month
  const maxDay = new Date(year, month + 1, 0).getUTCDate();
  const day = Math.min(anchorDay, maxDay);

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getLimitForType(
  company: CompanyBilling,
  recordType: RecordType
): number | null {
  switch (recordType) {
    case "decode":
      return company.monthly_decode_limit;
    case "supplement":
      return company.monthly_supplement_limit;
    case "policy_check":
      return company.monthly_decode_limit; // shares decode limit
    default:
      return null;
  }
}

function getMeterEventName(
  recordType: RecordType
): "decode_overage" | "supplement_overage" | null {
  switch (recordType) {
    case "decode":
    case "policy_check":
      return "decode_overage";
    case "supplement":
      return "supplement_overage";
    default:
      return null;
  }
}
