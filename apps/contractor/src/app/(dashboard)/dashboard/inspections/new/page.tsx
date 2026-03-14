import { createClient } from '@/lib/supabase/server';
import { InspectionWizard } from '@/components/inspections/inspection-wizard';
import type { Job } from '@/types/job';

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  let job: Job | null = null;

  if (jobId) {
    const supabase = await createClient();
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single();
    job = data as Job | null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <InspectionWizard initialJob={job} />
    </div>
  );
}
