import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { resolveCountyByName } from "@/data/county-jurisdictions";
import type { CountyJurisdiction } from "@/data/county-jurisdictions";

/**
 * POST /api/geocode
 *
 * Geocodes a full street address using the US Census Bureau Geocoder
 * and returns county jurisdiction data (climate zone, code requirements, etc.)
 *
 * Body: { street, city, state, zip? }
 * Returns: { county, countyJurisdiction?, matchedAddress, fipsCode }
 */
export async function POST(req: NextRequest) {
  // ── Auth check ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──
  let body: { street?: string; city?: string; state?: string; zip?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { street, city, state, zip } = body;

  if (!street?.trim() || !city?.trim() || !state?.trim()) {
    return NextResponse.json(
      { error: "street, city, and state are required" },
      { status: 400 }
    );
  }

  // ── Call Census Geocoder ──
  const result = await geocodeAddress(street, city, state, zip);

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error,
        isNetworkError: result.isNetworkError,
      },
      { status: result.isNetworkError ? 503 : 422 }
    );
  }

  // ── Match to our county jurisdiction data ──
  const { county, state: resolvedState, fipsCode, matchedAddress } = result.data;

  let countyJurisdiction: CountyJurisdiction | null = null;

  // Try to match against our local jurisdiction database (MD/PA/DE)
  if (resolvedState === "MD" || resolvedState === "PA" || resolvedState === "DE") {
    countyJurisdiction = resolveCountyByName(result.data.countyFull || county, resolvedState) || null;
  }

  return NextResponse.json({
    county: result.data.county,
    countyFull: result.data.countyFull,
    state: result.data.state,
    fipsCode,
    matchedAddress,
    lat: result.data.lat,
    lon: result.data.lon,
    // Full jurisdiction data if we have it (climate zone, code requirements, permits, etc.)
    countyJurisdiction,
  });
}
