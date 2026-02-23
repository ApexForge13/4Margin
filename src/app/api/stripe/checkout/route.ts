import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, SUPPLEMENT_PRICE_CENTS } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  // ── Auth check ───────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { supplementId } = body;

  if (!supplementId) {
    return NextResponse.json(
      { error: "supplementId is required" },
      { status: 400 }
    );
  }

  // ── Verify supplement exists and belongs to user's company ─
  const { data: supplement, error } = await supabase
    .from("supplements")
    .select("id, status, paid_at, claims(id, claim_number, property_address)")
    .eq("id", supplementId)
    .single();

  if (error || !supplement) {
    return NextResponse.json(
      { error: "Supplement not found" },
      { status: 404 }
    );
  }

  // Already paid
  if (supplement.paid_at) {
    return NextResponse.json(
      { error: "This supplement has already been paid for" },
      { status: 400 }
    );
  }

  const claim = supplement.claims as unknown as Record<string, unknown>;
  const claimLabel =
    (claim?.claim_number as string) ||
    (claim?.property_address as string) ||
    supplementId.slice(0, 8);

  // ── Create Stripe Checkout Session ────────────────────────
  const origin = request.headers.get("origin") || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user.email,
    metadata: {
      supplementId,
      userId: user.id,
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: SUPPLEMENT_PRICE_CENTS,
          product_data: {
            name: "Supplement Report",
            description: `Insurance supplement for Claim #${claimLabel}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard/supplements/${supplementId}?payment=success`,
    cancel_url: `${origin}/dashboard/supplements/${supplementId}?payment=cancelled`,
  });

  // Save session ID to supplement for webhook matching
  await supabase
    .from("supplements")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", supplementId);

  return NextResponse.json({ url: session.url });
}
