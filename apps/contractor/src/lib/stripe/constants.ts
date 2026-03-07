/** Price in cents for a single supplement generation */
export const SUPPLEMENT_PRICE_CENTS = 14900; // $149.00
export const SUPPLEMENT_PRICE_DISPLAY = "$149";

/** Price in cents for a standalone policy decode */
export const POLICY_DECODER_PRICE_CENTS = 5000; // $50.00
export const POLICY_DECODER_PRICE_DISPLAY = "$50";

/** Price in cents for a contractor-initiated policy check */
export const POLICY_CHECK_PRICE_CENTS = 2900; // $29.00
export const POLICY_CHECK_PRICE_DISPLAY = "$29";

/** Enterprise Stripe Product IDs (shared across all enterprise clients) */
export const STRIPE_ENTERPRISE_BASE_PRODUCT_ID =
  process.env.STRIPE_ENTERPRISE_BASE_PRODUCT_ID || "";
export const STRIPE_ENTERPRISE_DECODE_OVERAGE_PRODUCT_ID =
  process.env.STRIPE_ENTERPRISE_DECODE_OVERAGE_PRODUCT_ID || "";
export const STRIPE_ENTERPRISE_SUPPLEMENT_OVERAGE_PRODUCT_ID =
  process.env.STRIPE_ENTERPRISE_SUPPLEMENT_OVERAGE_PRODUCT_ID || "";
