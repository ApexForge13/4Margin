import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/jobs/activity-log';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Only allow updating specific fields
  const allowedFields = [
    'property_address', 'property_city', 'property_state', 'property_zip',
    'homeowner_name', 'homeowner_phone', 'homeowner_email',
    'job_type', 'job_status', 'source',
    'insurance_data', 'financials', 'job_metadata',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Fetch current job to detect status change and get company_id
  const { data: currentJob } = await supabase
    .from('jobs')
    .select('job_status, company_id')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity if status changed
  if (
    updates.job_status &&
    currentJob &&
    updates.job_status !== currentJob.job_status
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    await logActivity(supabase, {
      jobId: id,
      companyId: currentJob.company_id,
      userId: user?.id,
      action: 'status_changed',
      description: `Status changed from ${currentJob.job_status} to ${updates.job_status}`,
      metadata: { from: currentJob.job_status, to: updates.job_status },
    });
  }

  return NextResponse.json(data);
}
