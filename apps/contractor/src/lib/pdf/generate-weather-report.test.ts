import { describe, it, expect } from "vitest";
import {
  generateWeatherReportPdf,
  type WeatherReportPdfData,
} from "./generate-weather-report";
import type { WeatherData } from "@/lib/weather/fetch-weather";

function makeWeatherData(overrides: Partial<WeatherData> = {}): WeatherData {
  return {
    address: "123 Main St, Plano, TX 75024",
    resolvedAddress: "123 Main St, Plano, TX 75024, US",
    latitude: 33.0198,
    longitude: -96.6989,
    date: "2024-01-15",
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
    maxWindGust: 65,
    hailDetected: true,
    hailSizeMax: 1.75,
    stormWindow: [
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
    ],
    verdict: "severe_confirmed",
    verdictText:
      'SEVERE WEATHER CONFIRMED — Historical weather records show hail up to 1.75" in diameter and wind gusts of 65 mph at this location on the date of loss.',
    nwsAlerts: [],
    nwsAlertUsed: false,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePdfData(
  weatherOverrides: Partial<WeatherData> = {}
): WeatherReportPdfData {
  return {
    propertyAddress: "123 Main St, Plano, TX 75024",
    dateOfLoss: "January 15, 2024",
    claimNumber: "CLM-2024-0042",
    companyName: "Acme Roofing LLC",
    weather: makeWeatherData(weatherOverrides),
    generatedDate: "February 23, 2026",
  };
}

describe("generateWeatherReportPdf", () => {
  it("generates a valid PDF ArrayBuffer", () => {
    const result = generateWeatherReportPdf(makePdfData());
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("PDF starts with %PDF magic bytes", () => {
    const result = generateWeatherReportPdf(makePdfData());
    const bytes = new Uint8Array(result);
    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    expect(header).toBe("%PDF");
  });

  it("handles no events gracefully", () => {
    const result = generateWeatherReportPdf(
      makePdfData({ events: [] })
    );
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("handles empty hours array", () => {
    const result = generateWeatherReportPdf(
      makePdfData({ hours: [], stormWindow: [] })
    );
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("handles no hail (moderate weather)", () => {
    const result = generateWeatherReportPdf(
      makePdfData({
        hailDetected: false,
        hailSizeMax: null,
        verdict: "moderate_weather",
        verdictText: "MODERATE WEATHER DETECTED — winds up to 48 mph.",
        events: [],
        preciptype: ["rain"],
      })
    );
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("handles calm weather (no significant)", () => {
    const result = generateWeatherReportPdf(
      makePdfData({
        hailDetected: false,
        hailSizeMax: null,
        maxWindGust: 12,
        windgust: 12,
        severerisk: 3,
        verdict: "no_significant_weather",
        verdictText: "No significant severe weather events recorded.",
        events: [],
        stormWindow: [],
        preciptype: null,
        conditions: "Clear",
      })
    );
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("produces larger PDF for severe weather with many events", () => {
    const manyEvents = Array.from({ length: 5 }, (_, i) => ({
      datetime: `${14 + i}:00:00`,
      datetimeEpoch: 1705330800 + i * 3600,
      type: i % 2 === 0 ? "hail" : "wind",
      description: `Storm event ${i + 1}`,
      size: i % 2 === 0 ? 1.0 + i * 0.25 : undefined,
      speed: i % 2 !== 0 ? 60 + i * 5 : undefined,
    }));

    const manyHours = Array.from({ length: 12 }, (_, i) => ({
      datetime: `${8 + i}:00:00`,
      temp: 40 + i,
      windspeed: 20 + i * 3,
      windgust: 30 + i * 5,
      precip: i > 4 ? 0.3 : 0,
      preciptype: i > 6 ? (["rain", "hail"] as string[]) : null,
      snow: 0,
      humidity: 70 + i,
      pressure: 1010 - i,
      cloudcover: 50 + i * 4,
      visibility: 10 - i * 0.5,
      conditions: i > 6 ? "Thunderstorms" : "Cloudy",
      severerisk: i > 5 ? 60 + i * 3 : 10,
    }));

    const smallResult = generateWeatherReportPdf(
      makePdfData({ events: [], hours: [], stormWindow: [] })
    );
    const largeResult = generateWeatherReportPdf(
      makePdfData({ events: manyEvents, hours: manyHours, stormWindow: manyHours })
    );

    expect(largeResult.byteLength).toBeGreaterThan(smallResult.byteLength);
  });
});
