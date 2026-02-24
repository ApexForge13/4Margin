/**
 * Retry utility for Claude API calls.
 * Handles transient errors (rate limits, network issues) with exponential backoff.
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

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(
        `[retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`,
        err instanceof Error ? err.message : err
      );
      await sleep(delay);
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error("Retry exhausted");
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Rate limit errors
    if (msg.includes("rate_limit") || msg.includes("429") || msg.includes("too many requests")) {
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
