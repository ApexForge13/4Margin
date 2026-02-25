import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, POLICY_DECODER_PRICE_CENTS } from "@/lib/stripe";
import {
  policyDecoderCheckoutSchema,
  validate,
} from "@/lib/validations/schemas";

export async function POST(request: NextRequest) {
  try {
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
    const parsed = validate(policyDecoderCheckoutSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { policyDecodingId } = parsed.data;

    const admin = createAdminClient();

    // ── Get user's company_id ─────────────────────────────────
    const { data: userProfile } = await admin
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!userProfile?.company_id) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 400 }
      );
    }

    const companyId = userProfile.company_id;

    // ── Verify decoding exists and belongs to company ─────────
    const { data: decoding, error } = await admin
      .from("policy_decodings")
      .select("id, status, paid_at, original_filename")
      .eq("id", policyDecodingId)
      .eq("company_id", companyId)
      .single();

    if (error || !decoding) {
      return NextResponse.json(
        { error: "Policy decoding not found" },
        { status: 404 }
      );
    }

    if (decoding.paid_at) {
      return NextResponse.json(
        { error: "This policy decode has already been paid for" },
        { status: 400 }
      );
    }

    // ── First Decode Free (mirrors supplement pattern) ────────
    const { count: priorPaidCount } = await admin
      .from("policy_decodings")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .not("paid_at", "is", null);

    if ((priorPaidCount ?? 0) === 0) {
      // First decode — auto-unlock for free
      await admin
        .from("policy_decodings")
        .update({ paid_at: new Date().toISOString() })
        .eq("id", policyDecodingId);

      const origin =
        request.headers.get("origin") || "http://localhost:3000";
      const freeUrl = `${origin}/dashboard/policy-decoder/${policyDecodingId}?payment=success&free=true`;
      return NextResponse.json({ url: freeUrl });
    }

    // ── Create Stripe Checkout Session ────────────────────────
    const origin =
      request.headers.get("origin") || "http://localhost:3000";
    const fileLabel = decoding.original_filename || "Policy PDF";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      metadata: {
        policyDecodingId,
        userId: user.id,
        type: "policy_decoder",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: POLICY_DECODER_PRICE_CENTS,
            product_data: {
              name: "Policy Decode",
              description: `Policy analysis for ${fileLabel}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/policy-decoder/${policyDecodingId}?payment=success`,
      cancel_url: `${origin}/dashboard/policy-decoder/${policyDecodingId}?payment=cancelled`,
    });

    // Save session ID for webhook matching
    await admin
      .from("policy_decodings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", policyDecodingId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/policy-checkout] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
