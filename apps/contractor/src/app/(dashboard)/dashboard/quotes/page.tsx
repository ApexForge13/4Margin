import { createClient } from "@/lib/supabase/server";
import { QuotesTable } from "./quotes-table";

export default async function QuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      `
      id,
      status,
      homeowner_name,
      total_squares,
      good_tier,
      better_tier,
      best_tier,
      created_at,
      job_id,
      jobs (
        id,
        property_address,
        property_city,
        property_state
      )
    `
    )
    .order("created_at", { ascending: false });

  const rows = (quotes ?? []) as unknown as Array<{
    id: string;
    status: string;
    homeowner_name: string | null;
    total_squares: number | null;
    good_tier: { label: string; total: number } | null;
    better_tier: { label: string; total: number } | null;
    best_tier: { label: string; total: number } | null;
    created_at: string;
    job_id: string | null;
    jobs: {
      id: string;
      property_address: string;
      property_city: string | null;
      property_state: string | null;
    } | null;
  }>;

  return (
    <div className="space-y-6">
      <QuotesTable quotes={rows} />
    </div>
  );
}
