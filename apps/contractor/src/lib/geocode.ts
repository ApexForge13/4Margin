/**
 * US Census Geocoder Integration
 *
 * Uses the free Census Bureau Geocoder API to resolve
 * full street addresses to county + FIPS code.
 *
 * API docs: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
 *
 * Why not ZIP-only? ZIP codes don't follow county boundaries.
 * A single ZIP can span multiple counties, so full-address
 * geocoding is the only reliable way to determine county.
 */

export interface GeocodeResult {
  /** Matched street address from Census */
  matchedAddress: string;
  /** County name (e.g. "Baltimore") — without "County" suffix */
  county: string;
  /** Full county name as returned by Census (e.g. "Baltimore County") */
  countyFull: string;
  /** 2-letter state abbreviation (e.g. "MD") */
  state: string;
  /** 5-digit county FIPS code (e.g. "24005") */
  fipsCode: string;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
}

export interface GeocodeError {
  error: string;
  /** If true, the API was unreachable — caller should fall back to ZIP lookup */
  isNetworkError: boolean;
}

export type GeocodeResponse =
  | { success: true; data: GeocodeResult }
  | { success: false; error: string; isNetworkError: boolean };

const CENSUS_GEOCODER_URL =
  "https://geocoding.geo.census.gov/geocoder/geographies/address";

/** Timeout for Census API calls (8 seconds — it can be slow) */
const GEOCODE_TIMEOUT_MS = 8_000;

/**
 * Geocode a full street address using the US Census Bureau Geocoder.
 *
 * Returns the county, FIPS code, and coordinates for the matched address.
 * Falls back gracefully on network errors so callers can use ZIP lookup.
 *
 * @param street  Street address (e.g. "123 Main St")
 * @param city    City name (e.g. "Monkton")
 * @param state   2-letter state code (e.g. "MD")
 * @param zip     5-digit ZIP code (optional but improves accuracy)
 */
export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zip?: string
): Promise<GeocodeResponse> {
  if (!street?.trim() || !city?.trim() || !state?.trim()) {
    return {
      success: false,
      error: "Street, city, and state are required for geocoding.",
      isNetworkError: false,
    };
  }

  const params = new URLSearchParams({
    street: street.trim(),
    city: city.trim(),
    state: state.trim().toUpperCase(),
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });

  if (zip?.trim()) {
    params.set("zip", zip.trim().slice(0, 5));
  }

  const url = `${CENSUS_GEOCODER_URL}?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Census API returned ${response.status}`,
        isNetworkError: true,
      };
    }

    const json = await response.json();

    // Census API response structure:
    // result.addressMatches[0].geographies.Counties[0]
    const matches = json?.result?.addressMatches;

    if (!matches || matches.length === 0) {
      return {
        success: false,
        error: "No address match found. Please verify the address.",
        isNetworkError: false,
      };
    }

    const match = matches[0];
    const coordinates = match.coordinates;
    const matchedAddress: string = match.matchedAddress || "";

    // Extract county from geographies
    const counties = match.geographies?.Counties;
    if (!counties || counties.length === 0) {
      return {
        success: false,
        error: "Address matched but county data unavailable.",
        isNetworkError: false,
      };
    }

    const countyGeo = counties[0];
    const countyBaseName: string = countyGeo.BASENAME || "";
    const countyFullWithSuffix: string = countyGeo.NAME || countyGeo.BASENAME || "";
    const geoid: string = countyGeo.GEOID || "";
    const stateCode: string = countyGeo.STATE || "";

    // BASENAME is usually "Baltimore" (without "County" suffix)
    // NAME is "Baltimore County" — use NAME for countyFull so it matches our jurisdiction data
    const countyName = (countyBaseName || countyFullWithSuffix)
      .replace(/\s+(County|Parish|Borough|Census Area|Municipality|City and Borough)$/i, "")
      .trim();

    // Build the 5-digit FIPS code (2-digit state + 3-digit county)
    const fipsCode = geoid.padStart(5, "0");

    // Map state FIPS to abbreviation
    const stateAbbr = stateCode
      ? STATE_FIPS_TO_ABBR[stateCode] || state.trim().toUpperCase()
      : state.trim().toUpperCase();

    return {
      success: true,
      data: {
        matchedAddress,
        county: countyName,
        countyFull: countyFullWithSuffix,
        state: stateAbbr,
        fipsCode,
        lat: coordinates?.y || 0,
        lon: coordinates?.x || 0,
      },
    };
  } catch (err) {
    // AbortError = timeout, TypeError = network failure
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    const message = isTimeout
      ? "Census geocoder timed out — using ZIP code lookup instead."
      : `Census geocoder unavailable: ${err instanceof Error ? err.message : "unknown error"}`;

    return {
      success: false,
      error: message,
      isNetworkError: true,
    };
  }
}

/**
 * State FIPS codes → 2-letter abbreviations.
 * Only includes states in our coverage area + common nearby states.
 */
const STATE_FIPS_TO_ABBR: Record<string, string> = {
  "10": "DE",
  "11": "DC",
  "24": "MD",
  "34": "NJ",
  "36": "NY",
  "42": "PA",
  "51": "VA",
  "54": "WV",
  // Add more as coverage expands
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS",
  "21": "KY", "22": "LA", "23": "ME", "25": "MA", "26": "MI",
  "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "35": "NM", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "44": "RI", "45": "SC",
  "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT",
  "53": "WA", "55": "WI", "56": "WY",
};
