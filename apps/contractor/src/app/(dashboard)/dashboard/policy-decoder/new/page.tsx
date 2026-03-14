import { redirect } from "next/navigation";

/**
 * Backwards-compatible redirect: /dashboard/policy-decoder/new -> /dashboard/policies/new
 */
export default function NewDecoderPage() {
  redirect("/dashboard/policies/new");
}
