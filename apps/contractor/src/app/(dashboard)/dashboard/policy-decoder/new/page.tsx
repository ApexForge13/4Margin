import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createDraftDecoding } from "../actions";

/**
 * /dashboard/policy-decoder/new
 * Creates a draft policy decoding and immediately redirects to the detail page.
 * Used by the sidebar "New Decoder" nav item.
 */
export default async function NewDecoderPage() {
  try {
    const { decodingId, error } = await createDraftDecoding();

    if (!error && decodingId) {
      redirect(`/dashboard/policy-decoder/${decodingId}`);
    }

    // Draft creation failed — fall through to list page redirect below
    console.error("[new-decoder] Draft creation failed:", error);
  } catch (err) {
    // redirect() works by throwing — rethrow so Next.js handles the redirect
    if (isRedirectError(err)) throw err;
    console.error("[new-decoder] Unexpected error:", err);
  }

  // Fallback: send to the list page
  redirect("/dashboard/policy-decoder");
}
