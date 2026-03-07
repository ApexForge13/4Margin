import { createAdminClient } from "@/lib/supabase/admin";

interface DomainMatch {
  companyId: string;
  companyName: string;
}

/**
 * Check if an email domain matches an enterprise company's allowed domains.
 * Used during onboarding to auto-join users to their enterprise company.
 */
export async function checkDomainAutoJoin(
  email: string
): Promise<DomainMatch | null> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  const admin = createAdminClient();

  const { data } = await admin
    .from("company_email_domains")
    .select("company_id, companies(name, account_type, subscription_status)")
    .eq("domain", domain)
    .limit(1)
    .single();

  if (!data) return null;

  // Only match active enterprise companies
  const company = data.companies as unknown as {
    name: string;
    account_type: string;
    subscription_status: string | null;
  };

  if (
    company?.account_type !== "enterprise" ||
    company?.subscription_status !== "active"
  ) {
    return null;
  }

  return {
    companyId: data.company_id,
    companyName: company.name,
  };
}
