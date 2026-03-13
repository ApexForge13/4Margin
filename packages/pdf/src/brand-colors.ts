/**
 * Extract dominant colors from a logo image.
 * Uses pixel sampling to find primary, secondary, and accent colors.
 * Returns RGB tuples compatible with jsPDF.
 *
 * Uses pure-JS image decoders (pngjs, jpeg-js) to avoid native
 * canvas dependencies that break on Vercel serverless.
 */

export interface BrandColors {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

export const DEFAULT_BRAND: BrandColors = {
  primary: [30, 58, 138], // Blue-900 (4Margin default)
  secondary: [51, 65, 85], // Slate-700
  accent: [59, 130, 246], // Blue-500
};

/**
 * Extract brand colors from a logo image buffer (PNG or JPEG).
 * Uses quantized pixel frequency analysis.
 * Falls back to DEFAULT_BRAND on error.
 */
export async function extractBrandColors(
  imageBuffer: Buffer,
  mimeType?: string
): Promise<BrandColors> {
  try {
    const pixels = await decodePixels(imageBuffer, mimeType);
    if (!pixels) return DEFAULT_BRAND;

    // Collect non-white, non-black, non-transparent pixels
    const colorCounts = new Map<
      string,
      { r: number; g: number; b: number; count: number }
    >();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent, near-white, near-black pixels
      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;

      // Quantize to reduce unique colors (bucket into 32-step ranges)
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;

      const existing = colorCounts.get(key);
      if (existing) {
        existing.count++;
        existing.r = Math.round(
          (existing.r * (existing.count - 1) + r) / existing.count
        );
        existing.g = Math.round(
          (existing.g * (existing.count - 1) + g) / existing.count
        );
        existing.b = Math.round(
          (existing.b * (existing.count - 1) + b) / existing.count
        );
      } else {
        colorCounts.set(key, { r, g, b, count: 1 });
      }
    }

    // Sort by frequency
    const sorted = Array.from(colorCounts.values()).sort(
      (a, b) => b.count - a.count
    );

    if (sorted.length === 0) return DEFAULT_BRAND;

    const primary: [number, number, number] = [
      sorted[0].r,
      sorted[0].g,
      sorted[0].b,
    ];
    const secondary: [number, number, number] =
      sorted.length > 1
        ? [sorted[1].r, sorted[1].g, sorted[1].b]
        : darken(primary, 0.3);
    const accent: [number, number, number] =
      sorted.length > 2
        ? [sorted[2].r, sorted[2].g, sorted[2].b]
        : lighten(primary, 0.3);

    return { primary, secondary, accent };
  } catch {
    return DEFAULT_BRAND;
  }
}

/**
 * Convert BrandColors RGB tuples to hex strings for CSS/HTML usage.
 */
export function brandColorsToHex(colors: BrandColors): {
  primary: string;
  secondary: string;
  accent: string;
} {
  return {
    primary: rgbToHex(colors.primary),
    secondary: rgbToHex(colors.secondary),
    accent: rgbToHex(colors.accent),
  };
}

// --- Internal helpers ---

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function darken(
  color: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    Math.round(color[0] * (1 - amount)),
    Math.round(color[1] * (1 - amount)),
    Math.round(color[2] * (1 - amount)),
  ];
}

function lighten(
  color: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    Math.round(color[0] + (255 - color[0]) * amount),
    Math.round(color[1] + (255 - color[1]) * amount),
    Math.round(color[2] + (255 - color[2]) * amount),
  ];
}

/**
 * Decode raw RGBA pixel data from PNG or JPEG buffer.
 * Uses pure-JS decoders to avoid native deps.
 */
async function decodePixels(
  buffer: Buffer,
  mimeType?: string
): Promise<Uint8Array | null> {
  const isPng =
    mimeType === "image/png" ||
    (buffer[0] === 0x89 && buffer[1] === 0x50); // PNG magic bytes

  if (isPng) {
    const { PNG } = await import("pngjs");
    const png = PNG.sync.read(buffer);
    return new Uint8Array(png.data);
  }

  // Assume JPEG
  const jpeg = await import("jpeg-js");
  const decoded = jpeg.decode(buffer, { useTArray: true });
  return decoded.data;
}
