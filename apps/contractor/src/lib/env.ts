/**
 * Environment Variable Validation
 *
 * Validates that required environment variables are set.
 * Called at build time via next.config and logs warnings for missing optional vars.
 */

/** Required in all environments */
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/** Required in production only */
const PRODUCTION_REQUIRED_VARS = [
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
] as const;

/** Optional but recommended for production */
const RECOMMENDED_VARS = [
  "QSTASH_TOKEN",
  "SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
] as const;

export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  // Check required vars
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  // Check production-required vars
  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED_VARS) {
      if (!process.env[key]) {
        errors.push(`Missing production env var: ${key}`);
      }
    }

    // Warn if NEXT_PUBLIC_APP_URL still has localhost
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl?.includes("localhost")) {
      errors.push(
        `NEXT_PUBLIC_APP_URL contains "localhost" (${appUrl}) — this should be your production domain`
      );
    }
  }

  // Log warnings for recommended vars (non-fatal)
  for (const key of RECOMMENDED_VARS) {
    if (!process.env[key]) {
      console.warn(`[env] Optional var not set: ${key}`);
    }
  }

  if (errors.length > 0) {
    console.error("[env] Environment validation failed:");
    errors.forEach((e) => console.error(`  - ${e}`));
  }

  return { valid: errors.length === 0, errors };
}
