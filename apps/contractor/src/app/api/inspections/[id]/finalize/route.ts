import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/jobs/activity-log';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch inspection (RLS ensures company ownership)
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id, company_id, job_id, status')
      .eq('id', id)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    if (inspection.status !== 'complete') {
      return NextResponse.json(
        { error: 'Inspection must be in complete status before finalizing' },
        { status: 400 }
      );
    }

    const inspectedAt = new Date().toISOString();

    // Mark inspection as finalized with timestamp
    const { error: updateError } = await supabase
      .from('inspections')
      .update({ inspected_at: inspectedAt })
      .eq('id', id);

    if (updateError) {
      console.error('[finalize] Failed to update inspection:', updateError);
      return NextResponse.json(
        { error: 'Failed to finalize inspection' },
        { status: 500 }
      );
    }

    // Auto-advance job status if the job is still in an early stage
    if (inspection.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, job_status')
        .eq('id', inspection.job_id)
        .single();

      if (job && (job.job_status === 'lead' || job.job_status === 'qualified')) {
        const { error: jobUpdateError } = await supabase
          .from('jobs')
          .update({ job_status: 'inspected' })
          .eq('id', inspection.job_id);

        if (jobUpdateError) {
          // Non-blocking — log but don't fail the finalize
          console.error('[finalize] Failed to advance job status:', jobUpdateError);
        } else {
          await logActivity(supabase, {
            jobId: inspection.job_id,
            companyId: inspection.company_id,
            userId: user.id,
            action: 'status_changed',
            description: 'Status auto-advanced to Inspected',
            metadata: { from: job.job_status, to: 'inspected', trigger: 'inspection_completed' },
          });
        }
      }

      // Log activity on the job
      await logActivity(supabase, {
        jobId: inspection.job_id,
        companyId: inspection.company_id,
        userId: user.id,
        action: 'inspection_completed',
        description: 'Inspection completed',
        metadata: { inspection_id: id },
      });
    }

    return NextResponse.json({ finalized: true });
  } catch (err) {
    console.error('[finalize POST]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
