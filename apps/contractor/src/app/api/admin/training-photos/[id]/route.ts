import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH — update classification + mark reviewed
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { category, subcategory, damage_severity, components_visible, description } =
      body as {
        category?: string;
        subcategory?: string;
        damage_severity?: string;
        components_visible?: string[];
        description?: string;
      };

    // Build update object — only include provided fields
    const update: Record<string, unknown> = {
      reviewed: true,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (category !== undefined) update.category = category;
    if (subcategory !== undefined) update.subcategory = subcategory;
    if (damage_severity !== undefined) update.damage_severity = damage_severity;
    if (components_visible !== undefined) update.components_visible = components_visible;
    if (description !== undefined) update.description = description;

    const admin = createAdminClient();
    const { error } = await admin
      .from("training_photos")
      .update(update)
      .eq("id", id);

    if (error) {
      console.error("[training-photos] PATCH error:", error);
      return NextResponse.json(
        { error: "Failed to update photo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[training-photos] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
