/**
 * Next.js Instrumentation Hook
 *
 * Runs once when the Node.js server starts.
 * Used for environment validation and startup checks.
 */

export async function register() {
  // Only validate on server (not edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    const result = validateEnv();

    if (!result.valid && process.env.NODE_ENV === "production") {
      // Log errors but don't crash — Vercel may still have vars available at runtime
      console.error(
        `[startup] ${result.errors.length} env issue(s) detected. Check logs above.`
      );
    }
  }
}
