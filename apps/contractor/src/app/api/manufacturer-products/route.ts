import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: products, error } = await supabase
      .from('manufacturer_product_lines')
      .select('*')
      .eq('is_active', true)
      .order('manufacturer')
      .order('product_line');

    if (error) {
      console.error('[manufacturer-products GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(products ?? []);
  } catch (err) {
    console.error('[manufacturer-products GET]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
