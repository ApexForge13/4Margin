/**
 * Photo Analysis with Claude Vision
 *
 * Analyzes inspection photos to identify:
 * - Type of damage visible (hail hits, wind lift, missing shingles, etc.)
 * - Affected components (ridge, valley, field, flashing, etc.)
 * - Severity assessment
 * - Relevant Xactimate line items the damage supports
 */

import Anthropic from "@anthropic-ai/sdk";

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
};

export interface PhotoAnalysisResult {
  damage_types: string[];
  components_affected: string[];
  severity: "minor" | "moderate" | "severe";
  description: string;
  supports_items: string[];
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const PHOTO_ANALYSIS_PROMPT = `You are a roofing damage assessment expert. Analyze this inspection photo and identify visible damage.

Return ONLY a JSON object — no markdown, no code fences:

{
  "damage_types": ["<types of damage visible, e.g. 'hail impact', 'wind lift', 'missing shingles', 'granule loss', 'cracked flashing', 'exposed nail heads'>"],
  "components_affected": ["<roof components visible/affected, e.g. 'ridge cap', 'field shingles', 'valley', 'drip edge', 'pipe boot', 'step flashing', 'starter strip'>"],
  "severity": "<minor|moderate|severe>",
  "description": "<1-2 sentence professional description of what this photo shows for use in a supplement document>",
  "supports_items": ["<Xactimate line item descriptions this photo could support, e.g. 'Ridge cap replacement', 'Ice & water shield at valleys', 'Pipe boot flashing'>"]
}

If the photo does not show roofing damage or is not relevant, still return the JSON with empty arrays and "N/A" description.`;

export async function analyzePhoto(
  imageBase64: string,
  mimeType: string
): Promise<PhotoAnalysisResult> {
  const client = getClient();

  // Validate mime type
  const validTypes: ImageMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const mediaType = validTypes.includes(mimeType as ImageMediaType)
    ? (mimeType as ImageMediaType)
    : "image/jpeg";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: PHOTO_ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return JSON.parse(textBlock.text) as PhotoAnalysisResult;
}

/**
 * Analyze multiple photos in parallel (with concurrency limit).
 */
export async function analyzePhotos(
  photos: Array<{ id: string; base64: string; mimeType: string }>
): Promise<Map<string, PhotoAnalysisResult>> {
  const results = new Map<string, PhotoAnalysisResult>();
  const concurrency = 3;

  for (let i = 0; i < photos.length; i += concurrency) {
    const batch = photos.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (photo) => {
        const result = await analyzePhoto(photo.base64, photo.mimeType);
        return { id: photo.id, result };
      })
    );

    for (const settled of batchResults) {
      if (settled.status === "fulfilled") {
        results.set(settled.value.id, settled.value.result);
      }
    }
  }

  return results;
}
