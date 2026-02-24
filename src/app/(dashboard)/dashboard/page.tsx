import { createClient } from "@/lib/supabase/server";
import { SupplementsList } from "@/components/dashboard/supplements-list";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user's company
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, companies(name, phone, address)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // Fetch supplements with full claim data for edit pre-fill
  const { data: supplements } = await supabase
    .from("supplements")
    .select(`
      id,
      status,
      adjuster_total,
      supplement_total,
      approved_amount,
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
    approved_amount: number | null;
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

  const company = profile.companies as unknown as {
    name: string;
    phone: string | null;
    address: string | null;
  } | null;

  const hasCompany = !!(company?.name && (company?.phone || company?.address));
  const hasSupplements = rows.length > 0;
  const showChecklist = !hasCompany || !hasSupplements;

  // Stats (exclude archived)
  const active = rows.filter((s) => !s.claims?.archived_at);
  const total = active.length;
  const pending = active.filter((s) =>
    ["generating", "complete"].includes(s.status)
  ).length;
  const totalRecovered = active.reduce(
    (sum, s) => sum + (Number(s.supplement_total) || 0),
    0
  );
  const avgRecovery = total > 0 ? totalRecovered / total : 0;

  return (
    <div className="space-y-6">
      {/* Onboarding checklist — shown until all steps are done */}
      {showChecklist && (
        <OnboardingChecklist
          hasCompany={hasCompany}
          hasSupplements={hasSupplements}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Supplements" value={String(total)} description="All time" />
        <StatCard title="Pending Review" value={String(pending)} description="Needs action" />
        <StatCard
          title="Total Recovered"
          value={`$${totalRecovered.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          description="All time"
        />
        <StatCard
          title="Avg Recovery"
          value={`$${avgRecovery.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          description="Per supplement"
        />
      </div>

      <SupplementsList supplements={rows} />
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
