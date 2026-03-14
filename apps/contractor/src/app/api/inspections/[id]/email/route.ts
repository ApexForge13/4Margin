import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .select('id, job_id, status')
      .eq('id', id)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Fetch homeowner contact info and property address from job
    let homeownerEmail: string | null = null;
    let address = '';

    if (inspection.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('homeowner_email, property_address, property_city, property_state')
        .eq('id', inspection.job_id)
        .single();

      if (job) {
        homeownerEmail = job.homeowner_email ?? null;
        address = [job.property_address, job.property_city, job.property_state]
          .filter(Boolean)
          .join(', ');
      }
    }

    if (!homeownerEmail) {
      return NextResponse.json(
        { error: 'No homeowner email on record for this job' },
        { status: 400 }
      );
    }

    // TODO: Wire up Resend email
    return NextResponse.json({
      message: 'Email sending placeholder',
      to: homeownerEmail,
      subject: `Roof Inspection Report - ${address}`,
    });
  } catch (err) {
    console.error('[email POST]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
