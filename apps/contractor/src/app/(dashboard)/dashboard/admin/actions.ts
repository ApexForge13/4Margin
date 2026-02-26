"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  xactimateCodeSchema,
  carrierSchema,
  adminUpdateUserSchema,
  adminUpdateClaimSchema,
  inviteTeamMemberSchema,
  validate,
} from "@/lib/validations/schemas";
import { sendTeamInviteEmail } from "@/lib/email/send";
import { z } from "zod";

// ── Helpers ─────────────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired." as const, profile: null };

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    return { error: "Permission denied." as const, profile: null };
  }
  return { error: null, profile };
}

const uuidSchema = z.string().uuid("Invalid ID format");

// ── Xactimate Codes ─────────────────────────────────────────

export async function createCode(data: unknown) {
  const parsed = validate(xactimateCodeSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from("xactimate_codes").insert({
    code: input.code,
    category: input.category,
    description: input.description,
    unit: input.unit,
    default_justification: input.defaultJustification || null,
    irc_reference: input.ircReference || null,
    commonly_missed: input.commonlyMissed,
    notes: input.notes || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateCode(codeId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(codeId);
  if (!idResult.success) return { error: "Invalid code ID." };

  const parsed = validate(xactimateCodeSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("xactimate_codes")
    .update({
      code: input.code,
      category: input.category,
      description: input.description,
      unit: input.unit,
      default_justification: input.defaultJustification || null,
      irc_reference: input.ircReference || null,
      commonly_missed: input.commonlyMissed,
      notes: input.notes || null,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function deleteCode(codeId: string) {
  const idResult = uuidSchema.safeParse(codeId);
  if (!idResult.success) return { error: "Invalid code ID." };

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("xactimate_codes")
    .delete()
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

// ── Carriers ────────────────────────────────────────────────

export async function createCarrier(data: unknown) {
  const parsed = validate(carrierSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.from("carriers").insert({
    name: input.name,
    claims_email: input.claimsEmail || null,
    claims_phone: input.claimsPhone || null,
    claims_portal_url: input.claimsPortalUrl || null,
    notes: input.notes || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function updateCarrier(carrierId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(carrierId);
  if (!idResult.success) return { error: "Invalid carrier ID." };

  const parsed = validate(carrierSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("carriers")
    .update({
      name: input.name,
      claims_email: input.claimsEmail || null,
      claims_phone: input.claimsPhone || null,
      claims_portal_url: input.claimsPortalUrl || null,
      notes: input.notes || null,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

export async function deleteCarrier(carrierId: string) {
  const idResult = uuidSchema.safeParse(carrierId);
  if (!idResult.success) return { error: "Invalid carrier ID." };

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Unlink any claims referencing this carrier before deleting
  await admin
    .from("claims")
    .update({ carrier_id: null })
    .eq("carrier_id", idResult.data);

  const { error } = await admin
    .from("carriers")
    .delete()
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

// ── Admin — User Management ────────────────────────────────

export async function adminUpdateUser(userId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(userId);
  if (!idResult.success) return { error: "Invalid user ID." };

  const parsed = validate(adminUpdateUserSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      full_name: input.fullName,
      email: input.email,
      role: input.role,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  return { error: null };
}

// ── Admin — Claim Management (cross-company) ───────────────

export async function adminUpdateClaim(claimId: string, data: unknown) {
  const idResult = uuidSchema.safeParse(claimId);
  if (!idResult.success) return { error: "Invalid claim ID." };

  const parsed = validate(adminUpdateClaimSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Handle carrier upsert
  let carrierId: string | null = null;
  if (input.carrierName?.trim()) {
    const { data: carrier } = await admin
      .from("carriers")
      .upsert({ name: input.carrierName.trim() }, { onConflict: "name" })
      .select("id")
      .single();
    carrierId = carrier?.id || null;
  }

  const { error } = await admin
    .from("claims")
    .update({
      notes: input.notes || null,
      claim_number: input.claimNumber || null,
      policy_number: input.policyNumber || null,
      property_address: input.propertyAddress || null,
      property_city: input.propertyCity || null,
      property_state: input.propertyState || null,
      date_of_loss: input.dateOfLoss || null,
      adjuster_name: input.adjusterName || null,
      adjuster_email: input.adjusterEmail || null,
      adjuster_phone: input.adjusterPhone || null,
      carrier_id: carrierId,
      description: input.description || null,
      adjuster_scope_notes: input.adjusterScopeNotes || null,
      items_believed_missing: input.itemsBelievedMissing || null,
      prior_supplement_history: input.priorSupplementHistory || null,
    })
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

// ── Admin — Delete Claim ─────────────────────────────────────

export async function deleteClaim(claimId: string) {
  const idResult = uuidSchema.safeParse(claimId);
  if (!idResult.success) return { error: "Invalid claim ID." };

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Delete stored files from Supabase storage (photos + estimates)
  // Fetch photo paths first
  const { data: photos } = await admin
    .from("photos")
    .select("storage_path")
    .eq("claim_id", idResult.data);

  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from("photos").remove(paths);
    }
  }

  // Fetch supplement PDFs
  const { data: supplements } = await admin
    .from("supplements")
    .select("generated_pdf_url, weather_pdf_url")
    .eq("claim_id", idResult.data);

  if (supplements && supplements.length > 0) {
    const pdfPaths = supplements
      .flatMap((s) => [s.generated_pdf_url, s.weather_pdf_url])
      .filter(Boolean) as string[];
    if (pdfPaths.length > 0) {
      // Extract storage paths from full URLs if needed
      const storagePaths = pdfPaths.map((url) => {
        const match = url.match(/supplements\/(.+)/);
        return match ? match[1] : url;
      });
      await admin.storage.from("supplements").remove(storagePaths);
    }
  }

  // Delete claim — supplements, supplement_items, photos cascade automatically
  const { error } = await admin
    .from("claims")
    .delete()
    .eq("id", idResult.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/supplements");
  return { error: null };
}

// ── Team Invites ──────────────────────────────────────────────

export async function inviteTeamMember(data: unknown) {
  const parsed = validate(inviteTeamMemberSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const auth = await verifyAdmin();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();

  // Check if the email is already a member of this company
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", input.email)
    .eq("company_id", auth.profile!.company_id)
    .maybeSingle();

  if (existingUser) {
    return { error: "This person is already a member of your team." };
  }

  // Check for existing pending invite
  const { data: existingInvite } = await admin
    .from("invites")
    .select("id")
    .eq("email", input.email)
    .eq("company_id", auth.profile!.company_id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    return { error: "An invite has already been sent to this email." };
  }

  // Create invite record
  const { data: invite, error } = await admin
    .from("invites")
    .insert({
      company_id: auth.profile!.company_id,
      email: input.email,
      role: input.role,
      invited_by: auth.profile!.id,
    })
    .select("token")
    .single();

  if (error || !invite) {
    return { error: error?.message || "Failed to create invite." };
  }

  // Get inviter name + company name for the email
  const { data: inviter } = await admin
    .from("users")
    .select("full_name")
    .eq("id", auth.profile!.id)
    .single();

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", auth.profile!.company_id)
    .single();

  // Send invite email (non-blocking)
  await sendTeamInviteEmail({
    to: input.email,
    inviterName: inviter?.full_name || "Your teammate",
    companyName: company?.name || "your team",
    role: input.role,
    token: invite.token,
  });

  revalidatePath("/dashboard/admin");
  return { error: null };
}
