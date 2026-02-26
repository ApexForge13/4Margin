"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPolicyDecodingSchema, validate } from "@/lib/validations/schemas";

// ── Types ────────────────────────────────────────────────────

interface CreateDecodingResult {
  decodingId: string | null;
  error: string | null;
}

export interface PolicyDecodingRow {
  id: string;
  status: string;
  policy_pdf_url: string | null;
  original_filename: string | null;
  paid_at: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number;
  policy_analysis: Record<string, unknown> | null;
  document_meta: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

// ── Create Draft Policy Decoding (no file — pay first) ──────

export async function createDraftDecoding(): Promise<CreateDecodingResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { decodingId: null, error: "Session expired." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { decodingId: null, error: "Company not found." };
  }

  const { data: decoding, error: insertError } = await supabase
    .from("policy_decodings")
    .insert({
      company_id: profile.company_id,
      created_by: user.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !decoding) {
    return {
      decodingId: null,
      error: insertError?.message || "Failed to create policy decoding.",
    };
  }

  revalidatePath("/dashboard/policy-decoder");

  return { decodingId: decoding.id, error: null };
}

// ── Create Policy Decoding (with file — used by supplement flow) ──

export async function createPolicyDecoding(
  data: unknown
): Promise<CreateDecodingResult> {
  const parsed = validate(createPolicyDecodingSchema, data);
  if (!parsed.success) {
    return { decodingId: null, error: parsed.error };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { decodingId: null, error: "Session expired." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { decodingId: null, error: "Company not found." };
  }

  const { data: decoding, error: insertError } = await supabase
    .from("policy_decodings")
    .insert({
      company_id: profile.company_id,
      created_by: user.id,
      status: "draft",
      policy_pdf_url: input.storagePath,
      original_filename: input.originalFilename,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (insertError || !decoding) {
    return {
      decodingId: null,
      error: insertError?.message || "Failed to create policy decoding.",
    };
  }

  revalidatePath("/dashboard/policy-decoder");

  return { decodingId: decoding.id, error: null };
}

// ── Upload Policy File (after payment) ──────────────────────

export async function uploadPolicyFile(
  decodingId: string,
  storagePath: string,
  originalFilename: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session expired." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { error: "Company not found." };
  }

  // Verify the decoding belongs to this company and is paid
  const { data: decoding } = await supabase
    .from("policy_decodings")
    .select("id, paid_at, status")
    .eq("id", decodingId)
    .eq("company_id", profile.company_id)
    .single();

  if (!decoding) {
    return { error: "Policy decoding not found." };
  }

  if (!decoding.paid_at) {
    return { error: "Payment required before uploading." };
  }

  if (decoding.status === "complete") {
    return { error: "This policy has already been decoded." };
  }

  const { error: updateError } = await supabase
    .from("policy_decodings")
    .update({
      policy_pdf_url: storagePath,
      original_filename: originalFilename,
      updated_at: new Date().toISOString(),
    })
    .eq("id", decodingId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/dashboard/policy-decoder/${decodingId}`);

  return { error: null };
}

// ── Get Policy Decodings List ───────────────────────────────

export async function getPolicyDecodings(): Promise<{
  decodings: PolicyDecodingRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { decodings: [], error: "Session expired." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { decodings: [], error: "Company not found." };
  }

  const { data, error } = await supabase
    .from("policy_decodings")
    .select(
      "id, status, policy_pdf_url, original_filename, paid_at, stripe_checkout_session_id, amount_cents, policy_analysis, document_meta, notes, created_at"
    )
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { decodings: [], error: error.message };
  }

  return { decodings: (data as PolicyDecodingRow[]) || [], error: null };
}

// ── Get Single Policy Decoding ──────────────────────────────

export async function getPolicyDecoding(id: string): Promise<{
  decoding: PolicyDecodingRow | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { decoding: null, error: "Session expired." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    return { decoding: null, error: "Company not found." };
  }

  const { data, error } = await supabase
    .from("policy_decodings")
    .select(
      "id, status, policy_pdf_url, original_filename, paid_at, stripe_checkout_session_id, amount_cents, policy_analysis, document_meta, notes, created_at"
    )
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (error || !data) {
    return { decoding: null, error: error?.message || "Not found." };
  }

  return { decoding: data as PolicyDecodingRow, error: null };
}

// ── Count paid decodings (for first-free check) ─────────────

export async function getPaidDecodingCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return 0;

  const { count } = await supabase
    .from("policy_decodings")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .not("paid_at", "is", null);

  return count || 0;
}
