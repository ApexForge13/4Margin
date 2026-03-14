import { redirect } from "next/navigation";

/**
 * Backwards-compatible redirect: /dashboard/policy-decoder -> /dashboard/policies
 */
export default function PolicyDecoderPage() {
  redirect("/dashboard/policies");
}
