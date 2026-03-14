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
      .select('*')
      .eq('id', id)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Fetch job for property info
    const { data: job } = inspection.job_id
      ? await supabase
          .from('jobs')
          .select('*')
          .eq('id', inspection.job_id)
          .single()
      : { data: null };

    // Fetch company for branding
    const { data: company } = await supabase
      .from('companies')
      .select('name, brand_colors')
      .eq('id', inspection.company_id)
      .single();

    // Fetch user for inspector name
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Fetch inspection photos ordered by sort_order
    const { data: photos } = await supabase
      .from('inspection_photos')
      .select('*')
      .eq('inspection_id', id)
      .order('sort_order', { ascending: true });

    console.log(
      `[generate] Inspection ${id}: job=${job?.id ?? 'none'}, ` +
      `company=${company?.name ?? 'unknown'}, ` +
      `inspector=${userProfile?.full_name ?? userProfile?.email ?? 'unknown'}, ` +
      `photos=${photos?.length ?? 0}`
    );

    // TODO: Wire up @4margin/pdf inspection PDF generation
    const { error: updateError } = await supabase
      .from('inspections')
      .update({ status: 'complete' })
      .eq('id', id);

    if (updateError) {
      console.error('[generate] Failed to update inspection status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update inspection status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'complete',
      message: 'PDF generation placeholder',
    });
  } catch (err) {
    console.error('[generate POST]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
