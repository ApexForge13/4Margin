import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient } from "@/lib/supabase/server";
import { createDraftDecoding } from "../../policy-decoder/actions";

interface Props {
  searchParams: Promise<{ jobId?: string }>;
}

/**
 * /dashboard/policies/new?jobId=xxx
 *
 * Creates a draft policy decoding and redirects to the detail page.
 * When jobId is present, the draft is linked to the job and the detail
 * page pre-fills carrier / claim info from the job's insurance_data.
 */
export default async function NewPolicyDecodePage({ searchParams }: Props) {
  const { jobId } = await searchParams;

  try {
    const { decodingId, error } = await createDraftDecoding(jobId);

    if (!error && decodingId) {
      redirect(`/dashboard/policies/${decodingId}`);
    }

    console.error("[policies/new] Draft creation failed:", error);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[policies/new] Unexpected error:", err);
  }

  // Fallback: send to the list page
  redirect("/dashboard/policies");
}
