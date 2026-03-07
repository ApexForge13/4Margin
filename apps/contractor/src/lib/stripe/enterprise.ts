import { stripe } from "./index";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ────────────────────────────────────────────────────

interface EnterpriseDeal {
  baseMonthlyCents: number;
  decodeCap: number;
  supplementCap: number;
  overageDecodeCents: number;
  overageSupplementCents: number;
}

// ── Product IDs (shared across all clients — create once in Stripe dashboard) ──

function getProductIds() {
  return {
    base: process.env.STRIPE_ENTERPRISE_BASE_PRODUCT_ID!,
    decodeOverage: process.env.STRIPE_ENTERPRISE_DECODE_OVERAGE_PRODUCT_ID!,
    supplementOverage:
      process.env.STRIPE_ENTERPRISE_SUPPLEMENT_OVERAGE_PRODUCT_ID!,
  };
}

// ── createEnterpriseCustomer ─────────────────────────────────

export async function createEnterpriseCustomer(
  companyId: string,
  companyName: string,
  ownerEmail: string
): Promise<string> {
  const customer = await stripe.customers.create({
    name: companyName,
    email: ownerEmail,
    metadata: { companyId },
  });

  const admin = createAdminClient();
  await admin
    .from("companies")
    .update({ stripe_customer_id: customer.id })
    .eq("id", companyId);

  return customer.id;
}

// ── provisionEnterprisePricing ───────────────────────────────

export async function provisionEnterprisePricing(
  companyId: string,
  deal: EnterpriseDeal
): Promise<void> {
  const admin = createAdminClient();
  const products = getProductIds();

  // Fetch company's Stripe customer ID
  const { data: company } = await admin
    .from("companies")
    .select("stripe_customer_id, name")
    .eq("id", companyId)
    .single();

  if (!company?.stripe_customer_id) {
    throw new Error(
      "Company has no Stripe customer. Call createEnterpriseCustomer first."
    );
  }

  const label = company.name || companyId;

  // Create 3 Stripe Prices unique to this client
  const [basePrice, decodeOveragePrice, supplementOveragePrice] =
    await Promise.all([
      stripe.prices.create({
        product: products.base,
        currency: "usd",
        unit_amount: deal.baseMonthlyCents,
        recurring: { interval: "month" },
        nickname: `${label} — Base Monthly`,
      }),
      stripe.prices.create({
        product: products.decodeOverage,
        currency: "usd",
        unit_amount: deal.overageDecodeCents,
        recurring: { interval: "month", usage_type: "metered" },
        nickname: `${label} — Decode Overage`,
      }),
      stripe.prices.create({
        product: products.supplementOverage,
        currency: "usd",
        unit_amount: deal.overageSupplementCents,
        recurring: { interval: "month", usage_type: "metered" },
        nickname: `${label} — Supplement Overage`,
      }),
    ]);

  // Create subscription with all 3 items
  const subscription = await stripe.subscriptions.create({
    customer: company.stripe_customer_id,
    items: [
      { price: basePrice.id },
      { price: decodeOveragePrice.id },
      { price: supplementOveragePrice.id },
    ],
    metadata: { companyId },
  });

  // Map subscription items to their price IDs
  const subItems = subscription.items.data;
  const baseItem = subItems.find((i) => i.price.id === basePrice.id);
  const decodeItem = subItems.find(
    (i) => i.price.id === decodeOveragePrice.id
  );
  const supplementItem = subItems.find(
    (i) => i.price.id === supplementOveragePrice.id
  );

  // Save everything to the company row
  await admin
    .from("companies")
    .update({
      account_type: "enterprise",
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      billing_cycle_anchor: new Date(
        subscription.billing_cycle_anchor * 1000
      ).toISOString(),

      // Deal terms
      base_monthly_price_cents: deal.baseMonthlyCents,
      monthly_decode_limit: deal.decodeCap,
      monthly_supplement_limit: deal.supplementCap,
      overage_decode_price_cents: deal.overageDecodeCents,
      overage_supplement_price_cents: deal.overageSupplementCents,

      // Stripe references
      stripe_base_price_id: basePrice.id,
      stripe_overage_decode_price_id: decodeOveragePrice.id,
      stripe_overage_supplement_price_id: supplementOveragePrice.id,
      stripe_sub_item_base: baseItem?.id || null,
      stripe_sub_item_decode: decodeItem?.id || null,
      stripe_sub_item_supplement: supplementItem?.id || null,
    })
    .eq("id", companyId);
}

// ── reportOverageUsage ───────────────────────────────────────
// Stripe v20+ uses Billing Meter Events instead of legacy usage records.
// Meter event names correspond to meters created in the Stripe dashboard.

export async function reportOverageUsage(
  stripeCustomerId: string,
  eventName: "decode_overage" | "supplement_overage",
  quantity: number = 1
): Promise<void> {
  await stripe.billing.meterEvents.create({
    event_name: eventName,
    payload: {
      stripe_customer_id: stripeCustomerId,
      value: String(quantity),
    },
    timestamp: Math.floor(Date.now() / 1000),
  });
}
