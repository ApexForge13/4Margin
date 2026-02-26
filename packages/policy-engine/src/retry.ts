/**
 * Retry utility for Claude API calls.
 * Handles transient errors (rate limits, network issues) with exponential backoff.
 *
 * Rate limit strategy: wait 15s then retry once. Longer waits risk Vercel
 * function timeouts (300s with Fluid Compute). Better to fail fast and let
 * the user retry via the UI than to hang silently.
 */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 2000, label = "API call" } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = isRetryableError(err);

      if (isLastAttempt || !isRetryable) {
        throw err;
      }

      // Rate limits: single 15s wait (fits within Vercel timeout)
      // Other errors: short exponential backoff
      const rateLimit = isRateLimitError(err);
      const delay = rateLimit
        ? 15000 + Math.random() * 3000 // 15-18s for rate limits
        : baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(
        `[retry] ${label} attempt ${attempt + 1}/${maxRetries + 1} failed${rateLimit ? " [RATE LIMITED]" : ""}, retrying in ${Math.round(delay / 1000)}s:`,
        err instanceof Error ? err.message : err
      );
      await sleep(delay);
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error("Retry exhausted");
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("rate_limit") || msg.includes("429") || msg.includes("too many requests");
  }
  return false;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Rate limit errors
    if (isRateLimitError(err)) {
      return true;
    }
    // Overloaded
    if (msg.includes("overloaded") || msg.includes("529")) {
      return true;
    }
    // Network errors
    if (msg.includes("econnreset") || msg.includes("timeout") || msg.includes("socket hang up")) {
      return true;
    }
    // Server errors (500, 502, 503)
    if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
