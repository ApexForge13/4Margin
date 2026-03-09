"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateCounty(
  id: string,
  data: {
    county?: string;
    ahj_url?: string;
    ahj_phone?: string;
    ahj_name?: string;
    permit_fee_range?: string;
    permit_required?: boolean;
    permit_notes?: string;
    design_wind_speed?: number;
    high_wind_zone?: boolean;
    ice_barrier_requirement?: string;
    climate_zone?: string;
    local_amendments?: string[];
  }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("kb_counties")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/knowledge-base");
  return { success: true };
}

export async function updateBuildingCode(
  id: string,
  data: {
    requirement?: string;
    justification_text?: string;
    typical_objection?: string;
    rebuttal?: string;
    carrier_objection_rate?: string;
    xactimate_codes?: string[];
  }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("kb_building_codes")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/knowledge-base");
  return { success: true };
}

export async function updateCodeJurisdiction(
  id: string,
  data: {
    source_ref?: string;
    source_urls?: string[];
    has_amendment?: boolean;
    amendment_note?: string;
    irc_edition?: string;
  }
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("kb_code_jurisdictions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/knowledge-base");
  return { success: true };
}
