import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EnterpriseAdmin } from "./enterprise-admin";

export default async function EnterprisePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, role, companies(account_type, name, monthly_decode_limit, monthly_supplement_limit)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const company = profile.companies as unknown as {
    account_type: string;
    name: string;
    monthly_decode_limit: number | null;
    monthly_supplement_limit: number | null;
  } | null;

  if (profile.role !== "owner" || company?.account_type !== "enterprise") {
    redirect("/dashboard");
  }

  // Fetch all data for tabs
  const companyId = profile.company_id as string;

  const [usersRes, officesRes, domainsRes, usageRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, role, office_id")
      .eq("company_id", companyId)
      .order("full_name"),
    supabase
      .from("offices")
      .select("id, name, city, state, created_at")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("company_email_domains")
      .select("id, domain, created_at")
      .eq("company_id", companyId)
      .order("domain"),
    supabase
      .from("usage_records")
      .select("id, user_id, office_id, record_type, billing_period_start, is_overage, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <EnterpriseAdmin
      companyName={company?.name || ""}
      limits={{
        monthly_decode_limit: company?.monthly_decode_limit ?? null,
        monthly_supplement_limit: company?.monthly_supplement_limit ?? null,
      }}
      users={usersRes.data || []}
      offices={officesRes.data || []}
      domains={domainsRes.data || []}
      usageRecords={usageRes.data || []}
    />
  );
}
