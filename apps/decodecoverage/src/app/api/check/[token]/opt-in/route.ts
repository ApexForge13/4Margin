import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: check } = await supabase
    .from("policy_checks")
    .select("id, concierge_status")
    .eq("token", token)
    .single();

  if (!check) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (check.concierge_status !== "email_sent") {
    return NextResponse.json(
      { error: "No pending concierge request" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const optIn = body.optIn === true;

  const { error } = await supabase
    .from("policy_checks")
    .update({
      concierge_status: optIn ? "opted_in" : "opted_out",
      lead_contactable: optIn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", check.id);

  if (error) {
    console.error("[opt-in] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, optedIn: optIn });
}
