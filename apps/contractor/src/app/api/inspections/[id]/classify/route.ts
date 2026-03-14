import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '@/lib/ai/retry';
import type { PhotoCategory } from '@/types/inspection';

const CLASSIFY_PROMPT = `Classify this roofing inspection photo into exactly one category and subcategory.

Categories:
- elevation: front, front_left, left, back_left, back, back_right, right, front_right
- roof_overview: (no subcategory)
- damage: hail, wind, mechanical, wear_tear, tree, animal, other
- component: flashing, vent, pipe_boot, gutter, drip_edge, skylight, chimney, soffit_fascia, ridge_cap, valley, other
- interior_damage: (no subcategory)
- install: (no subcategory)
- other: (no subcategory)

Return ONLY a JSON object:
{"category": "<category>", "subcategory": "<subcategory or null>", "confidence": <0.0-1.0>}`;

interface ClassifyResult {
  category: PhotoCategory;
  subcategory: string | null;
  confidence: number;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const VALID_MIME_TYPES: ImageMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

async function classifyPhoto(
  imageBase64: string,
  mimeType: string
): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
  const client = new Anthropic({ apiKey });

  const mediaType = VALID_MIME_TYPES.includes(mimeType as ImageMediaType)
    ? (mimeType as ImageMediaType)
    : 'image/jpeg';

  const response = await withRetry(
    () =>
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: CLASSIFY_PROMPT,
              },
            ],
          },
        ],
      }),
    { maxRetries: 3, label: 'classifyPhoto' }
  );

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return JSON.parse(textBlock.text) as ClassifyResult;
}

export async function POST(
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

    // Verify the inspection exists and belongs to this user's company (RLS handles this)
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id, company_id')
      .eq('id', id)
      .single();

    if (inspectionError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    const body = await request.json() as { photo_ids: string[] };
    const { photo_ids } = body;

    if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
      return NextResponse.json(
        { error: 'photo_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    let classified = 0;
    let errors = 0;
    const BATCH_SIZE = 3;

    for (let i = 0; i < photo_ids.length; i += BATCH_SIZE) {
      const batch = photo_ids.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (photo_id) => {
          // Fetch photo record (RLS ensures it belongs to the same company)
          const { data: photo, error: photoError } = await supabase
            .from('inspection_photos')
            .select('id, storage_path, mime_type, inspection_id')
            .eq('id', photo_id)
            .eq('inspection_id', id)
            .single();

          if (photoError || !photo) {
            throw new Error(`Photo ${photo_id} not found`);
          }

          // Download image from Supabase Storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('inspection-photos')
            .download(photo.storage_path);

          if (downloadError || !fileData) {
            throw new Error(`Failed to download photo ${photo_id}: ${downloadError?.message}`);
          }

          // Convert Blob to base64
          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = photo.mime_type ?? 'image/jpeg';

          // Classify with Haiku Vision
          const result = await classifyPhoto(base64, mimeType);

          // Update the inspection_photos record
          const { error: updateError } = await supabase
            .from('inspection_photos')
            .update({
              ai_category: result.category,
              ai_subcategory: result.subcategory,
              ai_confidence: result.confidence,
            })
            .eq('id', photo_id);

          if (updateError) {
            throw new Error(`Failed to update photo ${photo_id}: ${updateError.message}`);
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          classified++;
        } else {
          errors++;
          console.error('[classify] Photo error:', result.reason);
        }
      }
    }

    return NextResponse.json({ classified, errors });
  } catch (err) {
    console.error('[classify POST]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
