import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable errors and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 rate_limit"))
      .mockRejectedValueOnce(new Error("503 service unavailable"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Invalid input"));

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })
    ).rejects.toThrow("Invalid input");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("429 too many requests"));

    const promise = withRetry(fn, { maxRetries: 2, baseDelayMs: 1 });
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const rejection = expect(promise).rejects.toThrow("429 too many requests");
    await vi.runAllTimersAsync();
    await rejection;
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("retries on network errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValue("recovered");

    const promise = withRetry(fn, { maxRetries: 1, baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("recovered");
  });

  it("retries on overloaded errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("529 overloaded"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn, { maxRetries: 1, baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("ok");
  });

  it("retries on timeout errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Request timeout"))
      .mockResolvedValue("done");

    const promise = withRetry(fn, { maxRetries: 1, baseDelayMs: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe("done");
  });
});
