import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseMeasurementWithClaude } from "@/lib/parsers/claude";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rl = checkRateLimit(`parse:${user.id}`, RATE_LIMITS.parse);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const { storagePath } = await request.json();

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "No storage path provided" }, { status: 400 });
    }

    // Generate a signed URL for Claude to fetch the PDF directly
    const admin = createAdminClient();
    const { data: signedUrlData, error: urlError } = await admin.storage
      .from("temp-parsing")
      .createSignedUrl(storagePath, 300); // 5 min expiry

    if (urlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: "Failed to access uploaded file" },
        { status: 400 }
      );
    }

    console.log("[parse/measurement] Processing file:", storagePath);
    const parsed = await parseMeasurementWithClaude(signedUrlData.signedUrl);
    console.log("[parse/measurement] Claude response:", JSON.stringify(parsed, null, 2));

    // ── Post-processing: round values for roofing standards ──

    // Round suggestedSquares to nearest 1/3 increment (.00, .33, .66)
    if (parsed.suggestedSquares) {
      const val = parseFloat(parsed.suggestedSquares as string);
      if (!isNaN(val) && val > 0) {
        const thirds = Math.round(val * 3);
        const whole = Math.floor(thirds / 3);
        const remainder = thirds % 3;
        if (remainder === 0) parsed.suggestedSquares = `${whole}`;
        else if (remainder === 1) parsed.suggestedSquares = `${whole}.33`;
        else parsed.suggestedSquares = `${whole}.66`;
      }
    }

    // Round steepSquares to nearest whole number
    if (parsed.steepSquares) {
      const val = parseFloat(parsed.steepSquares as string);
      if (!isNaN(val) && val > 0) {
        parsed.steepSquares = `${Math.round(val)}`;
      }
    }

    // Strip penetration data from accessories — Claude sometimes includes it despite prompting
    if (parsed.accessories && typeof parsed.accessories === "string") {
      parsed.accessories = (parsed.accessories as string)
        .replace(/\d+\s*penetrations?\b/gi, "")
        .replace(/penetrations?\s*[:=]\s*\d+/gi, "")
        .replace(/,\s*,/g, ",")
        .replace(/^[,\s]+|[,\s]+$/g, "")
        .trim();
    }

    // Clean up temp file (server-side backup cleanup)
    admin.storage.from("temp-parsing").remove([storagePath]).catch(() => {});

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[parse/measurement] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to parse measurement report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
