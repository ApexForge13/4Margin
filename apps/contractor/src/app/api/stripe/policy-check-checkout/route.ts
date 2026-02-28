import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, POLICY_CHECK_PRICE_CENTS } from "@/lib/stripe";

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
    const { policyCheckId } = body as { policyCheckId: string };

    if (!policyCheckId) {
      return NextResponse.json(
        { error: "policyCheckId is required" },
        { status: 400 }
      );
    }

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

    // ── Verify check exists and belongs to company ────────────
    const { data: check, error } = await admin
      .from("policy_checks")
      .select(
        "id, payment_status, homeowner_email, homeowner_first_name, homeowner_last_name"
      )
      .eq("id", policyCheckId)
      .eq("company_id", companyId)
      .single();

    if (error || !check) {
      return NextResponse.json(
        { error: "Policy check not found" },
        { status: 404 }
      );
    }

    if (check.payment_status === "paid" || check.payment_status === "free") {
      return NextResponse.json(
        { error: "This policy check has already been paid for" },
        { status: 400 }
      );
    }

    // ── First Check Free (mirrors supplement pattern) ─────────
    const { count: priorPaidCount } = await admin
      .from("policy_checks")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("payment_status", ["paid", "free"]);

    if ((priorPaidCount ?? 0) === 0) {
      // First check — auto-unlock for free
      await admin
        .from("policy_checks")
        .update({ payment_status: "free" })
        .eq("id", policyCheckId);

      const origin =
        request.headers.get("origin") || "http://localhost:3000";
      const freeUrl = `${origin}/dashboard/policy-checks/${policyCheckId}?payment=success&free=true`;
      return NextResponse.json({ url: freeUrl });
    }

    // ── Create Stripe Checkout Session ────────────────────────
    const origin =
      request.headers.get("origin") || "http://localhost:3000";

    const hoName = [check.homeowner_first_name, check.homeowner_last_name]
      .filter(Boolean)
      .join(" ") || check.homeowner_email;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      metadata: {
        policyCheckId,
        userId: user.id,
        type: "policy_check",
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: POLICY_CHECK_PRICE_CENTS,
            product_data: {
              name: "Policy Check",
              description: `Policy analysis for ${hoName}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/policy-checks/${policyCheckId}?payment=success`,
      cancel_url: `${origin}/dashboard/policy-checks/${policyCheckId}?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/policy-check-checkout] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
