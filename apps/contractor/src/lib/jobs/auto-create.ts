import { SupabaseClient } from '@supabase/supabase-js';
import { findMatchingJob, normalizeAddress } from './matching';
import type { JobType, LeadSource, InsuranceData, JobMetadata } from '@/types/job';

interface AutoCreateInput {
  companyId: string;
  createdBy: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  homeownerName?: string;
  homeownerPhone?: string;
  homeownerEmail?: string;
  jobType?: JobType;
  source?: LeadSource;
  insuranceData?: InsuranceData;
  metadata?: JobMetadata;
}

interface AutoCreateResult {
  jobId: string;
  created: boolean; // true if new, false if matched existing
}

/**
 * Find-or-create a Job. Used by all tool entry points
 * (supplement wizard, decoder, photo upload, email parsing).
 */
export async function findOrCreateJob(
  supabase: SupabaseClient,
  input: AutoCreateInput
): Promise<AutoCreateResult> {
  // Try to match existing
  const match = await findMatchingJob(supabase, {
    companyId: input.companyId,
    propertyAddress: input.propertyAddress,
    propertyCity: input.propertyCity,
    propertyState: input.propertyState,
    propertyZip: input.propertyZip,
    claimNumber: input.insuranceData?.claim_number,
    homeownerName: input.homeownerName,
  });

  if (match.matched && match.jobId) {
    // Update existing job with any new data
    const updates: Record<string, unknown> = {};
    if (input.homeownerName && input.homeownerName.trim()) {
      updates.homeowner_name = input.homeownerName;
    }
    if (input.homeownerPhone) updates.homeowner_phone = input.homeownerPhone;
    if (input.homeownerEmail) updates.homeowner_email = input.homeownerEmail;
    if (input.insuranceData) {
      // Merge insurance data, don't overwrite
      updates.insurance_data = input.insuranceData;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('jobs')
        .update(updates)
        .eq('id', match.jobId);
    }

    return { jobId: match.jobId, created: false };
  }

  // Create new job
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      company_id: input.companyId,
      created_by: input.createdBy,
      job_type: input.jobType || 'insurance',
      job_status: 'lead',
      source: input.source || null,
      property_address: normalizeAddress(input.propertyAddress),
      property_city: input.propertyCity || null,
      property_state: input.propertyState || null,
      property_zip: input.propertyZip || null,
      homeowner_name: input.homeownerName || null,
      homeowner_phone: input.homeownerPhone || null,
      homeowner_email: input.homeownerEmail || null,
      insurance_data: input.insuranceData || {},
      financials: {},
      job_metadata: input.metadata || {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create job: ${error?.message}`);
  }

  return { jobId: data.id, created: true };
}
