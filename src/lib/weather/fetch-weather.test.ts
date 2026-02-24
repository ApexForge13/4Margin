import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * We test the verdict logic and data parsing by importing and testing
 * the module's internal behavior through the public API.
 * Since fetchWeatherData makes real HTTP calls, we mock `fetch` globally.
 */

// Mock the retry module to avoid delays in tests
vi.mock("@/lib/ai/retry", () => ({
  withRetry: async <T>(fn: () => Promise<T>) => fn(),
}));

// Must import AFTER mocks
const { fetchWeatherData } = await import("./fetch-weather");

function makeApiResponse(overrides: Record<string, unknown> = {}) {
  return {
    address: "123 Main St, Plano, TX 75024",
    resolvedAddress: "123 Main St, Plano, TX 75024, US",
    latitude: 33.0198,
    longitude: -96.6989,
    days: [
      {
        datetime: "2024-01-15",
        tempmax: 45,
        tempmin: 28,
        temp: 36,
        windspeed: 22,
        windgust: 65,
        precip: 0.8,
        preciptype: ["rain", "hail"],
        snow: 0,
        conditions: "Thunderstorms, Hail",
        description: "Severe thunderstorms with large hail",
        humidity: 78,
        pressure: 1008.5,
        cloudcover: 95,
        visibility: 5.2,
        severerisk: 72,
        hours: [
          {
            datetime: "14:00:00",
            temp: 42,
            windspeed: 35,
            windgust: 65,
            precip: 0.5,
            preciptype: ["rain", "hail"],
            snow: 0,
            humidity: 85,
            pressure: 1005,
            cloudcover: 100,
            visibility: 2,
            conditions: "Hail",
            severerisk: 80,
          },
          {
            datetime: "15:00:00",
            temp: 40,
            windspeed: 25,
            windgust: 45,
            precip: 0.3,
            preciptype: ["rain"],
            snow: 0,
            humidity: 80,
            pressure: 1007,
            cloudcover: 90,
            visibility: 5,
            conditions: "Rain",
            severerisk: 40,
          },
          {
            datetime: "10:00:00",
            temp: 35,
            windspeed: 8,
            windgust: 12,
            precip: 0,
            preciptype: null,
            snow: 0,
            humidity: 60,
            pressure: 1012,
            cloudcover: 30,
            visibility: 10,
            conditions: "Clear",
            severerisk: 5,
          },
        ],
        events: [
          {
            datetime: "14:00:00",
            datetimeEpoch: 1705330800,
            type: "hail",
            description: "Large hail reported",
            size: 1.75,
          },
        ],
        ...overrides,
      },
    ],
  };
}

describe("fetchWeatherData", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      VISUAL_CROSSING_API_KEY: "test-key-123",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("throws when API key is not set", async () => {
    delete process.env.VISUAL_CROSSING_API_KEY;
    await expect(
      fetchWeatherData("123 Main St", "2024-01-15")
    ).rejects.toThrow("VISUAL_CROSSING_API_KEY is not configured");
  });

  it("parses API response and returns WeatherData", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeApiResponse()),
      })
    );

    const result = await fetchWeatherData("123 Main St, Plano, TX", "2024-01-15");

    expect(result.date).toBe("2024-01-15");
    expect(result.resolvedAddress).toContain("Plano");
    expect(result.conditions).toBe("Thunderstorms, Hail");
    expect(result.hours).toHaveLength(3);
    expect(result.events).toHaveLength(1);
  });

  it("computes maxWindGust from hourly data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeApiResponse()),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.maxWindGust).toBe(65);
  });

  it("detects hail from hourly preciptype", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makeApiResponse({
              events: [], // no events, but hail in hourly
              preciptype: ["rain", "hail"],
            })
          ),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.hailDetected).toBe(true);
  });

  it("detects hail from events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makeApiResponse({
              // Hourly has no hail, but events do
              hours: [
                {
                  datetime: "14:00:00",
                  temp: 42,
                  windspeed: 20,
                  windgust: 30,
                  precip: 0.5,
                  preciptype: ["rain"],
                  snow: 0,
                  humidity: 85,
                  pressure: 1005,
                  cloudcover: 100,
                  visibility: 2,
                  conditions: "Rain",
                  severerisk: 40,
                },
              ],
            })
          ),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.hailDetected).toBe(true);
    expect(result.hailSizeMax).toBe(1.75);
  });

  it("computes hailSizeMax from events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeApiResponse()),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.hailSizeMax).toBe(1.75);
  });

  it("filters stormWindow to elevated hours only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeApiResponse()),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    // Hour 14:00 (severerisk 80, gust 65, hail) and 15:00 (severerisk 40, gust 45)
    // Hour 10:00 has severerisk 5 and gust 12 — should be excluded
    expect(result.stormWindow).toHaveLength(2);
    expect(result.stormWindow[0].datetime).toBe("14:00:00");
    expect(result.stormWindow[1].datetime).toBe("15:00:00");
  });

  it("returns severe_confirmed when hail detected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeApiResponse()),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.verdict).toBe("severe_confirmed");
    expect(result.verdictText).toContain("SEVERE WEATHER CONFIRMED");
  });

  it("returns severe_confirmed when wind gust >= 58 mph (no hail)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makeApiResponse({
              preciptype: ["rain"],
              events: [],
              windgust: 62,
              hours: [
                {
                  datetime: "14:00:00",
                  temp: 42,
                  windspeed: 35,
                  windgust: 62,
                  precip: 0.3,
                  preciptype: ["rain"],
                  snow: 0,
                  humidity: 85,
                  pressure: 1005,
                  cloudcover: 100,
                  visibility: 5,
                  conditions: "Rain, Wind",
                  severerisk: 45,
                },
              ],
            })
          ),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.verdict).toBe("severe_confirmed");
    expect(result.verdictText).toContain("wind gusts of 62 mph");
  });

  it("returns moderate_weather when gusts 40-58 no hail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makeApiResponse({
              preciptype: ["rain"],
              events: [],
              windgust: 48,
              severerisk: 25,
              hours: [
                {
                  datetime: "14:00:00",
                  temp: 42,
                  windspeed: 25,
                  windgust: 48,
                  precip: 0.3,
                  preciptype: ["rain"],
                  snow: 0,
                  humidity: 70,
                  pressure: 1010,
                  cloudcover: 80,
                  visibility: 8,
                  conditions: "Rain",
                  severerisk: 25,
                },
              ],
            })
          ),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.verdict).toBe("moderate_weather");
    expect(result.verdictText).toContain("MODERATE WEATHER DETECTED");
  });

  it("returns no_significant_weather for calm conditions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            makeApiResponse({
              preciptype: null,
              events: [],
              windgust: 15,
              severerisk: 5,
              conditions: "Clear",
              hours: [
                {
                  datetime: "12:00:00",
                  temp: 72,
                  windspeed: 8,
                  windgust: 15,
                  precip: 0,
                  preciptype: null,
                  snow: 0,
                  humidity: 40,
                  pressure: 1018,
                  cloudcover: 10,
                  visibility: 10,
                  conditions: "Clear",
                  severerisk: 3,
                },
              ],
            })
          ),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.verdict).toBe("no_significant_weather");
    expect(result.verdictText).toContain("No significant");
  });

  it("throws on 400 (bad address)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      })
    );

    await expect(
      fetchWeatherData("invalid-addr", "2024-01-15")
    ).rejects.toThrow("Invalid address or date");
  });

  it("throws on 401 (bad API key)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      })
    );

    await expect(
      fetchWeatherData("addr", "2024-01-15")
    ).rejects.toThrow("Invalid API key");
  });

  it("includes fetchedAt timestamp", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeApiResponse()),
      })
    );

    const result = await fetchWeatherData("addr", "2024-01-15");
    expect(result.fetchedAt).toBeTruthy();
    // Should be a valid ISO date
    expect(new Date(result.fetchedAt).getTime()).toBeGreaterThan(0);
  });
});
