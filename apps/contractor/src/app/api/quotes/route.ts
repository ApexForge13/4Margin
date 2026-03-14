import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_LINE_ITEMS } from '@/types/pricing';
import { EMPTY_TIER } from '@/types/quote';
import { findOrCreateJob } from '@/lib/jobs/auto-create';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userRow?.company_id) {
      return NextResponse.json({ error: 'User company not found' }, { status: 403 });
    }

    const company_id: string = userRow.company_id;

    const body = await request.json() as {
      job_id?: string;
      property_address?: string;
      homeowner_name?: string;
      total_squares?: number;
    };

    const { job_id, property_address, homeowner_name, total_squares } = body;

    // Resolve job_id
    let resolvedJobId: string | null = null;

    if (job_id) {
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
        .select('homeowner_name')
        .eq('id', job_id)
        .eq('company_id', company_id)
        .single();

      if (existingJobData && !existingJobData.homeowner_name && homeowner_name) {
        await supabase.from('jobs').update({ homeowner_name }).eq('id', resolvedJobId).eq('company_id', company_id);
      }
    } else if (property_address) {
      // Use findOrCreateJob for proper matching + enrichment
      const result = await findOrCreateJob(supabase, {
        companyId: company_id,
        createdBy: user.id,
        propertyAddress: property_address,
        homeownerName: homeowner_name,
      });

      resolvedJobId = result.jobId;
    }

    // Fetch company pricing for tier defaults
    const { data: pricing } = await supabase
      .from('company_pricing')
      .select('good_tier, better_tier, best_tier, default_line_items')
      .eq('company_id', company_id)
      .maybeSingle();

    const goodTierBase = pricing?.good_tier ?? { label: 'Good', manufacturer: '', product_line: '', price_per_square: 0 };
    const betterTierBase = pricing?.better_tier ?? { label: 'Better', manufacturer: '', product_line: '', price_per_square: 0 };
    const bestTierBase = pricing?.best_tier ?? { label: 'Best', manufacturer: '', product_line: '', price_per_square: 0 };
    const lineItems = pricing?.default_line_items ?? DEFAULT_LINE_ITEMS;

    const { data: quote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        company_id,
        job_id: resolvedJobId,
        created_by: user.id,
        status: 'draft',
        total_squares: total_squares ?? null,
        homeowner_name: homeowner_name ?? null,
        good_tier: { ...EMPTY_TIER, ...goodTierBase, subtotal: 0, total: 0 },
        better_tier: { ...EMPTY_TIER, ...betterTierBase, subtotal: 0, total: 0 },
        best_tier: { ...EMPTY_TIER, ...bestTierBase, subtotal: 0, total: 0 },
        add_ons: [],
        discounts: [],
        line_items: lineItems,
        selected_tier: null,
        quote_pdf_url: null,
      })
      .select()
      .single();

    if (insertError || !quote) {
      console.error('[quotes POST] Failed to create quote:', insertError);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    console.error('[quotes POST]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
