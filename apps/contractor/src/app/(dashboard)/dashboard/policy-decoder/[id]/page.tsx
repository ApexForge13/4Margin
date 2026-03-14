import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * Backwards-compatible redirect: /dashboard/policy-decoder/[id] -> /dashboard/policies/[id]
 * Preserves query params (payment, session_id) for Stripe return flow.
 */
export default async function PolicyDecodingDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value) query.set(key, value);
  }

  const qs = query.toString();
  redirect(`/dashboard/policies/${id}${qs ? `?${qs}` : ""}`);
}
