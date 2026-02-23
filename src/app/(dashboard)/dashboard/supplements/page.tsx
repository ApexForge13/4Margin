import { createClient } from "@/lib/supabase/server";
import { SupplementsTable } from "./supplements-table";

export default async function SupplementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch supplements with full claim data
  const { data: supplements } = await supabase
    .from("supplements")
    .select(`
      id,
      status,
      adjuster_total,
      supplement_total,
      created_at,
      claims (
        id,
        notes,
        claim_number,
        policy_number,
        property_address,
        property_city,
        property_state,
        property_zip,
        date_of_loss,
        adjuster_name,
        adjuster_email,
        adjuster_phone,
        archived_at,
        carrier_id,
        carriers ( name )
      )
    `)
    .order("created_at", { ascending: false });

  const rows = (supplements ?? []) as unknown as Array<{
    id: string;
    status: string;
    adjuster_total: number | null;
    supplement_total: number | null;
    created_at: string;
    claims: {
      id: string;
      notes: string | null;
      claim_number: string | null;
      policy_number: string | null;
      property_address: string | null;
      property_city: string | null;
      property_state: string | null;
      property_zip: string | null;
      date_of_loss: string | null;
      adjuster_name: string | null;
      adjuster_email: string | null;
      adjuster_phone: string | null;
      archived_at: string | null;
      carriers: { name: string } | null;
    };
  }>;

  return (
    <div className="space-y-6">
      <SupplementsTable supplements={rows} />
    </div>
  );
}
