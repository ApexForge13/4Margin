"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/jobs/activity-log";

interface CreateSupplementFromJobInput {
  jobId: string;
  companyId: string;
  estimateStoragePath: string;
  policyStoragePath?: string | null;
}

interface CreateSupplementResult {
  supplementId: string | null;
  error: string | null;
}

export async function createSupplementFromJob(
  input: CreateSupplementFromJobInput
): Promise<CreateSupplementResult> {
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supplementId: null, error: "Session expired." };
  }

  // Verify user belongs to this company
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id || profile.company_id !== input.companyId) {
    return { supplementId: null, error: "Unauthorized." };
  }

  // Verify job exists and belongs to this company
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, company_id")
    .eq("id", input.jobId)
    .eq("company_id", input.companyId)
    .single();

  if (jobError || !job) {
    return { supplementId: null, error: "Job not found." };
  }

  // Create supplement linked to the job
  const supplementInsert: Record<string, unknown> = {
    company_id: input.companyId,
    job_id: input.jobId,
    status: "draft",
    adjuster_estimate_url: input.estimateStoragePath,
    created_by: user.id,
  };

  if (input.policyStoragePath) {
    supplementInsert.policy_pdf_url = input.policyStoragePath;
  }

  const { data: supplement, error: supplementError } = await supabase
    .from("supplements")
    .insert(supplementInsert)
    .select("id")
    .single();

  if (supplementError || !supplement) {
    return {
      supplementId: null,
      error: supplementError?.message || "Failed to create supplement.",
    };
  }

  // Log activity
  await logActivity(supabase, {
    jobId: input.jobId,
    companyId: input.companyId,
    userId: user.id,
    action: "supplement_generated",
    description: "Supplement created from job context",
    metadata: { supplementId: supplement.id },
  });

  // Revalidate caches
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  revalidatePath(`/dashboard/jobs/${input.jobId}`);

  return { supplementId: supplement.id, error: null };
}
