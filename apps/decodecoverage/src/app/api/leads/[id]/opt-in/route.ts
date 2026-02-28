import { createAdminClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing lead ID" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("consumer_leads")
    .update({
      switching_interest: true,
      consent_contact: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update switching interest:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
