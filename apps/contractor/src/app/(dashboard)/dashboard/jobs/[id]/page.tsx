import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobDetailClient } from '@/components/jobs/job-detail-client';
import type { Job } from '@/types/job';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch core job record first
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (jobError || !job) {
    notFound();
  }

  // Fetch all related data in parallel
  const [
    { data: inspections },
    { data: policyDecodings },
    { data: supplements },
    { data: quotes },
    { data: activities },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from('inspections')
      .select('id, status, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('policy_decodings')
      .select('id, created_at, overall_rating')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('supplements')
      .select('id, status, supplement_total, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('quotes')
      .select('id, status, created_at')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),

    supabase
      .from('job_activity_log')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', (job as Job).company_id),
  ]);

  return (
    <JobDetailClient
      job={job as Job}
      inspections={inspections ?? []}
      policyDecodings={policyDecodings ?? []}
      supplements={supplements ?? []}
      quotes={quotes ?? []}
      activities={activities ?? []}
      documents={documents ?? []}
    />
  );
}
