import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EMPTY_ASSESSMENT } from '@/types/inspection';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get company_id from users table
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userRow?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 });
    }

    const company_id: string = userRow.company_id;

    const body = await request.json();
    const {
      job_id,
      property_address,
      job_type,
      homeowner_name,
      homeowner_phone,
      homeowner_email,
    } = body as {
      job_id?: string;
      property_address: string;
      job_type: string;
      homeowner_name?: string;
      homeowner_phone?: string;
      homeowner_email?: string;
    };

    if (!property_address || !job_type) {
      return NextResponse.json(
        { error: 'property_address and job_type are required' },
        { status: 400 }
      );
    }

    let resolvedJobId: string;

    if (job_id) {
      // Verify the provided job exists and belongs to this company
      const { data: existingJob, error: jobError } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', job_id)
        .eq('company_id', company_id)
        .single();

      if (jobError || !existingJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      resolvedJobId = existingJob.id;
    } else {
      // findOrCreateJob: look for an existing job by address + company
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', company_id)
        .ilike('property_address', property_address.trim())
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        resolvedJobId = existingJob.id;
      } else {
        // Create a new job
        const { data: newJob, error: createError } = await supabase
          .from('jobs')
          .insert({
            company_id,
            property_address: property_address.trim(),
            job_type,
            homeowner_name: homeowner_name ?? null,
            homeowner_phone: homeowner_phone ?? null,
            homeowner_email: homeowner_email ?? null,
            job_status: 'lead',
          })
          .select('id')
          .single();

        if (createError || !newJob) {
          console.error('[inspections POST] Failed to create job:', createError);
          return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
        }

        resolvedJobId = newJob.id;
      }
    }

    // Insert the inspection record
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .insert({
        company_id,
        job_id: resolvedJobId,
        created_by: user.id,
        status: 'draft',
        assessment_data: EMPTY_ASSESSMENT,
      })
      .select()
      .single();

    if (inspectionError || !inspection) {
      console.error('[inspections POST] Failed to create inspection:', inspectionError);
      return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
    }

    return NextResponse.json(inspection, { status: 201 });
  } catch (err) {
    console.error('[inspections POST] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
