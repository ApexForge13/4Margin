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

    // Fetch quote (RLS ensures company ownership)
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Fetch job for property info
    const { data: job } = quote.job_id
      ? await supabase
          .from('jobs')
          .select('*')
          .eq('id', quote.job_id)
          .single()
      : { data: null };

    // Fetch company for branding
    const { data: company } = await supabase
      .from('companies')
      .select('name, brand_colors')
      .eq('id', quote.company_id)
      .single();

    console.log(
      `[generate] Quote ${id}: job=${job?.id ?? 'none'}, ` +
      `company=${company?.name ?? 'unknown'}, ` +
      `squares=${quote.total_squares ?? 'unknown'}`
    );

    // TODO: Wire up @4margin/pdf quote PDF generation
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: 'draft' })
      .eq('id', id);

    if (updateError) {
      console.error('[quotes/generate POST] Failed to update quote status:', updateError);
      return NextResponse.json({ error: 'Failed to update quote status' }, { status: 500 });
    }

    if (quote.job_id) {
      await logActivity(supabase, {
        jobId: quote.job_id,
        companyId: quote.company_id,
        userId: user.id,
        action: 'quote_generated',
        description: `Quote generated — Good: $${quote.good_tier?.total ?? 0} / Better: $${quote.better_tier?.total ?? 0} / Best: $${quote.best_tier?.total ?? 0}`,
        metadata: { quote_id: id },
      });
    }

    return NextResponse.json({ status: 'draft', message: 'PDF generation placeholder' });
  } catch (err) {
    console.error('[quotes/generate POST]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
