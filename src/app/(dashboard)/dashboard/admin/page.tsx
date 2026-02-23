import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTabs } from "./admin-tabs";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const admin = createAdminClient();

  // Fetch all data in parallel
  const [codesRes, carriersRes, teamRes] = await Promise.all([
    admin
      .from("xactimate_codes")
      .select("*")
      .order("category")
      .order("code"),
    admin
      .from("carriers")
      .select("*")
      .order("name"),
    supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <AdminTabs
        codes={codesRes.data ?? []}
        carriers={carriersRes.data ?? []}
        team={teamRes.data ?? []}
      />
    </div>
  );
}
