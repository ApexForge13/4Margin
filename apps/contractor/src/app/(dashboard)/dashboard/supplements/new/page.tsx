import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobSupplementForm } from "./job-supplement-form";

export default async function NewSupplementPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;

  // No jobId — redirect to the existing full wizard
  if (!jobId) {
    redirect("/dashboard/upload");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's company_id
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/onboarding");

  const companyId = profile.company_id;

  // Fetch job (multi-tenant: filter by company_id)
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(`
      *,
      carriers ( id, name )
    `)
    .eq("id", jobId)
    .eq("company_id", companyId)
    .single();

  if (jobError || !job) {
    redirect("/dashboard/supplements");
  }

  // Fetch latest inspection for this job
  const { data: latestInspection } = await supabase
    .from("inspections")
    .select("id, status, completed_at, inspection_data")
    .eq("job_id", jobId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest policy decoding for this job
  const { data: latestPolicy } = await supabase
    .from("policy_decodings")
    .select("id, status, policy_analysis, storage_path, original_filename")
    .eq("job_id", jobId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch photo count for this job
  const { count: photoCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("company_id", companyId);

  // Check existing supplements for this job
  const { data: existingSupplements } = await supabase
    .from("supplements")
    .select("id, status, created_at")
    .eq("job_id", jobId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const carrier = job.carriers as { id: string; name: string } | null;

  // Build the pre-filled context summary
  const jobContext = {
    jobId: job.id as string,
    companyId,
    propertyAddress: job.property_address as string | null,
    propertyCity: job.property_city as string | null,
    propertyState: job.property_state as string | null,
    propertyZip: job.property_zip as string | null,
    claimNumber: job.claim_number as string | null,
    policyNumber: job.policy_number as string | null,
    dateOfLoss: job.date_of_loss as string | null,
    carrierName: carrier?.name || null,
    carrierId: carrier?.id || null,
    adjusterName: job.adjuster_name as string | null,
    adjusterEmail: job.adjuster_email as string | null,
    adjusterPhone: job.adjuster_phone as string | null,
    jobName: (job.notes as string) || `Claim #${job.claim_number || ""}`,
    // Measurements available
    hasMeasurements: !!(job.roof_squares || job.roof_pitch),
    roofSquares: job.roof_squares as number | null,
    roofPitch: job.roof_pitch as string | null,
    // Context from related services
    hasInspection: !!latestInspection,
    inspectionStatus: latestInspection?.status as string | null ?? null,
    hasPolicy: !!latestPolicy,
    policyStatus: latestPolicy?.status as string | null ?? null,
    policyStoragePath: latestPolicy?.storage_path as string | null ?? null,
    photoCount: photoCount ?? 0,
    existingSupplementCount: existingSupplements?.length ?? 0,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <JobSupplementForm jobContext={jobContext} />
    </div>
  );
}
