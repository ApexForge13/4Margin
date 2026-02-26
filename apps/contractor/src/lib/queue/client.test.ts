import { describe, it, expect, vi, beforeEach } from "vitest";
import { isQueueEnabled } from "./client";

describe("isQueueEnabled", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("returns false when QSTASH_TOKEN is not set", () => {
    delete process.env.QSTASH_TOKEN;
    expect(isQueueEnabled()).toBe(false);
  });

  it("returns false when QSTASH_TOKEN is empty string", () => {
    process.env.QSTASH_TOKEN = "";
    expect(isQueueEnabled()).toBe(false);
  });

  it("returns true when QSTASH_TOKEN is set", () => {
    process.env.QSTASH_TOKEN = "qstash_test_token_123";
    expect(isQueueEnabled()).toBe(true);
  });
});
