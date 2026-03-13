import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST — batch confirm multiple photos
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

    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required and must not be empty." },
        { status: 400 }
      );
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 photos per batch." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("training_photos")
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      console.error("[training-photos] batch-confirm error:", error);
      return NextResponse.json(
        { error: "Failed to confirm photos." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    console.error("[training-photos] batch-confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
