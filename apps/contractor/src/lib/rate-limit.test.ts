import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  const config = { windowMs: 1000, maxRequests: 3 };

  beforeEach(() => {
    // Use a unique key per test to avoid cross-contamination
  });

  it("allows requests under the limit", () => {
    const key = `test-under-${Date.now()}`;
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("tracks remaining count correctly", () => {
    const key = `test-remaining-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const key = `test-over-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", async () => {
    const shortConfig = { windowMs: 50, maxRequests: 1 };
    const key = `test-reset-${Date.now()}`;

    checkRateLimit(key, shortConfig);
    const blocked = checkRateLimit(key, shortConfig);
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    const after = checkRateLimit(key, shortConfig);
    expect(after.allowed).toBe(true);
  });

  it("uses separate counters for different keys", () => {
    const key1 = `test-sep-a-${Date.now()}`;
    const key2 = `test-sep-b-${Date.now()}`;

    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);

    const r1 = checkRateLimit(key1, config);
    const r2 = checkRateLimit(key2, config);

    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });
});
