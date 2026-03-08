"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  updateCompanySchema,
  updateProfileSchema,
  validate,
} from "@/lib/validations/schemas";

export async function updateCompany(data: unknown) {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(updateCompanySchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found." };
  if (profile.role === "user") {
    return { error: "Only owners and admins can update company info." };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      license_number: input.licenseNumber || null,
    })
    .eq("id", profile.company_id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateProfile(data: unknown) {
  // ── Validate input ──────────────────────────────────────────
  const parsed = validate(updateProfileSchema, data);
  if (!parsed.success) return { error: parsed.error };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { error } = await supabase
    .from("users")
    .update({ full_name: input.fullName })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Logo actions ──────────────────────────────────────────────

const LOGO_BUCKET = "company-logos";
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/** Ensure the storage bucket exists (idempotent). */
async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === LOGO_BUCKET);
  if (!exists) {
    await admin.storage.createBucket(LOGO_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ACCEPTED_MIME,
    });
  }
}

export async function uploadLogo(
  companyId: string,
  formData: FormData
): Promise<{ error: string | null; logoUrl?: string }> {
  // ── Auth check ─────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found." };
  if (profile.company_id !== companyId) return { error: "Unauthorized." };
  if (profile.role === "user") {
    return { error: "Only owners and admins can upload a logo." };
  }

  // ── Validate file ──────────────────────────────────────────
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided." };

  if (!ACCEPTED_MIME.includes(file.type)) {
    return { error: "Please upload a PNG, JPG, or SVG file." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be under 2 MB." };
  }

  // ── Upload to Supabase Storage ─────────────────────────────
  const admin = createAdminClient();
  await ensureBucket(admin);

  const ext = file.name.split(".").pop() ?? "png";
  const storagePath = `${companyId}/logo.${ext}`;

  // Remove any existing logo files for this company first
  const { data: existing } = await admin.storage
    .from(LOGO_BUCKET)
    .list(companyId);
  if (existing && existing.length > 0) {
    const filesToRemove = existing.map((f) => `${companyId}/${f.name}`);
    await admin.storage.from(LOGO_BUCKET).remove(filesToRemove);
  }

  const { error: uploadError } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) return { error: uploadError.message };

  // ── Build public URL & update company record ───────────────
  const {
    data: { publicUrl },
  } = admin.storage.from(LOGO_BUCKET).getPublicUrl(storagePath);

  const { error: dbError } = await admin
    .from("companies")
    .update({ logo_url: publicUrl })
    .eq("id", companyId);

  if (dbError) return { error: dbError.message };

  return { error: null, logoUrl: publicUrl };
}

export async function removeLogo(
  companyId: string
): Promise<{ error: string | null }> {
  // ── Auth check ─────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found." };
  if (profile.company_id !== companyId) return { error: "Unauthorized." };
  if (profile.role === "user") {
    return { error: "Only owners and admins can remove the logo." };
  }

  // ── Remove from storage ────────────────────────────────────
  const admin = createAdminClient();

  const { data: existing } = await admin.storage
    .from(LOGO_BUCKET)
    .list(companyId);
  if (existing && existing.length > 0) {
    const filesToRemove = existing.map((f) => `${companyId}/${f.name}`);
    await admin.storage.from(LOGO_BUCKET).remove(filesToRemove);
  }

  // ── Clear the URL in the database ──────────────────────────
  const { error: dbError } = await admin
    .from("companies")
    .update({ logo_url: null })
    .eq("id", companyId);

  if (dbError) return { error: dbError.message };

  return { error: null };
}
