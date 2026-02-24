import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, SUPPLEMENT_PRICE_CENTS } from "@/lib/stripe";
import { stripeCheckoutSchema, validate } from "@/lib/validations/schemas";

export async function POST(request: NextRequest) {
  // ── Auth check ───────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Validate input ──────────────────────────────────────
  const body = await request.json();
  const parsed = validate(stripeCheckoutSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { supplementId } = parsed.data;

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

  // ── First Supplement Free ─────────────────────────────────
  const { data: userProfile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (userProfile?.company_id) {
    const { count: priorPaidCount } = await supabase
      .from("supplements")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userProfile.company_id)
      .not("paid_at", "is", null);

    if ((priorPaidCount ?? 0) === 0) {
      // First supplement — auto-unlock for free
      await supabase
        .from("supplements")
        .update({ paid_at: new Date().toISOString() })
        .eq("id", supplementId);

      const origin = request.headers.get("origin") || "http://localhost:3000";
      return NextResponse.json({
        url: `${origin}/dashboard/supplements/${supplementId}?payment=success&free=true`,
      });
    }
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
