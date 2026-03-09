/**
 * NOAA/SPC Local Storm Reports via Iowa Environmental Mesonet (IEM) API
 *
 * Fetches verified storm reports (hail, wind, tornado) near a property for a
 * given date of loss. These reports come from trained spotters, NWS employees,
 * and public submissions — they are official NOAA local storm reports (LSRs).
 *
 * Storm reports provide ground-truth evidence of severe weather at or near the
 * property, complementing weather station data from Visual Crossing and NWS
 * alerts. A hail report 3 miles away is much stronger evidence than a weather
 * station 25 miles away showing no hail.
 *
 * API: https://mesonet.agron.iastate.edu/cgi-bin/request/gis/lsr.py
 * Format: CSV (query by WFO office, then filter by distance)
 */

import { withRetry } from "@/lib/ai/retry";

/* ─────── Types ─────── */

export interface StormReport {
  type: "HAIL" | "TSTM_WND" | "TORNADO" | "FLOOD" | "OTHER";
  typeText: string; // original TYPETEXT from CSV
  magnitude: number | null;
  unit: "inch" | "mph" | null;
  city: string;
  county: string;
  state: string;
  distanceMiles: number;
  timestamp: string; // ISO
  narrative: string;
  source: string;
  lat: number;
  lon: number;
}

export interface StormReportData {
  reports: StormReport[];
  hailReports: StormReport[];
  windReports: StormReport[];
  tornadoReports: StormReport[];
  maxHailSize: number | null; // within 25 miles
  maxWindSpeed: number | null; // within 25 miles
  nearestHailReport: StormReport | null;
  nearestWindReport: StormReport | null;
  totalReportsNearby: number; // within 25 miles
  searchRadiusMiles: number;
  wfoCode: string;
  fetchedAt: string;
}

/* ─────── Constants ─────── */

const IEM_BASE = "https://mesonet.agron.iastate.edu/cgi-bin/request/gis/lsr.py";
const NWS_POINTS_BASE = "https://api.weather.gov/points";
const USER_AGENT = "4Margin-SupplementEngine/1.0 (support@4margin.com)";

const SEARCH_RADIUS_MILES = 50;
const NEARBY_RADIUS_MILES = 25;

/**
 * Fallback WFO codes by state — used when NWS Points API fails.
 * Maps to the primary WFO that covers the most populated areas in each state.
 */
const STATE_WFO_FALLBACK: Record<string, string> = {
  MD: "LWX",
  DC: "LWX",
  VA: "LWX",
  PA: "PHI",
  DE: "PHI",
};

/* ─────── Helpers ─────── */

/** Haversine distance between two lat/lon points in miles */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Map IEM TYPECODE to our normalized storm type.
 * H = Hail, G = Thunderstorm Wind Gust, D = Thunderstorm Wind Damage,
 * T = Tornado, F = Flash Flood / Flood
 */
function mapTypeCode(
  typeCode: string
): "HAIL" | "TSTM_WND" | "TORNADO" | "FLOOD" | "OTHER" {
  switch (typeCode.trim().toUpperCase()) {
    case "H":
      return "HAIL";
    case "G":
    case "D":
      return "TSTM_WND";
    case "T":
      return "TORNADO";
    case "F":
      return "FLOOD";
    default:
      return "OTHER";
  }
}

/**
 * Determine the unit for magnitude based on typecode.
 * H (hail) → inches, G (gust) → mph, D (damage) → null (no measurement)
 */
function mapUnit(typeCode: string): "inch" | "mph" | null {
  switch (typeCode.trim().toUpperCase()) {
    case "H":
      return "inch";
    case "G":
      return "mph";
    default:
      return null;
  }
}

/**
 * Parse IEM VALID timestamp (format: "YYYYMMDDHHmm") to ISO string.
 * Example: "202404151825" → "2024-04-15T18:25:00Z"
 */
function parseIemTimestamp(raw: string): string {
  if (!raw || raw.length < 12) return "";
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.slice(8, 10);
  const minute = raw.slice(10, 12);
  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

/**
 * Parse a single CSV row into fields, handling the REMARK field which may
 * contain commas. The CSV has 16 known columns:
 *
 * 0: VALID, 1: VALID2, 2: LAT, 3: LON, 4: MAG, 5: WFO, 6: TYPECODE,
 * 7: TYPETEXT, 8: CITY, 9: COUNTY, 10: STATE, 11: SOURCE, 12: REMARK,
 * 13: UGC, 14: UGCNAME, 15: QUALIFIER
 *
 * Since REMARK (index 12) may contain commas, we split into at most 16 parts
 * but then rejoin everything from index 12 to (length-3) as the remark — the
 * last 3 fields (UGC, UGCNAME, QUALIFIER) are always single-value.
 */
function parseCsvRow(line: string): string[] {
  const parts = line.split(",");
  if (parts.length <= 16) return parts;

  // More than 16 fields means the REMARK contained commas.
  // Fields 0-11 are before REMARK, and the last 3 fields are UGC, UGCNAME, QUALIFIER.
  const before = parts.slice(0, 12);
  const after = parts.slice(-3);
  const remark = parts.slice(12, parts.length - 3).join(",");
  return [...before, remark, ...after];
}

/* ─────── Empty Data ─────── */

/** Return an empty StormReportData — used when API calls fail or no data */
export function emptyStormReportData(): StormReportData {
  return {
    reports: [],
    hailReports: [],
    windReports: [],
    tornadoReports: [],
    maxHailSize: null,
    maxWindSpeed: null,
    nearestHailReport: null,
    nearestWindReport: null,
    totalReportsNearby: 0,
    searchRadiusMiles: SEARCH_RADIUS_MILES,
    wfoCode: "",
    fetchedAt: new Date().toISOString(),
  };
}

/* ─────── WFO Lookup ─────── */

/**
 * Resolve the WFO (Weather Forecast Office) code for a lat/lon using the
 * NWS Points API. Falls back to a state-based lookup if the API fails.
 */
async function resolveWfoCode(
  lat: number,
  lon: number
): Promise<string> {
  try {
    const res = await withRetry(
      async () => {
        const r = await fetch(
          `${NWS_POINTS_BASE}/${lat.toFixed(4)},${lon.toFixed(4)}`,
          { headers: { "User-Agent": USER_AGENT } }
        );
        if (!r.ok) {
          throw new Error(`NWS Points API: ${r.status} ${r.statusText}`);
        }
        return r.json();
      },
      { maxRetries: 2, baseDelayMs: 500, label: "NWS Points API (WFO lookup)" }
    );

    const cwa = res?.properties?.cwa;
    if (cwa && typeof cwa === "string") return cwa;
  } catch (err) {
    console.warn("[storm-reports] NWS Points API failed, using state fallback:", err);
  }

  // Fallback: reverse-geocode to approximate state from lon
  // Very rough: lon < -77 and > -80 → PA, lon > -76 → DE, otherwise MD/DC/VA area
  // This is a last resort — the NWS API almost always works
  return STATE_WFO_FALLBACK["MD"] || "LWX";
}

/* ─────── IEM CSV Fetch ─────── */

/**
 * Fetch local storm reports from the IEM API for a WFO office and date range.
 * Returns the raw CSV text.
 */
async function fetchIemCsv(
  wfoCode: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<string> {
  // IEM expects timestamps in format: YYYY-MM-DDT00:00Z
  const url =
    `${IEM_BASE}?fmt=csv&wfo=${wfoCode}` +
    `&sts=${startDate}T00:00Z&ets=${endDate}T23:59Z`;

  const res = await withRetry(
    async () => {
      const r = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!r.ok) {
        throw new Error(`IEM LSR API: ${r.status} ${r.statusText}`);
      }
      return r.text();
    },
    { maxRetries: 2, baseDelayMs: 1000, label: "IEM Local Storm Reports" }
  );

  return res;
}

/* ─────── CSV Parsing ─────── */

/**
 * Parse IEM CSV text into StormReport objects, computing distance from
 * the property and filtering to within the search radius.
 */
function parseCsvToReports(
  csv: string,
  propertyLat: number,
  propertyLon: number
): StormReport[] {
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return []; // header only or empty

  // Skip header row
  const dataLines = lines.slice(1);
  const reports: StormReport[] = [];

  for (const line of dataLines) {
    try {
      const fields = parseCsvRow(line);
      if (fields.length < 13) continue;

      const validRaw = fields[0]?.trim();
      const lat = parseFloat(fields[2]?.trim());
      const lon = parseFloat(fields[3]?.trim());
      const magRaw = fields[4]?.trim();
      const typeCode = fields[6]?.trim();
      const typeText = fields[7]?.trim();
      const city = fields[8]?.trim();
      const county = fields[9]?.trim();
      const state = fields[10]?.trim();
      const source = fields[11]?.trim();
      const remark = fields[12]?.trim();

      if (isNaN(lat) || isNaN(lon)) continue;

      const distance = haversineDistance(propertyLat, propertyLon, lat, lon);
      if (distance > SEARCH_RADIUS_MILES) continue;

      const magnitude =
        magRaw && magRaw !== "None" && magRaw !== "" ? parseFloat(magRaw) : null;
      const type = mapTypeCode(typeCode);
      const unit = magnitude !== null ? mapUnit(typeCode) : null;
      const timestamp = parseIemTimestamp(validRaw);

      reports.push({
        type,
        typeText: typeText || "",
        magnitude: magnitude !== null && !isNaN(magnitude) ? magnitude : null,
        unit,
        city: city || "",
        county: county || "",
        state: state || "",
        distanceMiles: Math.round(distance * 10) / 10, // 1 decimal place
        timestamp,
        narrative: remark || "",
        source: source || "",
        lat,
        lon,
      });
    } catch {
      // Skip malformed rows
      continue;
    }
  }

  // Sort by distance (closest first)
  reports.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return reports;
}

/* ─────── Date Expansion ─────── */

/**
 * Expand a date of loss by +/- 1 day to capture storms that span midnight.
 * Returns [startDate, endDate] in YYYY-MM-DD format.
 */
function expandDateRange(dateOfLoss: string): [string, string] {
  const date = new Date(dateOfLoss + "T12:00:00Z"); // noon UTC to avoid DST edge cases
  const dayBefore = new Date(date);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const dayAfter = new Date(date);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [fmt(dayBefore), fmt(dayAfter)];
}

/* ─────── Main Function ─────── */

/**
 * Fetch NOAA/SPC Local Storm Reports near a property for a date of loss.
 *
 * 1. Resolves WFO code for the property lat/lon via NWS Points API
 * 2. Queries IEM for local storm reports from that WFO (date +/- 1 day)
 * 3. Parses CSV and computes haversine distance to property
 * 4. Filters to within 50 miles, sorted by distance
 * 5. Computes summary fields (max hail/wind within 25 miles, nearest reports)
 *
 * Never throws — returns empty data on failure.
 *
 * @param lat - Property latitude
 * @param lon - Property longitude
 * @param dateOfLoss - Date in YYYY-MM-DD format
 */
export async function fetchStormReports(
  lat: number,
  lon: number,
  dateOfLoss: string
): Promise<StormReportData> {
  try {
    // 1. Resolve WFO code
    const wfoCode = await resolveWfoCode(lat, lon);
    if (!wfoCode) {
      console.warn("[storm-reports] Could not resolve WFO code");
      return emptyStormReportData();
    }

    // 2. Expand date range (day before → day after)
    const [startDate, endDate] = expandDateRange(dateOfLoss);

    // 3. Fetch CSV from IEM
    let csv: string;
    try {
      csv = await fetchIemCsv(wfoCode, startDate, endDate);
    } catch (err) {
      console.warn("[storm-reports] IEM API fetch failed:", err);
      return { ...emptyStormReportData(), wfoCode };
    }

    // 4. Parse CSV → StormReport[] (filtered to 50mi, sorted by distance)
    const reports = parseCsvToReports(csv, lat, lon);

    // 5. Categorize
    const hailReports = reports.filter((r) => r.type === "HAIL");
    const windReports = reports.filter((r) => r.type === "TSTM_WND");
    const tornadoReports = reports.filter((r) => r.type === "TORNADO");

    // 6. Summary fields (within 25-mile "nearby" radius)
    const nearbyReports = reports.filter(
      (r) => r.distanceMiles <= NEARBY_RADIUS_MILES
    );
    const nearbyHail = hailReports.filter(
      (r) => r.distanceMiles <= NEARBY_RADIUS_MILES
    );
    const nearbyWind = windReports.filter(
      (r) => r.distanceMiles <= NEARBY_RADIUS_MILES
    );

    const maxHailSize =
      nearbyHail.length > 0
        ? Math.max(
            ...nearbyHail
              .map((r) => r.magnitude)
              .filter((m): m is number => m !== null)
          ) || null
        : null;

    const maxWindSpeed =
      nearbyWind.length > 0
        ? Math.max(
            ...nearbyWind
              .map((r) => r.magnitude)
              .filter((m): m is number => m !== null)
          ) || null
        : null;

    // Nearest reports (already sorted by distance, so first match is nearest)
    const nearestHailReport = hailReports.length > 0 ? hailReports[0] : null;
    const nearestWindReport = windReports.length > 0 ? windReports[0] : null;

    return {
      reports,
      hailReports,
      windReports,
      tornadoReports,
      maxHailSize,
      maxWindSpeed,
      nearestHailReport,
      nearestWindReport,
      totalReportsNearby: nearbyReports.length,
      searchRadiusMiles: SEARCH_RADIUS_MILES,
      wfoCode,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[storm-reports] Unexpected error:", err);
    return emptyStormReportData();
  }
}
