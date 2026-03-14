import { createClient } from "@/lib/supabase/server";
import { InspectionsTable } from "./inspections-table";

export default async function InspectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: inspections } = await supabase
    .from("inspections")
    .select(
      `
      id,
      status,
      created_at,
      updated_at,
      job_id,
      jobs (
        id,
        property_address,
        property_city,
        property_state,
        homeowner_name
      )
    `
    )
    .order("created_at", { ascending: false });

  const rows = (inspections ?? []) as unknown as Array<{
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    job_id: string | null;
    jobs: {
      id: string;
      property_address: string;
      property_city: string | null;
      property_state: string | null;
      homeowner_name: string | null;
    } | null;
  }>;

  return (
    <div className="space-y-6">
      <InspectionsTable inspections={rows} />
    </div>
  );
}
