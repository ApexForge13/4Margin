import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AssessmentData, InspectionStatus } from '@/types/inspection';

export async function GET(
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

    const { data: inspection, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    return NextResponse.json(inspection);
  } catch (err) {
    console.error('[inspections GET]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      assessment_data?: AssessmentData;
      status?: InspectionStatus;
      inspected_at?: string;
    };

    const updates: Record<string, unknown> = {};

    if ('assessment_data' in body) {
      if (typeof body.assessment_data !== 'object' || body.assessment_data === null) {
        return NextResponse.json(
          { error: 'assessment_data must be an object' },
          { status: 400 }
        );
      }
      updates.assessment_data = body.assessment_data;
    }

    if ('status' in body) {
      updates.status = body.status;
    }

    if ('inspected_at' in body) {
      updates.inspected_at = body.inspected_at;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: inspection, error } = await supabase
      .from('inspections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !inspection) {
      console.error('[inspections PATCH]', error);
      return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
    }

    return NextResponse.json(inspection);
  } catch (err) {
    console.error('[inspections PATCH]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
