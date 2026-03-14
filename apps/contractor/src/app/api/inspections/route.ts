import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EMPTY_ASSESSMENT } from '@/types/inspection';
import { findOrCreateJob } from '@/lib/jobs/auto-create';
import type { JobType } from '@/types/job';

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

      // Enrich existing job with any new data (only fill empty fields)
      const { data: existingJobData } = await supabase
        .from('jobs')
        .select('homeowner_name, homeowner_phone, homeowner_email')
        .eq('id', job_id)
        .eq('company_id', company_id)
        .single();

      if (existingJobData) {
        const updates: Record<string, unknown> = {};
        if (!existingJobData.homeowner_name && homeowner_name) updates.homeowner_name = homeowner_name;
        if (!existingJobData.homeowner_phone && homeowner_phone) updates.homeowner_phone = homeowner_phone;
        if (!existingJobData.homeowner_email && homeowner_email) updates.homeowner_email = homeowner_email;
        if (Object.keys(updates).length > 0) {
          await supabase.from('jobs').update(updates).eq('id', resolvedJobId).eq('company_id', company_id);
        }
      }
    } else {
      // Use findOrCreateJob for proper matching + enrichment
      const result = await findOrCreateJob(supabase, {
        companyId: company_id,
        createdBy: user.id,
        propertyAddress: property_address,
        jobType: job_type as JobType,
        homeownerName: homeowner_name,
        homeownerPhone: homeowner_phone,
        homeownerEmail: homeowner_email,
      });

      resolvedJobId = result.jobId;
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
