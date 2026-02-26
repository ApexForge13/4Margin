/**
 * Retry utility for Claude API calls.
 * Handles transient errors (rate limits, network issues) with exponential backoff.
 * Rate limit errors use a longer base delay (30s) to wait out per-minute windows.
 */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, label = "API call" } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = isRetryableError(err);

      if (isLastAttempt || !isRetryable) {
        throw err;
      }

      // Use longer delay for rate limit errors (need to wait out the per-minute window)
      const rateLimit = isRateLimitError(err);
      const effectiveBase = rateLimit ? Math.max(baseDelayMs, 30000) : baseDelayMs;
      const delay = effectiveBase * Math.pow(2, attempt) + Math.random() * 2000;
      console.warn(
        `[retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1})${rateLimit ? " [RATE LIMITED — waiting longer]" : ""}, retrying in ${Math.round(delay / 1000)}s:`,
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
