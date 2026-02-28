import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPaymentConfirmationEmail,
  sendPolicyCheckInviteEmail,
} from "@/lib/email/send";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // If no webhook secret configured, just parse directly (dev mode)
  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }
  } else {
    // Dev mode: parse without signature verification
    event = JSON.parse(body) as Stripe.Event;
  }

  // ── Handle checkout.session.completed ─────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const admin = createAdminClient();

    // ── Policy Check payment ──────────────────────────────────
    if (session.metadata?.type === "policy_check") {
      const policyCheckId = session.metadata?.policyCheckId;
      if (!policyCheckId) {
        console.error("No policyCheckId in session metadata");
        return NextResponse.json({ received: true });
      }

      const { error } = await admin
        .from("policy_checks")
        .update({
          payment_status: "paid",
          stripe_payment_id: session.payment_intent as string,
        })
        .eq("id", policyCheckId);

      if (error) {
        console.error("Failed to update policy check payment:", error);
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      console.log(`Payment recorded for policy check ${policyCheckId}`);

      // Send invite email to homeowner (fire-and-forget)
      sendPolicyCheckInviteEmail(policyCheckId).catch(() => {});
    }

    // ── Policy Decoder payment ────────────────────────────────
    else if (session.metadata?.type === "policy_decoder") {
      const policyDecodingId = session.metadata?.policyDecodingId;
      if (!policyDecodingId) {
        console.error("No policyDecodingId in session metadata");
        return NextResponse.json({ received: true });
      }

      const { error } = await admin
        .from("policy_decodings")
        .update({
          stripe_payment_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
        })
        .eq("id", policyDecodingId);

      if (error) {
        console.error("Failed to update policy decoding payment:", error);
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      console.log(`Payment recorded for policy decoding ${policyDecodingId}`);
    } else {
      // Supplement payment (existing flow)
      const supplementId = session.metadata?.supplementId;
      if (!supplementId) {
        console.error("No supplementId in session metadata");
        return NextResponse.json({ received: true });
      }

      const { error } = await admin
        .from("supplements")
        .update({
          stripe_payment_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
        })
        .eq("id", supplementId);

      if (error) {
        console.error("Failed to update supplement payment:", error);
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      console.log(`Payment recorded for supplement ${supplementId}`);

      // Send payment confirmation email (fire-and-forget)
      const amountPaid = session.amount_total
        ? session.amount_total / 100
        : 149;
      sendPaymentConfirmationEmail(supplementId, amountPaid).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
