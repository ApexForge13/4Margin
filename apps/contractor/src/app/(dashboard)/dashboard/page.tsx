import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

  const company = profile.companies as unknown as {
    name: string;
    phone: string | null;
    address: string | null;
  } | null;

  const hasCompany = !!(company?.name && (company?.phone || company?.address));

  // Fetch policy decodings count
  const { count: totalDecodings } = await supabase
    .from("policy_decodings")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id);

  const { count: completedDecodings } = await supabase
    .from("policy_decodings")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("status", "complete");

  const { count: processingDecodings } = await supabase
    .from("policy_decodings")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .in("status", ["pending", "processing"]);

  const total = totalDecodings ?? 0;
  const completed = completedDecodings ?? 0;
  const processing = processingDecodings ?? 0;

  const hasDecodings = total > 0;
  const showChecklist = !hasCompany || !hasDecodings;

  return (
    <div className="space-y-6">
      {/* Onboarding checklist — shown until all steps are done */}
      {showChecklist && (
        <OnboardingChecklist
          hasCompany={hasCompany}
          hasSupplements={hasDecodings}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Decodes" value={String(total)} description="All time" />
        <StatCard title="Completed" value={String(completed)} description="Ready to review" />
        <StatCard title="Processing" value={String(processing)} description="In progress" />
      </div>

      {/* Quick action */}
      {!hasDecodings ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">Decode your first policy</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Upload a homeowner&apos;s insurance policy and get a full breakdown of
            coverages, deductibles, endorsements, and gaps — in minutes.
          </p>
          <Link
            href="/dashboard/policy-decoder"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Policy Decode
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border bg-card p-6">
          <div>
            <h3 className="font-semibold">Policy Decoder</h3>
            <p className="text-sm text-muted-foreground">
              View all your decoded policies or start a new decode.
            </p>
          </div>
          <Link
            href="/dashboard/policy-decoder"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            View Decodings
          </Link>
        </div>
      )}
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
