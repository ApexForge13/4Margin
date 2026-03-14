import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import { PricingSettings } from "@/components/settings/pricing-settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, role, company_id, companies(name, phone, email, address, city, state, zip, license_number, account_type, logo_url)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // Supabase returns joined relations as arrays; unwrap the single company
  const companiesRaw = profile.companies as unknown;
  const company = Array.isArray(companiesRaw) ? companiesRaw[0] : companiesRaw;

  const normalised = {
    id: profile.id as string,
    full_name: profile.full_name as string,
    email: profile.email as string,
    role: profile.role as string,
    company_id: profile.company_id as string,
    companies: company as {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      license_number: string | null;
      account_type: string | null;
      logo_url: string | null;
    },
  };

  return (
    <div className="space-y-6">
      <SettingsForm profile={normalised} />
      <PricingSettings companyId={normalised.company_id} />
    </div>
  );
}
