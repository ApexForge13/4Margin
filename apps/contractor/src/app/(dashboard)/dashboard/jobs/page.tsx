import { createClient } from "@/lib/supabase/server";
import { JobsTable } from "./jobs-table";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, property_address, property_city, property_state, property_zip, homeowner_name, job_type, job_status, source, created_at, updated_at, archived_at"
    )
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const rows = (jobs ?? []) as Array<{
    id: string;
    property_address: string;
    property_city: string | null;
    property_state: string | null;
    property_zip: string | null;
    homeowner_name: string | null;
    job_type: string;
    job_status: string;
    source: string | null;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
  }>;

  return (
    <div className="space-y-6">
      <JobsTable jobs={rows} />
    </div>
  );
}
