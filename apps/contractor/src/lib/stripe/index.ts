import Stripe from "stripe";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Return a proxy that throws a clear error at call-time instead of
    // crashing the entire build when the env var isn't set yet.
    return new Proxy({} as Stripe, {
      get(_, prop) {
        if (prop === "then") return undefined; // prevent Promise detection
        throw new Error(
          `Stripe is not configured — set STRIPE_SECRET_KEY in your environment variables.`
        );
      },
    });
  }
  return new Stripe(key, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
}

export const stripe = getStripeClient();

export {
  SUPPLEMENT_PRICE_CENTS,
  SUPPLEMENT_PRICE_DISPLAY,
  POLICY_DECODER_PRICE_CENTS,
  POLICY_DECODER_PRICE_DISPLAY,
  POLICY_CHECK_PRICE_CENTS,
  POLICY_CHECK_PRICE_DISPLAY,
} from "./constants";
