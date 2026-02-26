import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePolicyPdfV2 } from "@/lib/ai/policy-parser";
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

    // Rate limit (reuse parse limits)
    const rl = checkRateLimit(`parse-policy:${user.id}`, RATE_LIMITS.parse);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
        }
      );
    }

    const { storagePath, claimType } = await request.json();

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json(
        { error: "No storage path provided" },
        { status: 400 }
      );
    }

    // Download the PDF from storage and convert to base64
    const admin = createAdminClient();
    const { data: fileData, error: downloadError } = await admin.storage
      .from("temp-parsing")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("[parse/policy] Download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to access uploaded policy file" },
        { status: 400 }
      );
    }

    // Convert to base64 for Claude document input
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    console.log(
      `[parse/policy] Processing policy file: ${storagePath} (${Math.round(arrayBuffer.byteLength / 1024)}KB)`
    );

    const analysis = await parsePolicyPdfV2(base64, claimType);

    console.log(
      `[parse/policy] Analysis complete. Risk: ${analysis.riskLevel}, Landmines: ${analysis.landmines.length}, Confidence: ${analysis.confidence}`
    );

    // Clean up temp file
    admin.storage
      .from("temp-parsing")
      .remove([storagePath])
      .catch(() => {});

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[parse/policy] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to parse policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
