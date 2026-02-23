import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, role, companies(name, phone, email, address, city, state, zip, license_number)")
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
    companies: company as {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      license_number: string | null;
    },
  };

  return (
    <div className="space-y-6">
      <SettingsForm profile={normalised} />
    </div>
  );
}
