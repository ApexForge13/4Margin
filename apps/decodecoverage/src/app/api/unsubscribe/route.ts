import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const { id, email } = await request.json();

    if (!id && !email) {
      return NextResponse.json(
        { error: "Missing id or email" },
        { status: 400 }
      );
    }

    // Build query — match by lead ID or email
    let query = supabase
      .from("consumer_leads")
      .update({
        consent_contact: false,
        email_sequence_stage: 99, // Stop all future emails
      });

    if (id) {
      query = query.eq("id", id);
    } else if (email) {
      query = query.eq("email", email);
    }

    const { error } = await query;

    if (error) {
      console.error("[unsubscribe] DB error:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET handler for one-click unsubscribe (List-Unsubscribe header support).
 * Some email clients send a GET request to the unsubscribe URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");

  if (!id && !email) {
    // Redirect to the unsubscribe page without auto-processing
    return NextResponse.redirect(
      new URL("/unsubscribe", request.url)
    );
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("consumer_leads")
    .update({
      consent_contact: false,
      email_sequence_stage: 99,
    });

  if (id) {
    query = query.eq("id", id);
  } else if (email) {
    query = query.eq("email", email);
  }

  await query;

  // Redirect to confirmation page
  return NextResponse.redirect(
    new URL(`/unsubscribe?id=${id || ""}&email=${email || ""}&done=1`, request.url)
  );
}
