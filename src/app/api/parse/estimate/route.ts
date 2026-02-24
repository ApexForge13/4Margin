import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEstimateWithClaude } from "@/lib/parsers/claude";
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

    console.log("[parse/estimate] Processing file:", storagePath);
    const parsed = await parseEstimateWithClaude(signedUrlData.signedUrl);
    console.log("[parse/estimate] Claude response:", JSON.stringify(parsed, null, 2));

    // Clean up temp file (server-side backup cleanup)
    admin.storage.from("temp-parsing").remove([storagePath]).catch(() => {});

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[parse/estimate] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to parse estimate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
