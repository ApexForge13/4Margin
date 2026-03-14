import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPolicyDecodings, getPaidDecodingCount } from "../policy-decoder/actions";
import { NewDecodeButton } from "@/components/policy-decoder/new-decode-button";
import { DecodingsList } from "@/components/policy-decoder/decodings-list";

export default async function PoliciesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ decodings, error }, paidCount] = await Promise.all([
    getPolicyDecodings(),
    getPaidDecodingCount(),
  ]);

  const isFirstDecode = paidCount === 0;

  // Check if enterprise account
  let isEnterprise = false;
  try {
    const admin = createAdminClient();
    const { data: userProfile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (userProfile?.company_id) {
      const { data: company } = await admin
        .from("companies")
        .select("account_type, subscription_status")
        .eq("id", userProfile.company_id)
        .single();
      isEnterprise =
        company?.account_type === "enterprise" &&
        company?.subscription_status === "active";
    }
  } catch (err) {
    console.error("[policies] Enterprise check failed:", err);
  }

  // Enrich decodings with job data for address display
  let enrichedDecodings = decodings;
  const jobIds = decodings
    .map((d) => d.job_id)
    .filter((id): id is string => !!id);

  if (jobIds.length > 0) {
    try {
      const admin = createAdminClient();
      const { data: jobs } = await admin
        .from("jobs")
        .select("id, property_address, homeowner_name")
        .in("id", jobIds);

      if (jobs) {
        const jobMap = new Map(jobs.map((j) => [j.id, j]));
        enrichedDecodings = decodings.map((d) => {
          if (d.job_id && jobMap.has(d.job_id)) {
            const job = jobMap.get(d.job_id)!;
            return {
              ...d,
              _jobAddress: job.property_address,
              _homeownerName: job.homeowner_name,
            };
          }
          return d;
        });
      }
    } catch {
      // Non-critical — continue without job data
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Policy Decoder</h2>
          <p className="text-muted-foreground">
            Decode insurance policies to uncover coverages, deductibles,
            endorsements, and exclusions.
          </p>
        </div>
        <NewDecodeButton isFirstDecode={isFirstDecode} isEnterprise={isEnterprise} />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DecodingsList decodings={enrichedDecodings} />
    </div>
  );
}
