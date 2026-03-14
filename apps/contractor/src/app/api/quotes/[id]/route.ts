import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (err) {
    console.error('[quotes/[id] GET]', err);
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

    const body = await request.json() as Record<string, unknown>;

    const allowedFields = [
      'status',
      'total_squares',
      'homeowner_name',
      'good_tier',
      'better_tier',
      'best_tier',
      'add_ons',
      'discounts',
      'line_items',
      'selected_tier',
      'quote_pdf_url',
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

    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[quotes/[id] PATCH]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(quote);
  } catch (err) {
    console.error('[quotes/[id] PATCH]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
