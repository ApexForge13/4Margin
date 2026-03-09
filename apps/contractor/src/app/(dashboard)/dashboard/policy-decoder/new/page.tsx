import { redirect } from "next/navigation";
import { createDraftDecoding } from "../actions";

/**
 * /dashboard/policy-decoder/new
 * Creates a draft policy decoding and immediately redirects to the detail page.
 * Used by the sidebar "New Decoder" nav item.
 */
export default async function NewDecoderPage() {
  const { decodingId, error } = await createDraftDecoding();

  if (error || !decodingId) {
    // Fallback: send to the list page if draft creation fails
    redirect("/dashboard/policy-decoder");
  }

  redirect(`/dashboard/policy-decoder/${decodingId}`);
}
