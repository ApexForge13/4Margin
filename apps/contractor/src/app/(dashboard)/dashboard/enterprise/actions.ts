"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Guards ───────────────────────────────────────────────────

async function requireEnterpriseOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role, companies(account_type)")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("No profile");

  const company = profile.companies as unknown as { account_type: string } | null;
  if (profile.role !== "owner" || company?.account_type !== "enterprise") {
    throw new Error("Enterprise owner access required");
  }

  return { userId: profile.id, companyId: profile.company_id as string };
}

// ── Offices ──────────────────────────────────────────────────

export async function createOffice(formData: FormData) {
  const { companyId } = await requireEnterpriseOwner();
  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;

  if (!name?.trim()) return { error: "Office name is required" };

  const admin = createAdminClient();
  const { error } = await admin.from("offices").insert({
    company_id: companyId,
    name: name.trim(),
    city: city?.trim() || null,
    state: state?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

export async function updateOffice(
  officeId: string,
  formData: FormData
) {
  await requireEnterpriseOwner();
  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;

  if (!name?.trim()) return { error: "Office name is required" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("offices")
    .update({
      name: name.trim(),
      city: city?.trim() || null,
      state: state?.trim() || null,
    })
    .eq("id", officeId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

export async function deleteOffice(officeId: string) {
  await requireEnterpriseOwner();
  const admin = createAdminClient();
  const { error } = await admin.from("offices").delete().eq("id", officeId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

// ── Users ────────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  newRole: "user" | "office_manager"
) {
  const { companyId } = await requireEnterpriseOwner();
  const admin = createAdminClient();

  // Ensure target user is in same company
  const { data: target } = await admin
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .single();

  if (!target || target.company_id !== companyId) {
    return { error: "User not found in your company" };
  }

  const { error } = await admin
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

export async function assignUserOffice(
  userId: string,
  officeId: string | null
) {
  const { companyId } = await requireEnterpriseOwner();
  const admin = createAdminClient();

  // Ensure target user is in same company
  const { data: target } = await admin
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .single();

  if (!target || target.company_id !== companyId) {
    return { error: "User not found in your company" };
  }

  const { error } = await admin
    .from("users")
    .update({ office_id: officeId })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

// ── Domains ──────────────────────────────────────────────────

export async function addDomain(formData: FormData) {
  const { companyId } = await requireEnterpriseOwner();
  const domain = (formData.get("domain") as string)?.trim().toLowerCase();

  if (!domain) return { error: "Domain is required" };
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return { error: "Invalid domain format" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("company_email_domains").insert({
    company_id: companyId,
    domain,
  });

  if (error) {
    if (error.code === "23505") return { error: "Domain already added" };
    return { error: error.message };
  }
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

export async function removeDomain(domainId: string) {
  await requireEnterpriseOwner();
  const admin = createAdminClient();
  const { error } = await admin
    .from("company_email_domains")
    .delete()
    .eq("id", domainId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/enterprise");
  return { error: null };
}

// ── Usage Data ───────────────────────────────────────────────

export async function getUsageData() {
  const { companyId } = await requireEnterpriseOwner();
  const admin = createAdminClient();

  // Get usage records with user info
  const { data: records } = await admin
    .from("usage_records")
    .select("id, user_id, office_id, record_type, billing_period_start, is_overage, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  // Get users for name mapping
  const { data: users } = await admin
    .from("users")
    .select("id, full_name, office_id, role")
    .eq("company_id", companyId);

  // Get offices
  const { data: offices } = await admin
    .from("offices")
    .select("id, name, city, state")
    .eq("company_id", companyId);

  // Get company limits
  const { data: company } = await admin
    .from("companies")
    .select("monthly_decode_limit, monthly_supplement_limit")
    .eq("id", companyId)
    .single();

  return {
    records: records || [],
    users: users || [],
    offices: offices || [],
    limits: company || { monthly_decode_limit: null, monthly_supplement_limit: null },
  };
}

export async function exportUsageCsv() {
  const { companyId } = await requireEnterpriseOwner();
  const admin = createAdminClient();

  const { data: records } = await admin
    .from("usage_records")
    .select("record_type, billing_period_start, is_overage, created_at, user_id, office_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: users } = await admin
    .from("users")
    .select("id, full_name")
    .eq("company_id", companyId);

  const { data: offices } = await admin
    .from("offices")
    .select("id, name")
    .eq("company_id", companyId);

  const userMap = new Map((users || []).map((u) => [u.id, u.full_name]));
  const officeMap = new Map((offices || []).map((o) => [o.id, o.name]));

  const header = "Date,Type,User,Office,Overage";
  const rows = (records || []).map((r) => {
    const date = new Date(r.created_at).toISOString().split("T")[0];
    const user = userMap.get(r.user_id) || "Unknown";
    const office = r.office_id ? officeMap.get(r.office_id) || "" : "";
    return `${date},${r.record_type},${user},${office},${r.is_overage ? "Yes" : "No"}`;
  });

  return [header, ...rows].join("\n");
}
