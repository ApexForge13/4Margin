import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_LINE_ITEMS } from '@/types/pricing';

export async function GET(_request: NextRequest) {
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

    const { data: pricing, error: pricingError } = await supabase
      .from('company_pricing')
      .select('*')
      .eq('company_id', company_id)
      .maybeSingle();

    if (pricingError) {
      console.error('[company/pricing GET]', pricingError);
      return NextResponse.json({ error: pricingError.message }, { status: 500 });
    }

    if (!pricing) {
      return NextResponse.json({
        good_tier: { label: 'Good', manufacturer: '', product_line: '', price_per_square: 0 },
        better_tier: { label: 'Better', manufacturer: '', product_line: '', price_per_square: 0 },
        best_tier: { label: 'Best', manufacturer: '', product_line: '', price_per_square: 0 },
        default_line_items: DEFAULT_LINE_ITEMS,
        addon_templates: [],
      });
    }

    return NextResponse.json(pricing);
  } catch (err) {
    console.error('[company/pricing GET]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
      good_tier: unknown;
      better_tier: unknown;
      best_tier: unknown;
      default_line_items: unknown;
      addon_templates: unknown;
    };

    const { good_tier, better_tier, best_tier, default_line_items, addon_templates } = body;

    const { data: pricing, error: upsertError } = await supabase
      .from('company_pricing')
      .upsert(
        { company_id, good_tier, better_tier, best_tier, default_line_items, addon_templates },
        { onConflict: 'company_id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[company/pricing PUT]', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json(pricing);
  } catch (err) {
    console.error('[company/pricing PUT]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
