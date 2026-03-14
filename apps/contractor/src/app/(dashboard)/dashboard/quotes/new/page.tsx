import { createClient } from '@/lib/supabase/server';
import { QuoteBuilder } from '@/components/quotes/quote-builder';
import type { Job } from '@/types/job';
import type { CompanyPricing } from '@/types/pricing';

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const supabase = await createClient();

  let job: Job | null = null;
  let inspectionSquares: number | null = null;
  let pricing: CompanyPricing | null = null;

  // Resolve authenticated user and company
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      const { data: pricingRow } = await supabase
        .from('company_pricing')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      pricing = pricingRow as CompanyPricing | null;
    }
  }

  if (jobId) {
    const { data: jobRow } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    job = jobRow as Job | null;

    // Pull squares from the most recent completed inspection
    if (job) {
      const { data: inspection } = await supabase
        .from('inspections')
        .select('assessment_data')
        .eq('job_id', jobId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inspection?.assessment_data) {
        inspectionSquares =
          (inspection.assessment_data as Record<string, unknown> & {
            roof_details?: { approximate_squares?: number };
          })?.roof_details?.approximate_squares ?? null;
      }
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <QuoteBuilder
        initialJob={job}
        inspectionSquares={inspectionSquares}
        companyPricing={pricing}
      />
    </div>
  );
}
