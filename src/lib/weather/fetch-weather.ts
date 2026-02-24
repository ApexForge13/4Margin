/**
 * Visual Crossing Weather API Client
 *
 * Fetches historical weather data for a property address + date of loss.
 * Computes derived fields (max gusts, hail detection, storm window, verdict)
 * to support roofing insurance supplement claims.
 *
 * API docs: https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
 */

import { withRetry } from "@/lib/ai/retry";

/* ─────── Types ─────── */

export interface HourlyWeather {
  datetime: string; // "HH:mm:ss"
  temp: number;
  windspeed: number;
  windgust: number | null;
  precip: number;
  preciptype: string[] | null; // ["rain", "hail", "freezingrain", etc.]
  snow: number;
  humidity: number;
  pressure: number;
  cloudcover: number;
  visibility: number;
  conditions: string;
  severerisk: number;
}

export interface WeatherEvent {
  datetime: string;
  datetimeEpoch: number;
  type: string; // "hail", "tornado", "wind", etc.
  description: string;
  size?: number; // hail size in inches
  speed?: number; // wind speed in mph
}

export type WeatherVerdict =
  | "severe_confirmed"
  | "moderate_weather"
  | "no_significant_weather";

export interface WeatherData {
  // Location resolved by API
  address: string;
  resolvedAddress: string;
  latitude: number;
  longitude: number;

  // Date
  date: string; // YYYY-MM-DD

  // Daily summary
  tempmax: number;
  tempmin: number;
  temp: number;
  windspeed: number;
  windgust: number | null;
  precip: number;
  preciptype: string[] | null;
  snow: number;
  conditions: string;
  description: string;
  humidity: number;
  pressure: number;
  cloudcover: number;
  visibility: number;
  severerisk: number;

  // Hourly data
  hours: HourlyWeather[];

  // Storm events (hail, tornado, wind damage)
  events: WeatherEvent[];

  // ── Computed fields (added by our code) ──
  maxWindGust: number;
  hailDetected: boolean;
  hailSizeMax: number | null; // inches
  stormWindow: HourlyWeather[]; // hours with severe risk > 30 or gusts > 40
  verdict: WeatherVerdict;
  verdictText: string;
  fetchedAt: string; // ISO timestamp
}

/* ─────── API Client ─────── */

const API_BASE =
  "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";

const ELEMENTS = [
  "datetime",
  "tempmax",
  "tempmin",
  "temp",
  "windspeed",
  "windgust",
  "precip",
  "preciptype",
  "snow",
  "conditions",
  "description",
  "humidity",
  "pressure",
  "cloudcover",
  "visibility",
  "severerisk",
].join(",");

/**
 * Fetch historical weather data from Visual Crossing for a given address + date.
 *
 * @param address - Full property address (e.g. "123 Main St, Plano, TX 75024")
 * @param dateOfLoss - Date in YYYY-MM-DD format
 * @returns Parsed and enriched WeatherData
 * @throws Error if API key missing, address invalid, or API unreachable after retries
 */
export async function fetchWeatherData(
  address: string,
  dateOfLoss: string
): Promise<WeatherData> {
  const apiKey = process.env.VISUAL_CROSSING_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VISUAL_CROSSING_API_KEY is not configured. Add it to .env.local to enable weather verification."
    );
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `${API_BASE}/${encodedAddress}/${dateOfLoss}?key=${apiKey}&include=hours,events&elements=${ELEMENTS}&unitGroup=us`;

  const response = await withRetry(
    async () => {
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(
            `Weather API: Invalid address or date — "${address}" on ${dateOfLoss}`
          );
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("Weather API: Invalid API key");
        }
        // 429 and 5xx are retryable — throw with status code so withRetry catches them
        throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    { maxRetries: 2, baseDelayMs: 1000, label: "Visual Crossing Weather API" }
  );

  return parseWeatherResponse(response, dateOfLoss);
}

/* ─────── Response Parsing ─────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWeatherResponse(raw: any, dateOfLoss: string): WeatherData {
  const day = raw.days?.[0];
  if (!day) {
    throw new Error(`No weather data returned for date ${dateOfLoss}`);
  }

  // Parse hourly data
  const hours: HourlyWeather[] = (day.hours || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (h: any) => ({
      datetime: h.datetime || "",
      temp: h.temp ?? 0,
      windspeed: h.windspeed ?? 0,
      windgust: h.windgust ?? null,
      precip: h.precip ?? 0,
      preciptype: h.preciptype ?? null,
      snow: h.snow ?? 0,
      humidity: h.humidity ?? 0,
      pressure: h.pressure ?? 0,
      cloudcover: h.cloudcover ?? 0,
      visibility: h.visibility ?? 0,
      conditions: h.conditions || "",
      severerisk: h.severerisk ?? 0,
    })
  );

  // Parse events
  const events: WeatherEvent[] = (day.events || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => ({
      datetime: e.datetime || "",
      datetimeEpoch: e.datetimeEpoch ?? 0,
      type: e.type || "unknown",
      description: e.description || "",
      size: e.size ?? undefined,
      speed: e.speed ?? undefined,
    })
  );

  // ── Compute derived fields ──

  // Max wind gust across all hours
  const maxWindGust = Math.max(
    day.windgust ?? 0,
    ...hours.map((h) => h.windgust ?? 0)
  );

  // Hail detection: check hourly preciptype AND events
  const hailInHours = hours.some(
    (h) => h.preciptype?.includes("hail") ?? false
  );
  const hailInEvents = events.some(
    (e) => e.type.toLowerCase().includes("hail")
  );
  const hailDetected = hailInHours || hailInEvents;

  // Max hail size from events
  const hailEvents = events.filter((e) =>
    e.type.toLowerCase().includes("hail")
  );
  const hailSizeMax =
    hailEvents.length > 0
      ? Math.max(...hailEvents.map((e) => e.size ?? 0)) || null
      : null;

  // Storm window: hours with elevated conditions
  const stormWindow = hours.filter(
    (h) =>
      h.severerisk > 30 ||
      (h.windgust ?? 0) > 40 ||
      (h.preciptype?.includes("hail") ?? false)
  );

  // Verdict
  const { verdict, verdictText } = computeVerdict({
    hailDetected,
    hailSizeMax,
    maxWindGust,
    severerisk: day.severerisk ?? 0,
    conditions: day.conditions || "",
    dateOfLoss,
  });

  return {
    address: raw.address || "",
    resolvedAddress: raw.resolvedAddress || "",
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    date: dateOfLoss,
    tempmax: day.tempmax ?? 0,
    tempmin: day.tempmin ?? 0,
    temp: day.temp ?? 0,
    windspeed: day.windspeed ?? 0,
    windgust: day.windgust ?? null,
    precip: day.precip ?? 0,
    preciptype: day.preciptype ?? null,
    snow: day.snow ?? 0,
    conditions: day.conditions || "",
    description: day.description || "",
    humidity: day.humidity ?? 0,
    pressure: day.pressure ?? 0,
    cloudcover: day.cloudcover ?? 0,
    visibility: day.visibility ?? 0,
    severerisk: day.severerisk ?? 0,
    hours,
    events,
    maxWindGust,
    hailDetected,
    hailSizeMax,
    stormWindow,
    verdict,
    verdictText,
    fetchedAt: new Date().toISOString(),
  };
}

/* ─────── Verdict Logic ─────── */

function computeVerdict(input: {
  hailDetected: boolean;
  hailSizeMax: number | null;
  maxWindGust: number;
  severerisk: number;
  conditions: string;
  dateOfLoss: string;
}): { verdict: WeatherVerdict; verdictText: string } {
  const { hailDetected, hailSizeMax, maxWindGust, severerisk } = input;

  // SEVERE: hail detected, or wind gusts ≥ 58 mph (NWS severe threshold), or severe risk > 50
  if (hailDetected || maxWindGust >= 58 || severerisk > 50) {
    const parts: string[] = [];

    if (hailDetected) {
      parts.push(
        hailSizeMax
          ? `hail up to ${hailSizeMax}" in diameter`
          : "hail activity"
      );
    }
    if (maxWindGust >= 58) {
      parts.push(`wind gusts of ${Math.round(maxWindGust)} mph`);
    }
    if (severerisk > 50 && !hailDetected && maxWindGust < 58) {
      parts.push(`elevated severe weather risk index (${Math.round(severerisk)}/100)`);
    }

    return {
      verdict: "severe_confirmed",
      verdictText: `SEVERE WEATHER CONFIRMED — Historical weather records show ${parts.join(" and ")} at this location on the date of loss (${input.dateOfLoss}). These conditions are consistent with the reported property damage.`,
    };
  }

  // MODERATE: wind gusts 40-58 mph, or severe risk 30-50
  if (maxWindGust >= 40 || severerisk > 30) {
    const parts: string[] = [];
    if (maxWindGust >= 40) {
      parts.push(`wind gusts up to ${Math.round(maxWindGust)} mph`);
    }
    if (severerisk > 30) {
      parts.push(`moderate severe weather risk (${Math.round(severerisk)}/100)`);
    }

    return {
      verdict: "moderate_weather",
      verdictText: `MODERATE WEATHER DETECTED — Weather records indicate ${parts.join(" and ")} at this location on the date of loss (${input.dateOfLoss}). These conditions may have contributed to property damage.`,
    };
  }

  // NO SIGNIFICANT WEATHER
  return {
    verdict: "no_significant_weather",
    verdictText: `No significant severe weather events were recorded at this location on the date of loss (${input.dateOfLoss}). Wind gusts reached ${Math.round(maxWindGust)} mph with a severe risk index of ${Math.round(severerisk)}/100.`,
  };
}
