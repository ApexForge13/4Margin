/**
 * Seed script: populates kb_counties, kb_building_codes, kb_code_jurisdictions,
 * and kb_zip_to_county from the existing TypeScript static data.
 *
 * Usage:
 *   npx tsx apps/contractor/supabase/seed-knowledge-base.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env from contractor app .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import {
  MD_COUNTIES,
  PA_COUNTIES,
  DE_COUNTIES,
  ZIP_TO_COUNTY,
} from "../src/data/county-jurisdictions";
import { BUILDING_CODES } from "../src/data/building-codes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function seedCounties() {
  const allCounties = [...MD_COUNTIES, ...PA_COUNTIES, ...DE_COUNTIES];
  console.log(`Seeding ${allCounties.length} counties...`);

  for (const c of allCounties) {
    const row = {
      county: c.county,
      state: c.state,
      climate_zone: c.climateZone,
      design_wind_speed: c.designWindSpeed,
      high_wind_zone: c.highWindZone,
      ice_barrier_requirement: c.iceBarrierRequirement,
      permit_required: c.permit.required,
      permit_fee_range: c.permit.typicalFeeRange,
      ahj_name: c.permit.ahjName,
      ahj_phone: c.permit.ahjPhone,
      ahj_url: c.permit.ahjUrl,
      permit_notes: c.permit.notes,
      local_amendments: c.localAmendments,
      fips_code: c.fipsCode,
    };

    const { error } = await supabase.from("kb_counties").upsert(row, {
      onConflict: "county,state",
    });

    if (error) {
      console.error(`  Error inserting county ${c.county}, ${c.state}:`, error.message);
    }
  }
  console.log("  Counties seeded.");
}

async function seedBuildingCodes() {
  console.log(`Seeding ${BUILDING_CODES.length} building codes...`);

  for (const code of BUILDING_CODES) {
    // Upsert the building code itself
    const codeRow = {
      id: code.id,
      section: code.section,
      title: code.title,
      requirement: code.requirement,
      justification_text: code.justificationText,
      category: code.category,
      xactimate_codes: code.xactimateCodes,
      carrier_objection_rate: code.carrierObjectionRate,
      typical_objection: code.typicalObjection,
      rebuttal: code.rebuttal,
    };

    const { error: codeError } = await supabase
      .from("kb_building_codes")
      .upsert(codeRow, { onConflict: "id" });

    if (codeError) {
      console.error(`  Error inserting code ${code.id}:`, codeError.message);
      continue;
    }

    // Upsert jurisdiction entries
    for (const j of code.jurisdictions) {
      const jRow = {
        code_id: code.id,
        state: j.state,
        irc_edition: j.ircEdition,
        has_amendment: j.hasAmendment,
        amendment_note: j.amendmentNote,
        source_ref: j.sourceRef,
        source_urls: [] as string[],
      };

      const { error: jError } = await supabase
        .from("kb_code_jurisdictions")
        .upsert(jRow, { onConflict: "code_id,state" });

      if (jError) {
        console.error(
          `  Error inserting jurisdiction ${code.id}/${j.state}:`,
          jError.message
        );
      }
    }
  }
  console.log("  Building codes seeded.");
}

async function seedZipToCounty() {
  const entries = Object.entries(ZIP_TO_COUNTY);
  console.log(`Seeding ${entries.length} ZIP-to-county mappings...`);

  // Fetch all counties to build county_id lookup
  const { data: counties, error: fetchError } = await supabase
    .from("kb_counties")
    .select("id, county, state");

  if (fetchError || !counties) {
    console.error("  Error fetching counties for FK lookup:", fetchError?.message);
    return;
  }

  const countyLookup = new Map<string, string>();
  for (const c of counties) {
    countyLookup.set(`${c.county}|${c.state}`, c.id);
  }

  // Batch in groups of 100 for performance
  const batchSize = 100;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize).map(([zip, info]) => ({
      zip,
      county: info.county,
      state: info.state,
      county_id: countyLookup.get(`${info.county}|${info.state}`) ?? null,
    }));

    const { error } = await supabase
      .from("kb_zip_to_county")
      .upsert(batch, { onConflict: "zip" });

    if (error) {
      console.error(
        `  Error inserting ZIP batch ${i}-${i + batchSize}:`,
        error.message
      );
    }
  }
  console.log("  ZIP-to-county mappings seeded.");
}

async function main() {
  console.log("=== Knowledge Base Seed Script ===\n");

  await seedCounties();
  await seedBuildingCodes();
  await seedZipToCounty();

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
